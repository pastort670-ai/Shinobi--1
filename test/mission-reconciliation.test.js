import {test} from 'node:test';
import assert from 'node:assert/strict';
import {create,apply,input,view,context} from '../src/engine.js';
import {reconciledMissions} from '../src/mission-reconciliation.js';

const hero={name:'Akira Sarutobi',age:6,village:'Konohagakure',clan:'Sarutobi',affiliation:'Civil'};
const reply=(narrative,extra={})=>({narrative,facts:[],relations:[],training:null,energyDelta:0,chakraDelta:0,timeOptions:[],divergences:[],...extra});
const act=text=>input({segments:[{type:'AGIR',text}]});
const campaign=()=>create('Jornada',hero);
const narrator=(text,day=0)=>({role:'ai',text,day});
const player=text=>({role:'user',text,day:0});

test('conta automaticamente uma conclusão com rank, sem depender de missionCompletion do Gemini',()=>{
 const c=campaign();
 const n=apply(c,act('Akira entrega o pergaminho ao responsável.'),reply('Akira concluiu a missão de rank C e recebeu os agradecimentos do contratante.'));
 assert.equal(view(n).databook.missions.C,1);
 assert.equal(n.databook.missions.length,1);
 assert.equal(n.databook.missions[0].source,'accepted-narration');
 assert.equal(view(c).databook.missions.C,0);
});

test('recupera rank da missão atribuída em cena anterior quando final não repete a classificação',()=>{
 const c=campaign();
 c.messages.push(narrator('Hiruzen entrega a Akira uma missão de rank B: escoltar uma família até a fronteira.'));
 c.messages.push(player('Eu acompanho os viajantes.'));
 c.messages.push(narrator('Akira escoltou a família pela estrada e o grupo chegou ao destino.'));
 c.messages.push(player('Entrego o relatório.'));
 c.messages.push(narrator('A missão foi concluída com sucesso. A equipe retorna para casa.'));
 const found=view(c);
 assert.equal(found.databook.missions.B,1);
 assert.equal(c.databook.missions.length,0,'consulta retroativa não modifica ficha em memória');
 assert.equal(found.databook.missionLog[0].rank,'B');
});

test('corrige missão que foi concluída antes da atualização sem inventar novos fatos',()=>{
 const old=campaign();
 delete old.databook;
 old.messages.push(narrator('Esta é uma missão rank D destinada a Akira.'));
 old.messages.push(player('Eu realizo o trabalho.'));
 old.messages.push(narrator('Akira concluiu a missão ao entregar os suprimentos.'));
 const before=JSON.stringify(old);
 assert.equal(view(old).databook.missions.D,1);
 assert.equal(JSON.stringify(old),before);
 const persisted=apply(old,act('Akira retorna ao vilarejo.'),reply('Akira voltou para conversar com os moradores.'));
 assert.equal(persisted.databook.missions[0].rank,'D');
 assert.equal(view(persisted).databook.missions.D,1);
});

test('se a conclusão é comprovada sem rank, mostrar Sem rank, não inventar rank D',()=>{
 const c=campaign();
 const n=apply(c,act('Akira apresenta o relatório.'),reply('Akira concluiu a missão e retornou para sua equipe.'));
 assert.equal(view(n).databook.missions.unranked,1);
 assert.equal(view(n).databook.missions.D,0);
 assert.equal(view(n).databook.missionLog[0].rank,'?');
});

test('ignora conclusão apenas alegada pelo jogador e narrador que não a confirma',()=>{
 const c=campaign();
 const n=apply(c,act('Já concluí uma missão de rank A.'),reply('Hiruzen pede que Akira explique melhor o que aconteceu.'));
 assert.equal(view(n).databook.missions.A,0);
 assert.equal(view(n).databook.missions.unranked,0);
});

test('não atribui missões concluídas apenas por NPCs',()=>{
 const c=campaign();
 c.messages.push(narrator('Kakashi concluiu a missão de rank S enquanto Akira descansava em Konoha.'));
 assert.equal(view(c).databook.missions.S,0);
 c.messages.push(narrator('A missão rank B foi concluída por Hiruzen, sem a participação de Akira.'));
 assert.equal(view(c).databook.missions.B,0);
});

