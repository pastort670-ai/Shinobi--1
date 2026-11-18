import {test} from 'node:test';
import assert from 'node:assert/strict';
import {create,apply,input,view,context} from '../src/engine.js';
import {reconciledMissions,missionStatus} from '../src/mission-reconciliation.js';

const hero={name:'Kaien Sarutobi',age:4,village:'Konohagakure',clan:'Sarutobi',affiliation:'Civil'};
const game=()=>create('Teste de missão',hero);
const user=t=>({role:'user',text:'AGIR: '+t,day:3});
const ai=(text,day=3)=>({role:'ai',text,day});
const act=t=>input({segments:[{type:'AGIR',text:t}]});
const answer=(narrative,extra={})=>({narrative,facts:[],relations:[],training:null,energyDelta:0,chakraDelta:0,timeOptions:[],divergences:[],...extra});

test('missão aceita e relatório final aprovado contam mesmo sem repetir "missão concluída"',()=>{
 const c=game();c.messages.push(ai('Hiruzen entregou a Kaien uma missão de rank D: conferir os armazéns.'));
 c.messages.push(user('Entrego o relatório final ao Hokage.'));
 c.messages.push(ai('Hiruzen aprovou o relatório final de Kaien e confirmou os resultados apresentados.'));
 assert.equal(view(c).databook.missions.D,1);
 assert.equal(missionStatus(c).active,null);
});

test('duas missões rank D consecutivas no mesmo dia contam separadamente',()=>{
 const c=game();
 c.messages.push(ai('Hiruzen entregou a Kaien uma missão rank D de inspecionar os armazéns.',3));
 c.messages.push(user('Concluo a inspeção e entrego os resultados.'));
 c.messages.push(ai('Kaien concluiu a missão rank D nos armazéns.',3));
 c.messages.push(ai('Hiruzen entrega uma nova missão rank D para levar remédios à Academia de Konoha.',3));
 c.messages.push(user('Entrego os remédios e retorno.'));
 c.messages.push(ai('Kaien concluiu a missão rank D ao levar remédios para a Academia.',3));
 assert.equal(view(c).databook.missions.D,2,'uma missão distinta não pode ser abafada por intervalo de quatro mensagens');
 assert.equal(reconciledMissions(c).length,2);
});

test('missões diferentes com mesmo rank e locais diferentes não colapsam por data',()=>{
 const c=game();
 c.messages.push(ai('Kaien concluiu a missão rank C nos armazéns.',3));
 c.messages.push(user('Recebo a missão seguinte.'));
 c.messages.push(ai('Kaien concluiu a missão rank C ao entregar o pergaminho da biblioteca.',3));
 assert.equal(view(c).databook.missions.C,2);
});

test('a mesma conclusão repetida não multiplica o contador',()=>{
 const c=game();
 c.messages.push(ai('Kaien concluiu a missão rank D nos armazéns.',3));
 c.messages.push(user('Falo sobre a missão.'));
 c.messages.push(ai('Kaien relatou que concluiu a missão rank D nos armazéns.',3));
 assert.equal(view(c).databook.missions.D,1);
});

test('prova estruturada é persistida na mensagem aceita e pode ser reconstruída',()=>{
 const c=game(),evidence='O responsável aprovou o relatório final de Kaien e entregou a recompensa.';
 const n=apply(c,act('Entrego meu relatório.'),answer(evidence,{missionCompletion:{rank:'C',summary:'Serviço completado',evidence}}));
 assert.deepEqual(n.messages.at(-1).missionProof,{rank:'C',summary:'Serviço completado',evidence});
 assert.equal(view(n).databook.missions.C,1);
 const saved=structuredClone(n);
 delete saved.databook;
 assert.equal(view(saved).databook.missions.C,1);
});

test('classificação da missão anterior permanece disponível no contexto do narrador',()=>{
 const c=game();
 c.messages.push(ai('Hiruzen designou Kaien para a missão rank B de escoltar viajantes.',3));
 const status=missionStatus(c);
 assert.equal(status.active.rank,'B');
 assert.equal(context(c,act('Entrego o relatório.')).missionStatus.active.rank,'B');
});

test('jogador alegando sucesso sem confirmação do narrador não contabiliza',()=>{
 const c=game();
 const next=apply(c,act('Terminei minha missão rank S e quero meus créditos.'),answer('Hiruzen pede para Kaien comprovar o resultado antes de encerrar a tarefa.'));
 assert.equal(view(next).databook.missions.S,0);
});

test('missão de outro personagem ou apenas proposta não contabilizam',()=>{
 const c=game();
 c.messages.push(ai('Hiruzen concluiu a missão rank A sozinho e Kaien apenas observou.',3));
 c.messages.push(ai('Hiruzen ofereceu a Kaien uma nova missão rank D para amanhã.',3));
 assert.equal(view(c).databook.missions.A,0);
 assert.equal(view(c).databook.missions.D,0);
});

test('repetir a leitura da ficha não duplica, e original não é mutado',()=>{
 const c=game(),evidence='Kaien concluiu sua missão rank D e recebeu a recompensa.';
 const n=apply(c,act('Recebo a recompensa.'),answer(evidence,{missionCompletion:{rank:'D',summary:'Missão concluída',evidence}}));
 const frozen=JSON.stringify(n);
 assert.equal(view(n).databook.missions.D,1);
 assert.equal(view(n).databook.missions.D,1);
 assert.equal(JSON.stringify(n),frozen);
});
