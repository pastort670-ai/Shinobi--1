import test from 'node:test';
import assert from 'node:assert/strict';
import {create, apply, input, view} from '../src/engine.js';
import {app} from '../src/server.js';
import {encounterPlan} from '../src/encounter.js';

const move=text=>input({segments:[{type:'AGIR',text}]});
const reply={narrative:'O narrador concedeu a vitória por engano.',sceneType:'normal',chakraDelta:20};
function duel(day=972,text='Itachi entra em guarda para o duelo.'){
 const c=create('Ensaio',{name:'Akira',age:6,village:'Konohagakure',affiliation:'Genin'});
 c.day=day;
 c.introConfirmed=true;
 c.messages.push({role:'ai',text,sceneType:'combat',day});
 return c;
}

test('o motor resolve a mesma troca da mesma forma e preserva a leitura do próximo turno',()=>{
 const c=duel();
 const attack=move('Ataco diretamente.');
 assert.deepEqual(encounterPlan(c,attack),encounterPlan(structuredClone(c),attack));
 const first=apply(c,attack,reply);
 assert.match(first.messages.at(-1).text,/Itachi Uchiha ativa o Sharingan/);
 assert.doesNotMatch(first.messages.at(-1).text,/concedeu a vitória/);
 assert.equal(first.day,c.day);
 const second=apply(first,move('Uso uma finta e mudo o ângulo pela lateral.'),reply);
 assert.equal(view(second).combat.opening,true);
 const third=apply(second,move('Ataco pela brecha.'),reply);
 assert.match(third.messages.at(-1).text,/entra limpo|último acerto/);
 assert.ok(third.encounter===null||third.encounter.harm>second.encounter.harm);
 assert.equal(c.encounter,undefined);
});

test('repetir ataques tem custo e uma retirada coberta encerra a troca sem vitória',()=>{
 const c=duel(971,'Um adversário jōnin prepara a guarda para o duelo.');
 const first=apply(c,move('Ataco o adversário jōnin.'),reply);
 const second=apply(first,move('Ataco o adversário jōnin.'),reply);
 assert.ok(second.energy<first.energy);
 assert.match(second.messages.at(-1).text,/ataca|contra-ataca/);
 const leave=apply(second,move('Defendo e recuo.'),reply);
 assert.equal(view(leave).combat,null);
 assert.match(leave.messages.at(-1).text,/sem decidir um vencedor/);
});

test('a reserva limita a sequência, técnicas desconhecidas não são concedidas e a data limita o Sharingan',()=>{
 const c=duel(971);
 c.chakra=11;
 c.jutsus=[{name:'Rasengan',description:'Técnica aprendida.'}];
 const n=apply(c,move('Uso Rasengan e uso Rasengan novamente.'),reply);
 assert.ok(n.chakra<11&&n.chakra>=0);
 assert.match(n.messages.at(-1).text,/não sustentou toda a sequência/);
 assert.doesNotMatch(n.messages.at(-1).text,/Sharingan/);
 const unknown=apply(n,move('Lanço Chidori.'),reply);
 assert.equal(unknown.chakra,n.chakra);
 assert.match(unknown.messages.at(-1).text,/habilidades conhecidas/);
});

test('HTTP: combate funciona sem Gemini, preserva a troca ao recarregar e desfaz o gasto ao voltar',async()=>{
 const server=app({dbPath:':memory:',access:{required:false},rateMs:0,
  generate:async()=>{throw new Error('o motor de combate não precisa do provedor neste turno');}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const root='http://127.0.0.1:'+server.address().port+'/api/';
 let cookie='';
 async function request(path,body){
  const response=await fetch(root+path,{method:body?'POST':'GET',headers:{cookie,'Content-Type':'application/json'},body:body&&JSON.stringify(body)});
  cookie=response.headers.get('set-cookie')?.split(';')[0]||cookie;
  assert.ok(response.ok,await response.clone().text());
  return response.json();
 }
 try{
  const c=duel();
  c.jutsus=[{name:'Rasengan',description:'Técnica aprendida.'}];
  const saved=await request('import',{format:'shinobi-backup-v1',campaign:c});
  const path='campaigns/'+saved.id;
  const played=await request(path+'/turn',{revision:0,...move('Uso Rasengan duas vezes.'),requestId:crypto.randomUUID()});
  assert.ok(played.combat);
  assert.equal((await request(path)).combat.advantage,played.combat.advantage);
  const backup=await request(path+'/export');
  assert.ok(backup.campaign.chakra<100);
  const restored=await request(path+'/rewind',{revision:played.revision,messageIndex:saved.messages.length});
  assert.equal(restored.conditions.chakra,'reserva completa');
  assert.equal(restored.combat,null);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
