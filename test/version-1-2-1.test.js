import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {app} from '../src/server.js';
import {create,calendar,input,apply,view} from '../src/engine.js';
import {schema,system} from '../src/gemini.js';

const response={
 narrative:'Um mensageiro chega com notícias da reconstrução da vila.',
 facts:['O mensageiro foi recebido.'],relations:[],training:null,
 energyDelta:0,chakraDelta:0,timeOptions:[],divergences:[],development:[],
 sceneType:'combat',moment:{title:'Defesa da vila',description:'Ação decisiva reconhecida por testemunhas.'},
 pendingTasks:[{description:'Voltar ao posto de guarda.',status:'open',dueDay:6}],
 npcKnowledge:[{name:'Hiruzen',fact:'Akira prometeu retornar.'}],openingDay:3
};
const character={name:'Akira Sarutobi',age:2,village:'Konohagakure',clan:'Sarutobi',affiliation:'Civil',history:'Adotado por Hiruzen Sarutobi.'};

test('ficha com opções e incompatibilidades reais',()=>{
 assert.equal(create('Akira',character).character.clan,'Sarutobi');
 assert.throws(()=>create('x',{...character,village:'Otogakure'}),/vila/);
 assert.throws(()=>create('x',{...character,age:2,affiliation:'ANBU'}),/idade/);
 assert.equal(calendar(0).year,1);
 assert.equal(calendar(6).day,16);
 assert.equal(input({segments:[{type:'NARRAR',text:'Observo o Hokage.'}]}).segments[0].type,'AGIR');
});
test('cronologia registra exames anuais e compromissos datados',()=>{
 const c=create('X',character);
 const v=view(c),exams=v.calendarEvents.filter(e=>e.id.startsWith('chunin-exam-'));
 assert.ok(exams.length>=3);
 assert.equal(exams[0].dayIndex+365,exams[1].dayIndex);
 assert.equal(exams[0].year,calendar(exams[0].dayIndex).year);
 const next=apply(c,input({segments:[{type:'FALAR',text:'Prometo voltar.'}]}),response);
 assert.equal(next.pendingTasks[0].status,'open');
 assert.equal(next.npcKnowledge.Hiruzen[0],'Akira prometeu retornar.');
 assert.equal(view(next).calendarEvents.find(e=>e.id==='pending-0').dayIndex,6);
 assert.equal(next.messages.at(-1).sceneType,'combat');
 assert.ok(next.messages.at(-1).memoryCandidate.id);
 assert.deepEqual(c.pendingTasks,[]);
});
test('modelo conhece eventos e privacidade sem controlar protagonista',()=>{
 assert.match(system,/Pensamentos escritos em NARRAR são privados/);
 assert.match(system,/Cada NPC só sabe fatos/);
 assert.match(system,/openingDay/);
 for(const key of ['moment','pendingTasks','npcKnowledge','sceneType','openingDay'])assert.ok(schema.properties[key]);
});
test('interface tem um único editor e controles independentes de tempo',()=>{
 const js=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
 assert.match(js,/contenteditable="true"/);
 assert.match(js,/placeCaret\(next.firstChild,1\)/);
 assert.match(js,/if\(timeActive\)segments.push/);
 assert.match(html,/id="reviewwarning"/);
 assert.match(html,/id="character-warning"/);
 assert.match(html,/id="memorable"/);
});
test('HTTP: introdução personalizada e memória só são confirmadas pelo jogador',async()=>{
 const srv=app({dbPath:':memory:',generate:async()=>response,configured:true,rateMs:0,access:{required:false}});
 await new Promise(resolve=>srv.listen(0,'127.0.0.1',resolve));
 let cookie='';
 const base='http://127.0.0.1:'+srv.address().port+'/api/';
 async function request(path,body){
  const r=await fetch(base+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',cookie},body:body?JSON.stringify(body):undefined});
  if(!cookie&&r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];
  return {status:r.status,data:await r.json()};
 }
 try{
  let r=await request('campaigns',{title:'Teste',character});assert.equal(r.status,201);
  const id=r.data.id;assert.equal(r.data.introConfirmed,false);
  r=await request('campaigns/'+id+'/intro',{revision:0});assert.equal(r.status,200);
  assert.equal(r.data.day,3);assert.equal(r.data.messages[0].day,3);
  r=await request('campaigns/'+id+'/intro-confirm',{revision:1});assert.equal(r.status,200);
  assert.equal(r.data.introConfirmed,true);
  r=await request('campaigns/'+id+'/turn',{revision:2,segments:[{type:'AGIR',text:'Ajo para ajudar.'}]});assert.equal(r.status,200);
  assert.equal(r.data.memories.length,0);
  const candidateId=r.data.messages.at(-1).memoryCandidate.id;
  r=await request('campaigns/'+id+'/memory',{revision:3,candidateId,decision:'saved'});
  assert.equal(r.status,200);assert.equal(r.data.memories.length,1);
  assert.ok(r.data.development.some(x=>x.text.includes('Memória marcante')));
  const rewindIndex=1;
  r=await request('campaigns/'+id+'/rewind',{revision:4,messageIndex:rewindIndex});
  assert.equal(r.status,200);assert.deepEqual(r.data.memories,[]);
  assert.equal(r.data.day,3);
 }finally{await new Promise(resolve=>srv.close(resolve));}
});
