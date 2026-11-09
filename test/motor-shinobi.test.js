import {test} from 'node:test';
import assert from 'node:assert/strict';
import {create,apply,input,context,view} from '../src/engine.js';
import {planNpcTurn,motorLimits} from '../src/motor.js';
import {app} from '../src/server.js';
const character={name:'Akira',age:2,village:'Konohagakure',clan:'Sarutobi',affiliation:'Civil'};
const base={narrative:'Hiruzen ouviu e respondeu com prudência.',facts:[],relations:[],training:null,energyDelta:0,chakraDelta:0,timeOptions:[],divergences:[],development:[]};

test('motor prioriza compromisso pendente sem realizá-lo nem controlar o protagonista',()=>{
 const c=create('Motor',character);
 c.relations.Hiruzen='Mentor que respeita Akira.';
 c.npcKnowledge.Hiruzen=['Akira prometeu voltar ao gabinete.'];
 c.pendingTasks=[{id:'t1',description:'Hiruzen deve encontrar Akira novamente',dueDay:2,status:'open'}];
 c.messages.push({role:'user',text:'FALAR: Olá Hiruzen',day:1});
 const turn=input({segments:[{type:'FALAR',text:'Hiruzen, lembra da reunião?'}],days:2});
 const original=structuredClone(c);
 const plan=planNpcTurn(c,turn);
 assert.equal(plan.mode,'event-driven');
 assert.equal(plan.day,2);
 assert.equal(plan.intentions[0].name,'Hiruzen');
 assert.equal(plan.intentions[0].action,'follow_up');
 assert.match(plan.intentions[0].task,/Hiruzen/);
 assert.match(plan.intentions[0].knownFacts.join(' '),/prometeu/);
 assert.deepEqual(c,original,'Planejamento não modifica o estado persistente');
 const ctx=context(c,turn);
 assert.deepEqual(ctx.motor.intentions,plan.intentions);
});
test('motor conserva memória individual e objetivos apenas após turno confirmado',()=>{
 const c=create('Motor',character);
 const r={...base,npcKnowledge:[{name:'Hiruzen',fact:'Akira entregou a carta a Hiruzen.'}],
  relations:[{name:'Hiruzen',description:'Confia no jovem shinobi.'}],
  pendingTasks:[{id:null,description:'Hiruzen prometeu consultar a carta amanhã',status:'open',dueDay:1}]};
 const turn=input({segments:[{type:'FALAR',text:'Hiruzen, você pode ler a carta?'}]});
 const next=apply(c,turn,r);
 assert.equal(c.npcAgents?.Hiruzen,undefined,'Não modifica o estado original');
 assert.equal(next.npcAgents.Hiruzen.knowledge.length,1);
 assert.equal(next.npcAgents.Hiruzen.goals.length,1);
 assert.equal(next.motorEvents.length,1);
 assert.equal(next.motorVersion,1);
 assert.ok(!('npcAgents' in view(next)),'Estado privado dos NPCs não aparece na API pública');
 assert.ok(!('motorEvents' in view(next)),'Log privado não vaza para o cliente');
 assert.ok(context(next,turn).motor.intentions.some(i=>i.name==='Hiruzen'));
});
test('motor restringe memória, número de agentes e tamanho do log',()=>{
 let c=create('Limites',character);
 for(let n=0;n<35;n++)c=apply(c,input({segments:[{type:'FALAR',text:'Ação breve '+n}]}),{
  ...base,npcKnowledge:[{name:'NPC '+n,fact:'Fato confirmado '+n}]});
 assert.ok(Object.keys(c.npcAgents).length<=motorLimits.MAX_AGENTS);
 for(let n=0;n<125;n++)c=apply(c,input({segments:[{type:'AGIR',text:'Espera.'}]}),base);
 assert.ok(c.motorEvents.length<=motorLimits.MAX_EVENTS);
});
test('motor desativado mantém pipeline legado',()=>{
 const previous=process.env.MOTOR_SHINOBI_ENABLED;
 try{
  process.env.MOTOR_SHINOBI_ENABLED='false';
  const c=create('Compatível',character);
  const turn=input({segments:[{type:'FALAR',text:'Olá, Hiruzen'}]});
  assert.equal(planNpcTurn(c,turn).mode,'disabled');
  const next=apply(c,turn,base);
  assert.equal(next.motorEvents.length,0);
 }finally{
  if(previous===undefined)delete process.env.MOTOR_SHINOBI_ENABLED;
  else process.env.MOTOR_SHINOBI_ENABLED=previous;
 }
});
test('regenerar e desfazer restaura também o estado dos NPCs',async()=>{
 let calls=0;
 const generator=async()=>({...base,
  npcKnowledge:[{name:'Hiruzen',fact:'Conversa '+(++calls)}],
  relations:[{name:'Hiruzen',description:'Acompanhou o encontro.'}]});
 const srv=app({dbPath:':memory:',access:{required:false},rateMs:0,generate:generator,configured:true});
 await new Promise(r=>srv.listen(0,'127.0.0.1',r));let cookie='';
 async function request(path,body){
  const res=await fetch('http://127.0.0.1:'+srv.address().port+'/api/'+path,{
   method:body?'POST':'GET',headers:{cookie,'Content-Type':'application/json'},
   body:body?JSON.stringify(body):undefined});
  if(!cookie&&res.headers.get('set-cookie'))cookie=res.headers.get('set-cookie').split(';')[0];
  return {status:res.status,data:await res.json()};
 }
 try{
  const c=await request('campaigns',{title:'Regen',character});assert.equal(c.status,201);
  const id=c.data.id;
  const first=await request('campaigns/'+id+'/turn',{revision:0,segments:[{type:'FALAR',text:'Olá, Hiruzen'}]});
  assert.equal(first.status,200);
  const regen=await request('campaigns/'+id+'/regenerate',{revision:1});
  assert.equal(regen.status,200);
  const backup=await request('campaigns/'+id+'/export');
  assert.deepEqual(backup.data.campaign.npcAgents.Hiruzen.knowledge,['Conversa 2']);
  assert.equal(backup.data.campaign.motorEvents.length,1,'Turno rejeitado não cria evento');
  const rewind=await request('campaigns/'+id+'/rewind',{revision:2,messageIndex:1});
  assert.equal(rewind.status,200);
  const restored=await request('campaigns/'+id+'/export');
  assert.equal(restored.data.campaign.motorEvents.length,0);
  assert.deepEqual(restored.data.campaign.npcAgents,{});
 }finally{await new Promise(r=>srv.close(r));}
});
