import {test} from 'node:test';
import assert from 'node:assert/strict';
import {memoryFocus} from '../src/memory-focus.js';
import {create,context,input} from '../src/engine.js';
const ch={name:'Akira',age:2,village:'Konohagakure'};
test('memória considera vínculos, jutsus, compromissos e momentos, sem alterar campanha',()=>{
 const c=create('Memória',ch);
 c.facts=[{text:'Visitei o mercado da vila.',day:0}];
 c.relations.Hiruzen='Hiruzen é meu pai adotivo e mentor.';
 c.pendingTasks=[{description:'Treinar controle de chakra com Hiruzen.',status:'open',day:2}];
 c.memories=[{status:'saved',title:'Promessa de Hiruzen',description:'Prometeu ensinar ninjutsu.',day:1},{status:'dismissed',title:'Não aconteceu',description:'Ignorar.',day:1}];
 c.jutsus=[{name:'Bunshin no Jutsu',description:'Técnica de clonagem',day:3}];
 const before=JSON.stringify(c);
 const focus=memoryFocus(c,'Hiruzen vai ensinar chakra e bunshin?');
 assert.ok(focus.some(m=>m.kind==='pending'&&m.text.includes('Hiruzen')));
 assert.ok(focus.some(m=>m.kind==='relation'&&m.text.includes('pai adotivo')));
 assert.ok(focus.some(m=>m.kind==='jutsu'&&m.text.includes('Bunshin')));
 assert.ok(focus.some(m=>m.kind==='moment'&&m.text.includes('Promessa')));
 assert.ok(!focus.some(m=>m.text.includes('Não aconteceu')));
 assert.equal(JSON.stringify(c),before);
});
test('contexto envia memória contextual preservando interface de fatos',()=>{
 const c=create('Teste',ch);c.relations.Hiruzen='Meu mentor';c.facts=[{text:'Fui aceito como pupilo de Hiruzen.',day:0}];
 const ctx=context(c,input({segments:[{type:'FALAR',text:'Hiruzen, me ensine.'}]}));
 assert.ok(ctx.memoryFocus.some(m=>m.text.includes('Hiruzen')));
 assert.ok(ctx.memory.some(m=>m.text.includes('pupilo')));
 assert.ok(ctx.memoryFocus.length<=22);
});
test('memória limitada e sem repetição de informações idênticas',()=>{
 const c=create('Teste',ch);c.facts=Array.from({length:500},(_,i)=>({text:i%2?'Mesmo fato':'Outro fato '+i,day:i}));
 const result=memoryFocus(c,'Outro fato');
 assert.ok(result.length<=22);
 assert.equal(result.filter(x=>x.text==='Mesmo fato').length,1);
});
