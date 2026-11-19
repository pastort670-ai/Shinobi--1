import test from 'node:test';
import assert from 'node:assert/strict';
import {app} from '../src/server.js';
import {create, context, input, apply, view} from '../src/engine.js';
import {schema} from '../src/gemini.js';
import {validTeam} from '../src/team-engine.js';

const ch = {name:'Akira Hayama', age:6, affiliation:'Genin', history:'Filho adotivo de Hiruzen.'};
const act = input({segments:[{type:'AGIR',text:'Consulto a nova escala da vila.'}]});
const peers = ['Hana Mori','Iori Sato'], leader = 'Kiri Tani';
const assignment = 'A vila designou Akira, Hana Mori e Iori Sato para a equipe permanente sob comando de Kiri Tani.';
const change = {status:'active',peers,leader,evidence:assignment};
const result = (text=assignment,update=change) => ({narrative:text,teamUpdate:update});

test('um genin de vila inicia com colegas e jōnin; família, ANBU e Academia têm papéis próprios',()=>{
 const c=create('Folha',ch);
 assert.deepEqual(context(c,act).team,view(c).team);
 assert.equal(c.team.members.length,3);
 assert.equal(c.team.members[0],ch.name);
 assert.notEqual(c.team.leader,'Hiruzen');
 assert.ok(validTeam(c.team,c.character));
 for(const affiliation of ['Civil','Academia Ninja','ANBU','Nukenin','Jōnin']) assert.equal(view(create('X',{...ch,affiliation})).team,null);
 assert.equal(view(create('X',{...ch,village:'Sem vila'})).team,null);
 const namesake=create('Homônimo',{...ch,name:'rén TAKEDA'});
 assert.ok(validTeam(namesake.team,namesake.character));
});

test('legado guarda a história e aguarda designação; proposta, negação e missão temporária não alteram a equipe',()=>{
 const old=create('Antiga',ch);
 delete old.team;
 assert.equal(view(old).team.status,'pending');
 assert.equal(old.team,undefined);
 for(const evidence of [assignment.replace('designou','talvez tenha designado'),assignment.replace('designou','não designou'),assignment.replace('equipe permanente','missão temporária'),assignment.replace('Akira','Takira')]) {
  assert.equal(view(apply(old,act,result(evidence,{...change,evidence}))).team.status,'pending');
 }
 const next=apply(old,act,result());
 assert.deepEqual(next.team.members,[ch.name,...peers]);
 assert.equal(next.team.leader,leader);
 assert.equal(next.team.history.length,1);
 assert.equal(apply(next,act,result()).team.history.length,1);
 const evidence='O conselho dissolveu a equipe permanente de Akira após o retorno à vila.';
 const end=apply(next,act,result(evidence,{status:'disbanded',evidence}));
 assert.equal(end.team.status,'disbanded');
 assert.equal(end.team.history.length,2);
 assert.equal(next.team.status,'active');
});

test('uma sugestão inválida do narrador não interrompe o turno nem muda a formação',()=>{
 const c=create('Folha',ch);
 for(const candidate of [null,{}, {...change,evidence:'Frase que não aconteceu no turno'}, {...change,peers:['Akira Hayama',peers[1]]}, {...change,leader:peers[0]}, {...change,peers:['Nome não citado',peers[1]]}]) {
  const next=apply(c,act,result(assignment,candidate));
  assert.deepEqual(next.team,c.team);
  assert.equal(next.revision,c.revision+1);
 }
 assert.ok(schema.properties.teamUpdate);
 assert.ok(!schema.required.includes('teamUpdate'));
});

test('HTTP: objetivo e equipe sobrevivem a refazer, desfazer e importar, com isolamento e revisão',async t=>{
 const calls=[];
 const srv=app({dbPath:':memory:',access:{required:false},rateMs:0,generate:async(c,i)=>{
  calls.push(context(c,i));
  return result();
 }});
 await new Promise(r=>srv.listen(0,'127.0.0.1',r));
 t.after(()=>new Promise(r=>srv.close(r)));
 const url='http://127.0.0.1:'+srv.address().port+'/api/';
 const client=()=>{let cookie='';return async(path,body,expected=200)=>{
  const r=await fetch(url+path,{method:body?'POST':'GET',headers:{cookie,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  cookie=r.headers.get('set-cookie')?.split(';')[0]||cookie;
  const data=await r.json();
  assert.equal(r.status,expected,JSON.stringify(data.error));
  return data;
 };};
 const a=client(),b=client();
 let c=await a('campaigns',{title:'Teste',character:ch},201);
 const path='campaigns/'+c.id, original=c.team;
 c=await a(path+'/intro-confirm',{revision:c.revision});
 c=await a(path+'/goal',{revision:c.revision,text:'  Liderar uma missão.  '});
 assert.equal(c.personalGoal,'Liderar uma missão.');
 assert.equal(c.messages.length,1);
 assert.equal(c.day,0);
 await a(path+'/goal',{revision:c.revision-1,text:'antigo'},409);
 await b(path+'/goal',{revision:c.revision,text:'outro'},404);
 c=await a(path+'/turn',{...act,revision:c.revision});
 assert.equal(calls.at(-1).playerAspiration.text,c.personalGoal);
 assert.equal(c.team.leader,leader);
 c=await a(path+'/goal',{revision:c.revision,text:'Aprender com a equipe.'});
 c=await a(path+'/regenerate',{revision:c.revision});
 assert.equal(calls.at(-1).playerAspiration.text,'Aprender com a equipe.');
 const backup=await a(path+'/export');
 await b('import',{...backup,campaign:{...backup.campaign,team:{status:'active'}}},400);
 const copy=await b('import',backup,201);
 assert.equal(copy.personalGoal,c.personalGoal);
 assert.deepEqual(copy.team,c.team);
 c=await a(path+'/rewind',{revision:c.revision,messageIndex:1});
 assert.deepEqual(c.team,original);
 assert.equal(c.personalGoal,'Aprender com a equipe.');
 c=await a(path+'/goal',{revision:c.revision,text:''});
 assert.equal(c.personalGoal,'');
 assert.equal(c.messages.length,1);
});
