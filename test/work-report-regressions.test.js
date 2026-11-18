import {test} from 'node:test';
import assert from 'node:assert/strict';
import {app} from '../src/server.js';
import {create,input,apply,resolveElapsedDays} from '../src/engine.js';
import {reconcileProgress} from '../src/progression.js';
import {stripPlayerEcho} from '../src/narrator-guard.js';
const ch={name:'Akira',age:6,village:'Konohagakure',clan:'Sarutobi',affiliation:'Civil'};
const response={narrative:'Hiruzen responde com tranquilidade.',facts:[],relations:[],training:null,energyDelta:0,chakraDelta:0,timeOptions:[],divergences:[]};
test('backup restaura turnos aceitos de 995 caracteres e mensagens com oito trechos',async()=>{
 const srv=app({dbPath:':memory:',access:{required:false},rateMs:0,configured:true,generate:async()=>response});
 await new Promise(resolve=>srv.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+srv.address().port+'/api/';
 async function request(path,method='GET',body, cookie=''){
  const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',cookie},body:body?JSON.stringify(body):undefined});
  return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]||cookie};
 }
 try{
  let r=await request('campaigns','POST',{title:'Backup',character:ch});assert.equal(r.status,201);
  const cookie=r.cookie,id=r.data.id;
  const segments=Array.from({length:8},(_,n)=>({type:n%2?'FALAR':'AGIR',text:'A'.repeat(1650)}));
  const turn=await request('campaigns/'+id+'/turn','POST',{revision:0,segments},cookie);
  assert.equal(turn.status,200,JSON.stringify(turn.data));
  const backup=await request('campaigns/'+id+'/export','GET',undefined,cookie);
  assert.equal(backup.status,200);
  assert.ok(backup.data.campaign.messages.at(-2).text.length>12000);
  assert.ok(backup.data.campaign.facts.some(f=>f.text.length>1000));
  const closed=await request('campaigns/'+id+'/close','POST',{revision:1,confirm:'ENCERRAR'},cookie);
  assert.equal(closed.status,200);
  const restored=await request('import','POST',backup.data,cookie);
  assert.equal(restored.status,201,JSON.stringify(restored.data));
  const exported=await request('campaigns/'+restored.data.id+'/export','GET',undefined,cookie);
  assert.equal(exported.data.campaign.messages.at(-2).text,backup.data.campaign.messages.at(-2).text);
  assert.equal(exported.data.campaign.facts.length,backup.data.campaign.facts.length);
 }finally{await new Promise(resolve=>srv.close(resolve));}
});
test('amanhecer mencionado, negado ou futuro não avança o relógio',()=>{
 const i=input({segments:[{type:'AGIR',text:'Espero'}]});
 for(const narrative of ['Ainda não amanheceu.','Partiremos ao amanhecer.']){
  assert.equal(resolveElapsedDays(i,{...response,narrative,elapsedDays:0}),0,narrative);
  const c=create('Tempo',ch);c.clockMinutes=1200;
  const next=apply(c,i,{...response,narrative,elapsedDays:0});
  assert.equal(next.day,c.day);assert.equal(next.clockMinutes,1200);
 }
 assert.equal(resolveElapsedDays(i,{...response,narrative:'Quando amanheceu, Hiruzen trouxe o café.',elapsedDays:0}),1);
});
test('jutsu usado por Hiruzen não é concedido a Akira',()=>{
 const c=create('Progresso',ch);
 c.messages.push({role:'ai',text:'Hiruzen usou Bunshin no Jutsu diante de Akira.',day:0});
 c.messages.push({role:'ai',text:'Hiruzen informou a Akira que Konohamaru foi promovido a genin.',day:0});
 const x=reconcileProgress(c);
 assert.equal(x.jutsus.length,0);assert.notEqual(x.profile.affiliation,'Genin');
 c.messages.push({role:'ai',text:'Akira aprendeu e usou Bunshin no Jutsu.',day:0});
 const y=reconcileProgress(c);assert.ok(y.jutsus.some(j=>j.name==='Bunshin no Jutsu'));
});
test('fala curta e segunda pergunta não devem ser reencenadas',()=>{
 const c=create('Falas',ch);
 let i=input({segments:[{type:'FALAR',text:'Sim.'}]});
 let out=stripPlayerEcho(c,i,'Akira disse: "Sim."\nHiruzen concorda.');
 assert.doesNotMatch(out.narrative,/Sim\./);
 assert.match(out.narrative,/Hiruzen concorda/);
 i=input({segments:[{type:'FALAR',text:'Você está bem? E quando começamos o treino?'}]});
 out=stripPlayerEcho(c,i,'Akira perguntou: "E quando começamos o treino?"\nHiruzen aponta para o campo.');
 assert.doesNotMatch(out.narrative,/E quando começamos/);
 assert.match(out.narrative,/Hiruzen aponta/);
});
