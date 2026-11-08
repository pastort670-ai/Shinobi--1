import {test} from 'node:test';
import assert from 'node:assert/strict';
import {create,apply,input,context,view,calendarEventsBetween} from '../src/engine.js';
import {events} from '../src/lore.js';
import {app} from '../src/server.js';
const character={name:'Akira',age:2,village:'Konohagakure',clan:'Sarutobi',affiliation:'Civil'};
const response={narrative:'Hiruzen observa o portão e explica a situação.',facts:['Akira falou com Hiruzen.'],relations:[],training:null,energyDelta:0,chakraDelta:0,timeOptions:[],divergences:[],development:[]};
test('visão conserva calendário completo e datas de todas as eras',()=>{
 const c=create('Teste',character),v=view(c);
 assert.ok(v.calendarEvents.length>120);
 for(const e of events)assert.ok(v.calendarEvents.some(x=>x.id===e.id&&x.dayIndex===e.day));
 assert.ok(v.calendarEvents.some(e=>e.id==='milestone-kaguya'));
 assert.equal(v.calendarEvents.filter(e=>e.id.startsWith('chunin-exam-')).length,60);
 assert.equal(v.calendarEvents.filter(e=>e.id.startsWith('birthday-')).length,40);
 assert.deepEqual(v.calendarEvents.map(e=>e.dayIndex),v.calendarEvents.map(e=>e.dayIndex).sort((a,b)=>a-b));
 assert.equal(calendarEventsBetween(0,731).filter(e=>e.id.startsWith('chunin-exam-')).length,2);
});
test('cenas longas mantêm o último diálogo e limite de informações por turno sem excluir os saves',()=>{
 const c=create('Longa',character);
 c.messages=Array.from({length:82},(_,index)=>({role:index%2?'ai':'user',day:0,text:'Detalhes da sala, personagens presentes e contexto. '.repeat(80)+index}));
 c.facts=Array.from({length:350},(_,index)=>({text:(index===7?'Arquivo secreto da vila. ':'Lembrança antiga. ')+('x'.repeat(130)),day:index}));
 c.timeline=Array.from({length:120},(_,index)=>({id:'historico-'+index,day:index,title:'Marco '+index}));
 c.npcKnowledge={Hiruzen:['Sabe que Akira esteve presente.'],Sasuke:['Sabe da carta antiga.']};
 const original=structuredClone(c);
 const ctx=context(c,input({segments:[{type:'FALAR',text:'Hiruzen, você lembra do arquivo secreto?'}]}));
 assert.equal(ctx.history.length,35);
 assert.equal(ctx.memory.length,13);
 assert.ok(ctx.memory.some(m=>m.text.includes('Arquivo secreto')));
 assert.equal(ctx.recent.length,8);
 assert.ok(ctx.recent.every(m=>m.text.length<=1800));
 assert.equal(ctx.npcKnowledge.Sasuke,undefined);
 assert.equal(ctx.npcKnowledge.Hiruzen[0],'Sabe que Akira esteve presente.');
 assert.ok(ctx.sceneAnchor.lastAcceptedNarration.length<=3600);
 assert.deepEqual(c,original,'Apenas o contexto para a IA é reduzido; a campanha persiste integralmente');
});
test('regeneração e voltar mensagens continuam funcionando depois da otimização',async()=>{
 const server=app({dbPath:':memory:',generate:async()=>response,configured:true,rateMs:0,access:{required:false}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let cookie='';
 const request=async(path,body)=>{const res=await fetch('http://127.0.0.1:'+server.address().port+'/api/'+path,{method:body?'POST':'GET',headers:{cookie,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});if(!cookie&&res.headers.get('set-cookie'))cookie=res.headers.get('set-cookie').split(';')[0];return {status:res.status,data:await res.json()};};
 try{
  const created=await request('campaigns',{title:'Regressão',character});assert.equal(created.status,201);
  const id=created.data.id;
  let r=await request('campaigns/'+id+'/turn',{revision:0,segments:[{type:'AGIR',text:'Vou até o portão.'}]});
  assert.equal(r.status,200);assert.equal(r.data.undoableMessages.length,1);
  r=await request('campaigns/'+id+'/regenerate',{revision:1});
  assert.equal(r.status,200);assert.equal(r.data.undoableMessages.length,1);
  r=await request('campaigns/'+id+'/rewind',{revision:2,messageIndex:1});
  assert.equal(r.status,200);assert.equal(r.data.messages.length,1);
 }finally{await new Promise(r=>server.close(r));}
});
