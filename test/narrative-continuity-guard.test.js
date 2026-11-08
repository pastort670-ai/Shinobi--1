import {test} from 'node:test';
import assert from 'node:assert/strict';
import {create,apply,input,context} from '../src/engine.js';
import {system,provider} from '../src/gemini.js';
import {app} from '../src/server.js';
const char={name:'Akira Sarutobi',age:2,village:'Konohagakure',clan:'Sarutobi',affiliation:'Civil'};
const response={narrative:'Hiruzen observa Akira e responde em voz baixa.',facts:[],relations:[],training:null,energyDelta:0,chakraDelta:0,timeOptions:[],divergences:[],development:[]};

test('a regeneração recebe a última cena aceita, não a rejeitada',()=>{
 const start=create('Continuidade',char);
 const settled=apply(start,input({segments:[{type:'FALAR',text:'Onde estamos, Hiruzen?'}]}),{...response,narrative:'Hiruzen explica que estão no escritório do Hokage.'});
 const turn=input({segments:[{type:'AGIR',text:'Akira espera em silêncio.'}]});
 const ctx=context(settled,{...turn,regeneration:{rejected:['Uma explosão destruiu o escritório.'],attempt:1}});
 assert.match(ctx.sceneAnchor.lastAcceptedNarration,/escritório do Hokage/);
 assert.doesNotMatch(JSON.stringify(ctx.sceneAnchor),/explosão destruiu/);
 assert.match(ctx.sceneAnchor.lastPlayerMessage,/Onde estamos/);
 assert.equal(ctx.sceneAnchor.lastAcceptedNarrationDay,0);
});
test('instruções exigem causalidade, continuidade e permitem turnos sem reviravolta',()=>{
 assert.match(system,/Não é obrigatório trazer desenvolvimento novo/);
 assert.match(system,/não significa mudar arbitrariamente o enredo/);
 assert.match(system,/CONTINUIDADE E REGENERAÇÃO/);
});
test('temperatura reduzida na regeneração e sem conteúdo rejeitado no estado da campanha',async()=>{
 const requests=[];
 const fetcher=async(_url,init)=>{
  const request=JSON.parse(init.body);
  requests.push(request);
  return {ok:true,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(response)}]}}]})};
 };
 const generate=provider({key:'a-valid-key',fetcher,external:false});
 const initial=create('Teste',char);
 await generate(initial,input({segments:[{type:'FALAR',text:'Olá'}]}));
 await generate(initial,{segments:[{type:'FALAR',text:'Olá'}],days:0,regeneration:{rejected:['Orochimaru surgiu sem motivo.'],attempt:1}});
 assert.equal(requests[0].generationConfig.temperature,0.6);
 assert.equal(requests[1].generationConfig.temperature,0.45);
 assert.match(JSON.stringify(requests[1].contents),/sceneAnchor/);
});
test('regenerações não transformam rejeições em memória persistente',async()=>{
 let count=0;
 const srv=app({dbPath:':memory:',configured:true,rateMs:0,access:{required:false},generate:async(c,i)=>{
  count++;
  if(i.regeneration) {
   assert.ok(i.regeneration.rejected.length<=2);
   assert.match(i.regeneration.constraint,/mesma cena/);
   assert.ok(c.messages.every(m=>!m.text.includes('Orochimaru surgiu')));
  }
  return {...response,narrative:count===1?'Orochimaru surgiu sem motivo.':'Hiruzen segue a conversa com Akira.'};
 }});
 await new Promise(r=>srv.listen(0,'127.0.0.1',r));
 let cookie='';
 const call=async(path,body)=>{const r=await fetch('http://127.0.0.1:'+srv.address().port+'/api/'+path,{method:body?'POST':'GET',headers:{cookie,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});if(!cookie&&r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,data:await r.json()};};
 try{
  const c=await call('campaigns',{title:'Regen',character:char});assert.equal(c.status,201);
  const id=c.data.id;
  let t=await call('campaigns/'+id+'/turn',{revision:0,segments:[{type:'FALAR',text:'Olá, Hiruzen.'}]});
  assert.equal(t.status,200);
  t=await call('campaigns/'+id+'/regenerate',{revision:1});
  assert.equal(t.status,200);
  assert.match(t.data.messages.at(-1).text,/Hiruzen segue/);
  assert.equal(t.data.messages.length,3);
  assert.ok(!t.data.facts.some(f=>f.text.includes('Orochimaru surgiu')));
 }finally{await new Promise(r=>srv.close(r));}
});