test('notícia distante sobre missão de outra equipe não aumenta a ficha',()=>{
 const c=campaign();
 c.messages.push(narrator('Notícias chegaram ao gabinete: a missão rank S foi concluída no País da Areia por ninjas estrangeiros.'));
 assert.equal(view(c).databook.missions.S,0);
});

test('anúncio passivo conta quando o jogador acabou de apresentar o relatório',()=>{
 const c=campaign();
 c.messages.push(player('Entrego o relatório final da missão.'));
 c.messages.push(narrator('Missão de rank C concluída. O contratante confirma o resultado.'));
 assert.equal(view(c).databook.missions.C,1);
});

test('negações e missão ainda não concluída nunca criam registro',()=>{
 const c=campaign();
 c.messages.push(narrator('Akira não concluiu a missão de rank C.'));
 c.messages.push(narrator('A missão de rank B ainda não foi finalizada.'));
 c.messages.push(narrator('A missão rank D será concluída amanhã.'));
 const totals=view(c).databook.missions;
 assert.equal(totals.C+totals.B+totals.D+totals.unranked,0);
});

test('não duplica missão quando cena final é relembrada no turno seguinte',()=>{
 const c=campaign();
 c.messages.push(narrator('Akira concluiu a missão rank D e recebeu um elogio.'));
 c.messages.push(player('Agradeço.'));
 c.messages.push(narrator('A missão rank D foi concluída, e a equipe recebe seus pagamentos.'));
 assert.equal(view(c).databook.missions.D,1);
});

test('duas missões diferentes registram separadamente quando há nova atribuição',()=>{
 const c=campaign();
 c.messages.push(narrator('Akira recebeu uma missão rank D para recolher as ferramentas.'));
 c.messages.push(narrator('Akira concluiu a missão e entregou o material.'));
 c.messages.push(narrator('Akira aceitou uma nova missão rank C de escolta.'));
 c.messages.push(narrator('Akira concluiu a missão de escolta e voltou para casa.'));
 const totals=view(c).databook.missions;
 assert.equal(totals.D,1);assert.equal(totals.C,1);
});

test('registro enviado pelo Gemini e detecção automática da mesma cena não somam duas vezes',()=>{
 const c=campaign();
 const sentence='Akira Sarutobi concluiu a missão rank C ao retornar à vila.';
 const proposed={rank:'C',summary:'Entrega concluída',evidence:sentence};
 const n=apply(c,act('Apresento o relatório.'),reply(sentence,{missionCompletion:proposed}));
 assert.equal(view(n).databook.missions.C,1);
 assert.equal(n.databook.missions.length,1);
});

test('rewind e regeneração não conservam missão de resposta descartada',()=>{
 const c=campaign();
 const success=reply('Akira concluiu a missão rank D e recebeu o pagamento.');
 const failed=reply('O responsável ainda espera notícias da missão rank D.');
 const a=apply(c,act('Eu entrego o relatório.'),success);
 const b=apply(c,act('Eu entrego o relatório.'),failed);
 assert.equal(view(a).databook.missions.D,1);
 assert.equal(view(b).databook.missions.D,0);
});

test('registro persistido existente não é duplicado ao consultar ficha de campanha',()=>{
 const c=campaign();
 c.messages.push(narrator('Akira concluiu a missão rank C e retornou para casa.'));
 const idx=c.messages.length-1;
 c.databook.missions=[{rank:'C',summary:'Missão anterior',day:0,messageIndex:idx}];
 const totals=view(c).databook.missions;
 assert.equal(totals.C,1);
 assert.equal(reconciledMissions(c,c.databook.missions).length,1);
});

test('somente a narração aceita é usada, e o Gemini continua o narrador',()=>{
 const c=campaign();
 c.messages.push(player('Akira concluiu a missão rank S e ficou famoso.'));
 assert.equal(view(c).databook.missions.S,0);
 assert.ok(context(c,act('Volto para casa.')).databook);
});
