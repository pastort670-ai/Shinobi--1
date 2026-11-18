import {test} from 'node:test';
import assert from 'node:assert/strict';
import {create,apply,view,input} from '../src/engine.js';
import {reconciledMissions} from '../src/mission-reconciliation.js';
const ch={name:'Kaien',age:4,village:'Konohagakure',clan:'Sarutobi'};
const c=()=>create('Campanha existente',ch);
const ai=(text,day=1)=>({role:'ai',text,day});
const user=(text,day=1)=>({role:'user',text,day});
const move=text=>input({segments:[{type:'AGIR',text}]});
const response=(text,extra={})=>({narrative:text,facts:[],relations:[],training:null,energyDelta:0,chakraDelta:0,timeOptions:[],divergences:[],...extra});

test('missão D é contada após o Hokage aprovar o relatório final, ainda sem frase exata concluída',()=>{
 const old=c();old.messages.push(ai('Hiruzen confiou a Kaien uma missão de rank D: recuperar documentos na biblioteca.',1));
 old.messages.push(user('Entrego ao Hokage os documentos recuperados e o relatório da missão.',2));
 old.messages.push(ai('Hiruzen examina os documentos, aprova o relatório final da missão e confirma o sucesso do trabalho realizado por Kaien.',2));
 assert.equal(view(old).databook.missions.D,1);
});

test('objetivo da missão cumprido também serve como confirmação narrativa com rank histórico',()=>{
 const old=c();
 old.messages.push(ai('Kaien recebeu uma missão rank C de escolta.',1));
 old.messages.push(user('Entrego a família ao destino e apresento o relatório.',2));
 old.messages.push(ai('Kaien levou o grupo até a vila. O objetivo foi alcançado, e o contratante reconhece o sucesso da escolta.',2));
 assert.equal(view(old).databook.missions.C,1);
});

test('missão sem rank, mas explicitamente concluída e reconhecida após relatório, entra como Sem rank',()=>{
 const old=c();
 old.messages.push(user('Apresento o relatório ao Hokage.',2));
 old.messages.push(ai('Hiruzen analisou o relatório. A missão está concluída, e Kaien recebeu autorização para descansar.',2));
 assert.equal(view(old).databook.missions.unranked,1);
});

test('duas missões D distintas no mesmo dia são contadas separadamente quando nova atribuição é explícita',()=>{
 const old=c();
 old.messages.push(ai('Hiruzen encarregou Kaien de uma missão de rank D: entregar pergaminhos à academia.',3));
 old.messages.push(ai('Kaien concluiu a missão de entrega dos pergaminhos e recebeu os agradecimentos da academia.',3));
 old.messages.push(ai('Em seguida, Hiruzen ofereceu outra missão de rank D: acompanhar suprimentos ao hospital.',3));
 old.messages.push(ai('Kaien completou a segunda missão, levando os suprimentos ao hospital e voltando em segurança.',3));
 assert.equal(view(old).databook.missions.D,2);
});

test('várias frases sobre o mesmo relatório não multiplicam o total',()=>{
 const old=c();old.messages.push(ai('Kaien recebeu uma missão de rank D para levar cartas ao Hokage.',1));
 old.messages.push(ai('Kaien concluiu a missão de entregar cartas.',2));
 old.messages.push(user('Volto a falar sobre o que fiz.',2));
 old.messages.push(ai('Hiruzen comenta que a missão rank D já foi concluída e agradece.',2));
 old.messages.push(ai('Kaien continua em Konoha sem receber outra missão.',2));
 assert.equal(view(old).databook.missions.D,1);
});

test('conclusão de outra equipe não é creditada por proximidade no texto',()=>{
 const old=c();old.messages.push(ai('Kaien recebeu a missão rank B de vigiar o portão.',2));
 old.messages.push(ai('Kakashi completou uma missão rank S em outra vila. Kaien ainda está no portão de sua missão rank B.',2));
 assert.equal(view(old).databook.missions.B,0);
 assert.equal(view(old).databook.missions.S,0);
});

test('proposta, tarefa burocrática, relatório sem aprovação e missão ainda em aberto não contabilizam',()=>{
 const old=c();
 old.messages.push(ai('Hiruzen propôs uma missão rank D para Kaien e solicitou que ele preenchesse o relatório.',2));
 old.messages.push(user('Aceito e entrego o relatório preparatório.',2));
 old.messages.push(ai('Kaien concluiu a burocracia, mas a missão ainda não começou.',2));
 assert.deepEqual(view(old).databook.missions,{D:0,C:0,B:0,A:0,S:0,unranked:0});
});

test('memória marcante confirma conclusão mais antiga, sem depender de frase fixa',()=>{
 const old=c();
 old.memories.push({id:'m2',status:'saved',day:7,title:'Missão concluída',description:'O relatório final da missão de rank D de Kaien foi aprovado por Hiruzen; os resultados foram aceitos como trabalho concluído.'});
 assert.equal(view(old).databook.missions.D,1);
});

