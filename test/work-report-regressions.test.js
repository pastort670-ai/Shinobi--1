import {test} from 'node:test';
import assert from 'node:assert/strict';
import {app} from '../src/server.js';
import {create,input,apply,view,resolveElapsedDays} from '../src/engine.js';
import {verifiedMilestones} from '../src/milestone-audit.js';
import {narrationQuality} from '../src/narrator-guard.js';
const character={name:'Akira Sarutobi',age:6,village:'Konohagakure',clan:'Sarutobi',affiliation:'Civil'};
const result={narrative:'Hiruzen examina a situação e organiza o treinamento.',facts:[],relations:[],training:null,energyDelta:0,chakraDelta:0,timeOptions:[],divergences:[]};
test('relatório Work: restaurar o JSON com ação de 995 caracteres e oito trechos de 1650 caracteres',async()=>{
 const server=app({dbPath:':memory:',access:{required:false},rateMs:0,generate:async()=>result,configured:true});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 async function session(){
  const r=await fetch(base+'/api/status');
  assert.equal(r.status,200);
  return r.headers.get('set-cookie').split(';')[0];
 }
 async function api(cookie,path,body,method=body?'POST':'GET'){
  const r=await fetch(base+'/api/'+path,{method,headers:{cookie,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  return {status:r.status,data:await r.json()};
 }
 try{
  const owner=await session();
  const created=await api(owner,'campaigns',{title:'Backup de campanha',character});
  assert.equal(created.status,201);
  const id=created.data.id;
  const intro=await api(owner,'campaigns/'+id+'/intro-confirm',{revision:0});
  assert.equal(intro.status,200);
  const first=await api(owner,'campaigns/'+id+'/turn',{revision:1,segments:[{type:'AGIR',text:'a'.repeat(995)}]});
  assert.equal(first.status,200);
  const second=await api(owner,'campaigns/'+id+'/turn',{revision:2,segments:Array.from({length:8},(_,n)=>({type:n%2?'FALAR':'AGIR',text:String(n).repeat(1650)}))});
  assert.equal(second.status,200);
  const original=await api(owner,'campaigns/'+id+'/export');
  assert.equal(original.status,200);
  assert.ok(original.data.campaign.messages.at(-2).text.length>12000);
  assert.ok(original.data.campaign.facts.some(f=>f.text.length>1000));
  const otherOwner=await session();
  const restored=await api(otherOwner,'import',original.data);
  assert.equal(restored.status,201,JSON.stringify(restored.data));
  const again=await api(otherOwner,'campaigns/'+restored.data.id+'/export');
  assert.equal(again.status,200);
  assert.deepEqual(again.data.campaign.messages,original.data.campaign.messages);
  assert.deepEqual(again.data.campaign.facts,original.data.campaign.facts);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
test('relatório Work: menções a amanhecer no futuro ou negado não avançam o calendário',()=>{
 const c=create('Tempo',character),i=input({segments:[{type:'FALAR',text:'Ainda não amanheceu.'}]});
 c.clockMinutes=20*60;
 for(const phrase of ['Ainda não amanheceu.','Partiremos ao amanhecer.','Não passou a noite; eles continuam aguardando.']){
  assert.equal(resolveElapsedDays(i,{...result,narrative:phrase,elapsedDays:0}),0,phrase);
  const next=apply(c,i,{...result,narrative:phrase,elapsedDays:0,elapsedHours:0});
  assert.equal(next.day,0,phrase);
 }
 const next=apply(c,i,{...result,narrative:'Quando amanheceu, Hiruzen trouxe o café.',elapsedDays:0,elapsedHours:0});
 assert.equal(next.day,1);
 assert.equal(next.clockMinutes,8*60);
});
test('relatório Work: ações de NPC não geram técnicas ou patentes para o protagonista',()=>{
 const c=create('História',character);
 c.messages.push({role:'ai',day:2,text:'Hiruzen usou Bunshin no Jutsu diante de Akira.'});
 c.messages.push({role:'ai',day:3,text:'Akira soube que Konohamaru foi promovido a genin.'});
 const v=view(c);
 assert.equal(v.jutsus.length,0);
 assert.equal(v.profile.affiliation,undefined);
 c.memories=[{status:'saved',day:3,title:'Exibição',description:'Hiruzen usou Bunshin no Jutsu diante de Akira.'}];
 const resultAudit=verifiedMilestones(c,[{kind:'jutsu',value:'Bunshin no Jutsu',sourceId:'memory-0',evidence:'Hiruzen usou Bunshin no Jutsu diante de Akira'}]);
 assert.equal(resultAudit.jutsus.length,0);
 const mine=create('Meu progresso',character);
 mine.messages.push({role:'ai',day:4,text:'Após semanas de treino, Akira aprendeu o Bunshin no Jutsu.'});
 mine.messages.push({role:'ai',day:5,text:'Akira foi promovido a genin depois do exame.'});
 assert.equal(view(mine).jutsus[0].name,'Bunshin no Jutsu');
 assert.equal(view(mine).profile.affiliation,'Genin');
});
test('relatório Work: fala curta Sim e segunda pergunta são tratadas sem silenciar NPC',()=>{
 const c=create('Diálogo',character);
 const i=input({segments:[{type:'FALAR',text:'Sim.'}]});
 const echo=narrationQuality(c,i,'Akira respondeu: "Sim."\nHiruzen assentiu e abriu o pergaminho.');
 assert.doesNotMatch(echo.narrative,/Sim/);
 assert.match(echo.narrative,/Hiruzen assentiu/);
 const npc=narrationQuality(c,i,'Hiruzen respondeu: "Sim."');
 assert.match(npc.narrative,/Sim/);
 const multi=input({segments:[{type:'FALAR',text:'Você trouxe o mapa? E onde fica a sala de estudos?'}]});
 const partial=narrationQuality(c,multi,'Akira perguntou: "E onde fica a sala de estudos?"\nHiruzen indicou o corredor.');
 assert.doesNotMatch(partial.narrative,/E onde fica a sala/);
 assert.match(partial.narrative,/Hiruzen indicou/);
});
