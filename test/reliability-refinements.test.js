import {test} from 'node:test';
import assert from 'node:assert/strict';
import {retrieveLore,temporalLore} from '../src/lore.js';
import {memoryFocus} from '../src/memory-focus.js';
import {create,apply,input,context} from '../src/engine.js';
import {planNpcTurn} from '../src/motor.js';
import {motorProgressCommit} from '../src/world-engine.js';

const ch={name:'Kaien Sarutobi',age:8,village:'Konohagakure',clan:'Sarutobi',affiliation:'Academia Ninja',skills:'Prodígio excepcional.'};
const base={narrative:'Kaien concluiu o treino de ninjutsu.',facts:[],relations:[],training:null,energyDelta:0,chakraDelta:0,timeOptions:[],divergences:[]};
test('biblioteca evita trechos aleatórios quando não existe assunto específico',()=>{
 const result=retrieveLore(0,'Contemplo o céu tranquilo em silêncio.');
 assert.equal(result.length,temporalLore(0).slice(0,6).length);
});
test('biblioteca encontra termos com acentos e prioriza conceitos pertinentes',()=>{
 const entries=retrieveLore(0,'A graduação e os jutsus de clonagem ajudam a aprender técnicas?');
 assert.ok(entries.some(x=>x.includes('graduação a genin')));
 assert.ok(entries.some(x=>x.includes('Bunshin no Jutsu')));
 const chakra=retrieveLore(0,'Pratico ninjutsu e os selos de mão.');
 assert.ok(chakra.some(x=>x.includes('Kage Bunshin')||x.includes('Bunshin')));
});
test('biblioteca não antecipa cargos e equipes de fases futuras',()=>{
 const early=retrieveLore(0,'O Iruka é professor da academia do Naruto?');
 assert.ok(early.some(x=>x.includes('NÃO leciona')));
 assert.ok(!early.some(x=>x.includes('Na era clássica, o Time 7')));
 const later=retrieveLore(12*365,'O Iruka é professor de Naruto na academia?');
 assert.ok(later.some(x=>x.includes('Iruka é professor de Naruto')));
});
test('memória prioriza conquistas salvas mesmo entre centenas de fatos comuns',()=>{
 const c=create('História',ch);
 c.facts=Array.from({length:700},(_,i)=>({text:'Fato cotidiano '+i,day:i}));
 c.memories=[{status:'saved',title:'Graduação confirmada',description:'Kaien concluiu o exame e tornou-se genin.',day:6},
 {status:'dismissed',title:'Conquista falsa',description:'Aprendeu uma técnica que não aconteceu.',day:20}];
 c.pendingTasks=[{status:'open',description:'Hiruzen avaliará Kaien.',dueDay:100}];
 c.day=700;
 const got=memoryFocus(c,'Kaien consulta as suas conquistas da academia');
 assert.ok(got.some(x=>x.kind==='moment'&&x.text.includes('Graduação')));
 assert.ok(got.some(x=>x.kind==='pending'&&x.text.includes('Hiruzen')));
 assert.ok(!got.some(x=>x.text.includes('Conquista falsa')));
 assert.ok(got.length<=22);
});
test('objetivos de NPCs concluídos desaparecem da agenda sem apagar conhecimento',()=>{
 const c=create('Agenda',ch);
 c.relations.Hiruzen='Pai adotivo e mentor.';
 c.pendingTasks=[{id:'tarefa',description:'Hiruzen prometeu avaliar o treino.',status:'open',dueDay:2}];
 c.npcAgents.Hiruzen={name:'Hiruzen',goals:[{description:'Hiruzen prometeu avaliar o treino.',dueDay:2}],knowledge:['Kaien é meu aluno'],relationship:'Pai adotivo e mentor.',lastObservedDay:0};
 const n=apply(c,input({segments:[{type:'FALAR',text:'Hiruzen, podemos concluir o treino?'}]}),{...base,pendingTasks:[{id:'tarefa',description:'Hiruzen prometeu avaliar o treino.',status:'done',dueDay:2}]});
 assert.equal(n.pendingTasks[0].status,'done');
 assert.equal(n.npcAgents.Hiruzen.goals.length,0);
 assert.ok(n.npcAgents.Hiruzen.knowledge.includes('Kaien é meu aluno'));
 assert.equal(c.pendingTasks[0].status,'open');
 assert.ok(!planNpcTurn(n,input({days:3})).intentions.some(v=>v.name==='Hiruzen'&&v.action==='follow_up'));
});
test('o motor não atribui treinamento de um professor ao protagonista',()=>{
 const c=create('Treino',ch);
 const i=input({days:5,segments:[{type:'AGIR',text:'Tento treinar ninjutsu com Hiruzen.'}]});
 const tick={hours:120};
 assert.equal(motorProgressCommit(c,i,{...base,narrative:'Hiruzen treinou outros alunos no dojo durante cinco dias.'},tick),null);
 const good=motorProgressCommit(c,i,{...base,narrative:'Kaien concluiu cinco dias de treino de ninjutsu.'},tick);
 assert.ok(good&&good.gain>0);
});
test('contexto traz instruções do motor e biblioteca sem alterar ficha original',()=>{
 const c=create('Revisão',ch);
 const before=JSON.stringify(c);
 const ctx=context(c,input({segments:[{type:'AGIR',text:'Estudo o jutsu de clones na Academia.'}]}));
 assert.equal(ctx.worldEngine.version,2);
 assert.ok(ctx.lore.some(x=>x.includes('Bunshin no Jutsu')));
 assert.equal(JSON.stringify(c),before);
});