test('missão antiga recuperada e nova missão do mesmo rank não se fundem',()=>{
 const old=c();
 old.memories.push({id:'old',status:'saved',day:7,title:'Conclusão da primeira missão',description:'Kaien concluiu sua primeira missão de rank D na biblioteca.'});
 old.messages.push(ai('Em outro dia, Kaien recebeu sua segunda missão rank D, agora de escolta ao hospital.',9));
 old.messages.push(ai('Kaien concluiu a segunda missão rank D de escolta ao hospital.',9));
 assert.equal(view(old).databook.missions.D,2);
});

test('um compromisso de missão concluído e aceito pode recuperar progresso sem campo opcional do Gemini',()=>{
 const old=c();old.pendingTasks.push({id:'task-1',day:4,status:'done',description:'Missão de rank C de Kaien: recuperar os documentos e entregar ao Hokage. Objetivo concluído com sucesso.'});
 assert.equal(view(old).databook.missions.C,1);
});

test('tarefas concluídas que não são missões não alteram contador',()=>{
 const old=c();old.pendingTasks.push({id:'task-1',day:4,status:'done',description:'Kaien completou o treinamento físico.'});
 assert.deepEqual(view(old).databook.missions,{D:0,C:0,B:0,A:0,S:0,unranked:0});
});

test('contabilização ao abrir a ficha não modifica a campanha em andamento',()=>{
 const old=c();old.messages.push(ai('Kaien concluiu a missão rank A e voltou para casa.',4));
 const before=JSON.stringify(old);
 assert.equal(view(old).databook.missions.A,1);
 assert.equal(JSON.stringify(old),before);
});

test('regeneração não conserva conclusão de uma resposta rejeitada',()=>{
 const old=c();const good=apply(old,move('Entrego o relatório.'),response('Kaien concluiu a missão rank D ao entregar os documentos.'));
 const retry=apply(old,move('Entrego o relatório.'),response('Hiruzen pede para Kaien rever o documento antes de concluir a missão rank D.'));
 assert.equal(view(good).databook.missions.D,1);
 assert.equal(view(retry).databook.missions.D,0);
});

test('campo estruturado da resposta aceita persiste como evidência rastreável do mesmo turno',()=>{
 const old=c(),text='Kaien concluiu sua missão rank D ao entregar os suprimentos para a Academia.';
 const next=apply(old,move('Entrego os suprimentos.'),response(text,{missionCompletion:{rank:'D',summary:'Entrega à academia',evidence:text}}));
 assert.equal(view(next).databook.missions.D,1);
 assert.equal(next.messages.at(-1).missionCompletion?.rank,'D');
 assert.equal(reconciledMissions(next,next.databook.missions).length,1);
});

test('missão atribuída a um NPC não substitui a missão pendente de Kaien',()=>{
 const old=c();
 old.messages.push(ai('Hiruzen atribuiu a Kaien uma missão de rank D para investigar o armazém.',1));
 old.messages.push(ai('Enquanto isso, Kakashi recebeu uma missão rank S na fronteira.',2));
 old.messages.push(user('Apresento a Hiruzen meu relatório final do armazém.',2));
 old.messages.push(ai('Hiruzen aprovou o relatório final e confirmou o sucesso do trabalho de Kaien.',2));
 const totals=view(old).databook.missions;
 assert.equal(totals.D,1);
 assert.equal(totals.S,0);
});

test('evento estruturado isolado sem evidência na narração não concede missão',()=>{
 const old=c();old.messages.push({
  role:'ai',text:'Kaien está aguardando a avaliação.',
  day:1,missionCompletion:{rank:'S',summary:'Missão rank S encerrada',evidence:'Kaien concluiu a missão rank S.'}
 });
 assert.equal(view(old).databook.missions.S,0);
});

test('duas missões D concluídas em locais diferentes não se fundem na mesma data',()=>{
 const old=c();old.memories=[
  {id:'one',status:'saved',day:7,title:'Missão na biblioteca',description:'Kaien concluiu a missão de rank D na biblioteca, recuperando documentos perdidos.'},
  {id:'two',status:'saved',day:7,title:'Missão no hospital',description:'Kaien concluiu a missão de rank D no hospital, entregando suprimentos médicos.'}
 ];
 assert.equal(view(old).databook.missions.D,2);
});

test('missões estruturadas ficam guardadas com o turno aceito e ajudam no reconhecimento posterior',()=>{
 const old=c(),assignment='Hiruzen atribuiu a Kaien a missão de rank C de proteger os agricultores.';
 const assigned=apply(old,move('Aceito a missão.'),response(assignment,{missionAssignment:{rank:'C',summary:'Proteção agrícola',evidence:assignment}}));
 assert.equal(assigned.messages.at(-1).missionAssignment?.rank,'C');
 const success=apply(assigned,move('Volto e apresento o relatório da missão.'),response('Kaien entregou o relatório e Hiruzen aprovou o trabalho.'));
 assert.equal(view(success).databook.missions.C,1);
 assert.equal(view(assigned).databook.missions.C,0);
});

test('o rank de Kakashi não contamina missão Sem rank concluída por Kaien',()=>{
 const old=c();
 old.messages.push(user('Apresento o relatório de minha missão.',3));
 old.messages.push(ai('Kakashi recebeu uma missão de rank S. Hiruzen aprovou o relatório de Kaien e confirmou que a missão do jovem terminou.',3));
 assert.equal(view(old).databook.missions.S,0);
});
