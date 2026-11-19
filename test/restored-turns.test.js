import test from 'node:test';
import assert from 'node:assert/strict';
import {app} from '../src/server.js';
import {create,context,input} from '../src/engine.js';
import {provider} from '../src/gemini.js';
import {itachiStage} from '../src/itachi-stage.js';

async function host(t,generate){
 const server=app({dbPath:':memory:',access:{required:false},rateMs:0,generate});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 return ()=>{
  let cookie='';
  return async (path,body,expected=200)=>{
   const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/'+path,{
    method:body?'POST':'GET',headers:{cookie,'Content-Type':'application/json'},body:body&&JSON.stringify(body)
   });
   cookie=response.headers.get('set-cookie')?.split(';')[0]||cookie;
   const data=await response.json();
   assert.equal(response.status,expected,JSON.stringify(data.error));
   return data;
  };
 };
}
const speak=text=>({segments:[{type:'FALAR',text}]});

test('backup conserva estado anterior, permite regenerar e depois excluir múltiplos turnos',async t=>{
 let called=0;
 const client=await host(t,async()=>({narrative:'Hiruzen apresenta a resposta '+(++called)+'.',energyDelta:-4,
  facts:['Registro da conversa '+called],relations:[{name:'Hiruzen',description:'Conversa reservada'}]}));
 const a=client(),b=client();
 let c=await a('campaigns',{title:'Akira',character:{name:'Akira',age:6}},201);
 const path='campaigns/'+c.id;
 c=await a(path+'/turn',{revision:c.revision,...speak('Como estão as missões?')});
 c=await a(path+'/turn',{revision:c.revision,...speak('Por onde começo?')});
 const backup=await a(path+'/export');
 const restored=await b('import',backup,201);
 const copy='campaigns/'+restored.id;
 assert.notEqual(restored.id,c.id);
 assert.equal(restored.canRegenerate,true);
 assert.deepEqual(restored.undoableMessages,[1,3]);
 const regen=await b(copy+'/regenerate',{revision:0});
 const afterRegen=(await b(copy+'/export')).campaign;
 assert.equal(afterRegen.energy,92);
 assert.match(regen.messages.at(-1).text,/resposta 3/);
 assert.ok(!afterRegen.facts.some(x=>x.text==='Registro da conversa 2'));
 const back=await b(copy+'/rewind',{revision:regen.revision,messageIndex:3});
 assert.equal(back.canRegenerate,true);
 assert.equal(back.messages.length,3);
 const start=await b(copy+'/rewind',{revision:back.revision,messageIndex:1});
 assert.equal(start.canRegenerate,false);
 assert.equal(start.messages.length,1);
 assert.equal((await b(copy+'/export')).campaign.energy,100);
 const old=await client()('import',{format:backup.format,campaign:backup.campaign},201);
 assert.equal(old.canRegenerate,false);
 assert.deepEqual(old.messages,c.messages);
});

test('timeout guarda o turno sem mudar o mundo e, após restauração, refazer completa uma vez',async t=>{
 let outage=true;
 const client=await host(t,async()=>{
  if(outage)throw Object.assign(Error('timeout'),{code:'NARRATOR_UNAVAILABLE',status:502});
  return {narrative:'Hiruzen abre a porta e cumprimenta Akira.',facts:['Hiruzen abriu a porta.']};
 });
 const a=client(),b=client();
 const c=await a('campaigns',{title:'Akira',character:{name:'Akira',age:6}},201);
 const path='campaigns/'+c.id;
 const payload={revision:0,...speak('Pai, posso entrar?'),requestId:crypto.randomUUID()};
 const waiting=await a(path+'/turn',payload);
 assert.equal(waiting.messages.at(-1).awaitingNarrator,true);
 assert.equal(waiting.canRegenerate,true);
 assert.deepEqual(waiting.facts,[]);
 assert.equal((await a(path+'/turn',payload)).revision,waiting.revision);
 await a(path+'/turn',{revision:waiting.revision,...speak('Vou sair.')},409);
 const saved=await b('import',await a(path+'/export'),201);
 outage=false;
 const result=await b('campaigns/'+saved.id+'/regenerate',{revision:0});
 assert.equal(result.messages.length,3);
 assert.equal(result.messages.at(-1).awaitingNarrator,undefined);
 assert.equal(result.facts.filter(x=>x.text==='Hiruzen abriu a porta.').length,1);
});

test('Itachi usa idade da data atual e o Gemini refaz texto que o descreve como adulto enquanto criança',async()=>{
 const c=create('Akira',{name:'Akira',age:6});
 const i=input(speak('Posso falar com Itachi?'));
 assert.equal(context(c,i).itachiStage.age,5);
 assert.equal(itachiStage(971).sharingan,false);
 assert.equal(itachiStage(972).sharingan,true);
 let calls=0,firstLength;
 const generate=provider({key:'teste',external:false,fetcher:async(_url,request)=>{
  const body=JSON.parse(request.body);
  const serialized=body.contents[0].parts[0].text;
  assert.equal(JSON.parse(serialized).itachiStage.stage,'criança');
  calls++;
  if(calls===1)firstLength=request.body.length;
  else assert.ok(request.body.length<firstLength);
  const narrative=calls===1?'Itachi Uchiha era um adulto e usou Amaterasu.':'O pequeno Itachi levanta os olhos e inclina a cabeça.';
  return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({narrative})}]}}]});
 }});
 const reply=await generate(c,i);
 assert.equal(calls,2);
 assert.match(reply.narrative,/pequeno Itachi/);
});
