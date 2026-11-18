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

test('regressão visual Kaien: missão rank D consta nas Memórias Marcantes e deve aparecer na ficha',()=>{
 const c=create('Campanha de Kaien',{...hero,name:'Kaien',age:4});
 c.day=7;
 c.memories=[
  {id:'m1',status:'saved',day:3,title:'A Nova Diretriz',description:'Kaien concluiu suas tarefas burocráticas e recebeu de Hiruzen a proposta para sua primeira missão de reconhecimento externo.'},
  {id:'m2',status:'saved',day:5,title:'Decisão com consequências',description:'Kaien concluiu a missão de rank D nos armazéns e retornou para reportar-se ao Hokage.'},
  {id:'m3',status:'saved',day:6,title:'Decisão com consequências',description:'Kaien retornou ao escritório do Hokage e prestou contas de sua primeira designação oficial.'},
  {id:'m4',status:'saved',day:6,title:'Decisão com consequências',description:'Kaien relatou com sucesso a conclusão de sua primeira missão e aguarda as próximas diretrizes de Hiruzen.'},
  {id:'m5',status:'saved',day:6,title:'Missão Cumprida',description:'Kaien concluiu com sucesso e rigor profissional sua primeira missão oficial de rank D nos armazéns.'}
 ];
 const oldState=JSON.stringify(c);
 const sheet=view(c).databook;
 assert.equal(sheet.missions.D,1,'as três lembranças relacionadas descrevem a mesma missão D');
 assert.equal(sheet.missions.C,0);
 assert.equal(sheet.missions.unranked,0);
 assert.equal(sheet.missionLog.length,1);
 assert.equal(sheet.missionLog[0].source,'saved-memory');
 assert.equal(JSON.stringify(c),oldState,'ler a ficha não altera o estado da campanha');
 const after=apply(c,act('Kaien acompanha a rotina da vila.'),reply('Kaien conversou com o responsável pela missão.'));
 assert.equal(after.databook.missions.filter(x=>x.rank==='D').length,1,'persiste ao seguir a campanha');
 assert.equal(view(after).databook.missions.D,1);
});

test('sem transcrição da cena original, a lembrança salva continua contabilizada',()=>{
 const c=create('Kaien',{...hero,name:'Kaien'});
 c.messages=[c.messages[0]];
 c.memories=[{id:'d1',status:'saved',day:5,title:'Missão Cumprida',description:'Kaien concluiu com sucesso a missão oficial de rank D nos armazéns.'}];
 assert.equal(view(c).databook.missions.D,1);
});

test('memórias ainda não salvas, descartadas e intenções não podem gerar missões',()=>{
 const c=create('Kaien',{...hero,name:'Kaien'});
 c.memories=[
  {id:'a',status:'dismissed',day:3,title:'Conclusão',description:'Kaien concluiu a missão rank S.'},
  {id:'b',status:'proposed',day:3,title:'Conclusão',description:'Kaien concluiu a missão rank A.'},
  {id:'c',status:'saved',day:3,title:'Nova Diretriz',description:'Kaien recebeu de Hiruzen a proposta para sua primeira missão de reconhecimento externo.'},
  {id:'d',status:'saved',day:3,title:'Sem sucesso',description:'Kaien ainda não concluiu a missão rank D.'},
  {id:'e',status:'saved',day:3,title:'Relato',description:'Hiruzen concluiu a missão rank B e Kaien observou o retorno.'}
 ];
 const totals=view(c).databook.missions;
 assert.deepEqual(totals,{D:0,C:0,B:0,A:0,S:0,unranked:0});
});

test('memória eliminada não continua contabilizada no histórico derivado',()=>{
 const c=create('Kaien',{...hero,name:'Kaien'});
 c.memories=[{id:'d1',status:'saved',day:5,title:'Missão Cumprida',description:'Kaien concluiu a missão rank D nos armazéns.'}];
 const a=apply(c,act('Revisito o relatório.'),reply('Kaien voltou ao gabinete.'));
 assert.equal(view(a).databook.missions.D,1);
 a.memories=[];
 assert.equal(view(a).databook.missions.D,0);
});

test('uma missão Sem rank identificada depois pela memória muda para a classificação comprovada',()=>{
 const c=create('Kaien',{...hero,name:'Kaien'});
 c.messages.push(narrator('Kaien concluiu a missão e voltou aos armazéns.',4));
 c.memories=[{id:'d1',status:'saved',day:4,title:'Missão Cumprida',description:'Kaien concluiu a missão oficial de rank D nos armazéns.'}];
 assert.equal(view(c).databook.missions.D,1);
 assert.equal(view(c).databook.missions.unranked,0);
});

test('missões diferentes da mesma categoria podem contar individualmente quando a distinção é explícita',()=>{
 const c=create('Kaien',{...hero,name:'Kaien'});
 c.memories=[
  {id:'primeira',status:'saved',day:4,title:'Primeira missão',description:'Kaien concluiu sua primeira missão de rank D na área dos armazéns.'},
  {id:'segunda',status:'saved',day:5,title:'Segunda missão',description:'Kaien concluiu sua segunda missão de rank D na academia.'}
 ];
 assert.equal(view(c).databook.missions.D,2);
});
