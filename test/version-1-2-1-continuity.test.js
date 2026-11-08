import {test} from 'node:test';
import assert from 'node:assert/strict';
import {create,apply,calendar,context,input,view} from '../src/engine.js';
import {app} from '../src/server.js';

const character={name:'Akira',village:'Konohagakure',clan:'Sarutobi',affiliation:'Civil',age:2,history:'Adotado por Hiruzen.'};
const base={narrative:'O mundo reage ao acontecimento.',facts:[],relations:[],training:null,energyDelta:0,chakraDelta:0,timeOptions:[],divergences:[],development:[]};

test('uma narrativa longa preserva anos, marcos, exames e eventos pendentes',()=>{
 const c=create('Longa',character);
 const first=apply(c,input({segments:[{type:'FALAR',text:'Prometo te ajudar amanhã.'}]}),{...base,
  pendingTasks:[{description:'Retornar amanhã.',status:'open',dueDay:1}],npcKnowledge:[{name:'Hiruzen',fact:'Akira prometeu voltar.'}],
  personalityTraits:[{name:'Responsável',explanation:'Manteve a promessa com consistência.'}],
  consequences:[{description:'Hiruzen passou a confiar em Akira.',status:'ongoing'}]
 });
 assert.equal(first.character.personality,'');
 assert.equal(first.personalityTraits.length,1);
 assert.equal(first.consequences.length,1);
 const future=context(first,input({days:3650}));
 assert.ok(future.pending.some(e=>e.id.startsWith('chunin-exam-')));
 assert.equal(future.npcKnowledge.Hiruzen,undefined);const focused=context(first,input({segments:[{type:'FALAR',text:'Hiruzen, lembra da promessa?'}]}));assert.equal(focused.npcKnowledge.Hiruzen[0],'Akira prometeu voltar.');
 const years=apply(first,input({days:3650}),base);
 assert.equal(years.day,3650);assert.equal(view(years).age,12);
 assert.ok(years.timeline.filter(e=>e.id.startsWith('chunin-exam-')).length>=9);
 assert.equal(calendar(years.day).year,11);
 assert.equal(c.personalityTraits.length,0);
});
test('entradas invalidadas preservam história e regras temporais',()=>{
 assert.throws(()=>input({days:-1}),/Avance/);
 assert.throws(()=>input({segments:[{type:'FALAR',text:'x'.repeat(2001)}]}));
 assert.throws(()=>create('T',{...character,age:2,affiliation:'Jōnin'}),/idade/);
 assert.equal(view(create('T',character)).memories.length,0);
});
test('regeneração compara respostas rejeitadas e volta a mudar abordagem sem trocar turno',async()=>{
 let calls=0,seen=[];
 const generator=async(_c,i)=>{seen.push(i);calls++;return {...base,narrative:calls<3?'Hiruzen abre a porta.': 'Hiruzen abre a porta e aponta um mapa.'};};
 const srv=app({dbPath:':memory:',access:{required:false},rateMs:0,generate:generator,configured:true});
 await new Promise(r=>srv.listen(0,'127.0.0.1',r));
 const baseUrl='http://127.0.0.1:'+srv.address().port+'/api/';
 let cookie='';
 async function api(path,body){
  const r=await fetch(baseUrl+path,{method:body?'POST':'GET',headers:{cookie,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  if(!cookie&&r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];
  return {status:r.status,data:await r.json()};
 }
 try{
  let created=await api('campaigns',{title:'Regen',character});assert.equal(created.status,201);const id=created.data.id;
  let r=await api('campaigns/'+id+'/turn',{revision:0,segments:[{type:'FALAR',text:'Abra a porta.'}]});assert.equal(r.status,200);
  r=await api('campaigns/'+id+'/regenerate',{revision:1});assert.equal(r.status,200);
  assert.equal(seen[1].regeneration.attempt,1);
  r=await api('campaigns/'+id+'/regenerate',{revision:2});assert.equal(r.status,200);
  assert.equal(seen[2].regeneration.attempt,2);
  assert.equal(seen[2].regeneration.requireDifferentApproach,true);
  assert.equal(r.data.messages.length,3);
  assert.equal(r.data.revision,3);
  r=await api('campaigns/'+id+'/turn',{revision:3,segments:[{type:'FALAR',text:'Obrigado.'}]});
  assert.equal(r.status,200);assert.equal(r.data.regenerationHistory,undefined);assert.equal(r.data.npcKnowledge,undefined);
 }finally{await new Promise(r=>srv.close(r));}
});
