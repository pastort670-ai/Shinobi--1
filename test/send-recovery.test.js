import {test} from 'node:test';
import assert from 'node:assert/strict';
import {recoverGeminiResponse} from '../src/gemini.js';
import {app} from '../src/server.js';

test('um timeout do Gemini refaz a requisição com prazo novo e saída menor', async()=>{
 let attempts=0;
 const payload={generationConfig:{maxOutputTokens:5000},contents:[{role:'user',parts:[{text:'Olá'}]}]};
 const response=await recoverGeminiResponse(async(_url,request)=>{
  attempts++;
  const body=JSON.parse(request.body);
  assert.equal(request.headers['x-goog-api-key'],'teste');
  assert.equal(request.method,'POST');
  if(attempts===1){
   assert.equal(body.generationConfig.maxOutputTokens,5000);
   throw Object.assign(new Error('prazo esgotado'),{name:'TimeoutError'});
  }
  assert.equal(body.generationConfig.maxOutputTokens,2400);
  assert.equal(request.signal.aborted,false);
  return new Response('{}',{status:200});
 },'https://example.invalid',{'x-goog-api-key':'teste'},payload,{primaryTimeoutMs:1000,recoveryTimeoutMs:1000});
 assert.equal(response.status,200);
 assert.equal(attempts,2);
});

test('erro de limite 429 não provoca repetição que aumenta consumo',async()=>{
 let attempts=0;
 const response=await recoverGeminiResponse(async()=>{attempts++;return new Response('{}',{status:429});},'https://example.invalid',{}, {generationConfig:{maxOutputTokens:5000}});
 assert.equal(response.status,429);
 assert.equal(attempts,1);
});

test('turno recusado pelo provedor não consome cooldown de 15 segundos',async()=>{
 let attempts=0;
 const server=app({dbPath:':memory:',rateMs:15000,access:{required:false},configured:true,generate:async()=>{
  if(++attempts===1)throw Object.assign(new Error('Gemini timeout'),{status:502});
  return {narrative:'Hiruzen responde à pergunta.',facts:[],relations:[],training:null,energyDelta:0,chakraDelta:0,timeOptions:[],divergences:[]};
 }});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port;
 try{
  const create=await fetch(url+'/api/campaigns',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'Teste',character:{name:'Akira',age:6}})});
  assert.equal(create.status,201);
  const cookie=create.headers.get('set-cookie').split(';')[0];
  const c=await create.json();
  const send=()=>fetch(url+'/api/campaigns/'+c.id+'/turn',{method:'POST',headers:{'Content-Type':'application/json',cookie},body:JSON.stringify({revision:0,segments:[{type:'FALAR',text:'Olá, Hiruzen.'}]})});
  const first=await send();
  assert.equal(first.status,502);
  const second=await send();
  assert.equal(second.status,200);
  const next=await second.json();
  assert.equal(next.revision,1);
  assert.equal(attempts,2);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
