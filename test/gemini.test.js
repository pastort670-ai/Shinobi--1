import {test} from 'node:test';import assert from 'node:assert/strict';import {provider} from '../src/gemini.js';import {create,input} from '../src/engine.js';
const c=create('X',{name:'Akira',age:6}),i=input({days:1});const out={narrative:'Hiruzen responde.',facts:[],relations:[],training:null,energyDelta:0,chakraDelta:0,timeOptions:[],divergences:[]};
test('adaptador envia chave apenas em cabeçalho e JSON com esquema',async()=>{const gen=provider({external:false,key:'segredo-teste',fetcher:async(url,req)=>{assert.ok(!url.includes('segredo'));assert.equal(req.headers['x-goog-api-key'],'segredo-teste');const b=JSON.parse(req.body);assert.equal(b.generationConfig.responseMimeType,'application/json');assert.ok(b.generationConfig.responseSchema);return new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(out)}]}}]}));}});assert.equal((await gen(c,i)).narrative,out.narrative);});
test('sem chave retorna instrução de configuração',async()=>{await assert.rejects(provider({external:false,key:''})(c,i),/GEMINI_API_KEY/);});
test('erros 429, bloqueio, resposta inválida e rede são tratados',async()=>{for(const fetcher of [async()=>new Response('{}',{status:429}),async()=>new Response(JSON.stringify({candidates:[{finishReason:'SAFETY'}]})),async()=>new Response('{'),async()=>{throw Error('network');}])await assert.rejects(provider({external:false,key:'x',fetcher})(c,i));});

test('normaliza espaços nas pontas e rejeita chave malformada sem enviá-la',async()=>{let calls=0;const gen=provider({external:false,key:'  segredo-teste \n',fetcher:async(url,req)=>{calls++;assert.equal(req.headers['x-goog-api-key'],'segredo-teste');return new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(out)}]}}]}));}});await gen(c,i);assert.equal(calls,1);await assert.rejects(provider({external:false,key:'chave inválida',fetcher:async()=>{throw Error('Não deveria enviar');}})(c,i),/caracteres inválidos/);});

test('narrativa Gemini com sugestões opcionais de tempo inválidas permanece utilizável',async()=>{const gen=provider({external:false,key:'x',fetcher:async()=>new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({...out,timeOptions:[0,0.5,-1,4000]})}]}}]}))});const r=await gen(c,i);assert.equal(r.narrative,out.narrative);assert.deepEqual(r.timeOptions,[]);});

// Falhas transitórias recebem tentativas limitadas; erros de autenticação não.
test('Gemini tenta novamente 503 e 429 antes de entregar resposta',async()=>{
 const {retryGeminiRequest}=await import('../src/gemini.js');
 let calls=0;const delays=[];
 const response=await retryGeminiRequest(async()=>{calls++;return calls<3?new Response('{}',{status:calls===1?503:429}):new Response('{}',{status:200});},'https://example.invalid',{}, {sleep:async ms=>delays.push(ms)});
 assert.equal(response.status,200);assert.equal(calls,3);assert.equal(delays.length,2);
 let deniedCalls=0;
 const denied=await retryGeminiRequest(async()=>{deniedCalls++;return new Response('{}',{status:403});},'https://example.invalid',{}, {sleep:async()=>{}});
 assert.equal(denied.status,403);assert.equal(deniedCalls,1);
});
test('Gemini respeita tentativas máximas e não insiste após timeout',async()=>{
 const {retryGeminiRequest}=await import('../src/gemini.js');
 let calls=0;
 const last=await retryGeminiRequest(async()=>{calls++;return new Response('{}',{status:503});},'https://example.invalid',{}, {sleep:async()=>{}});
 assert.equal(last.status,503);assert.equal(calls,3);
 const controller=new AbortController();controller.abort();
 await assert.rejects(retryGeminiRequest(async()=>{throw Object.assign(new Error('timeout'),{name:'TypeError'});},'https://example.invalid',{signal:controller.signal},{sleep:async()=>{}}),/timeout/);
});
