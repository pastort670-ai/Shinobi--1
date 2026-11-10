import {test} from 'node:test';
import assert from 'node:assert/strict';
import {create,input,apply,context,view,validate,calendar} from '../src/engine.js';
import {canUseTime,actualTime,timePlan} from '../src/time-engine.js';
import {schema,system} from '../src/gemini.js';
const ch={name:'Akira',age:2,village:'Konohagakure',clan:'Sarutobi'};
const r={narrative:'Hiruzen encerra a conversa; agora é possível esperar.',facts:[],relations:[],training:null,
 energyDelta:0,chakraDelta:0,timeOptions:[],divergences:[],development:[],timeAvailable:true,
 timeChoices:[{hours:3,label:'Esperar três horas'},{hours:24,label:'Descansar um dia'}],
 sceneType:'normal',elapsedDays:0,elapsedHours:0,clockHour:null,timeInterruption:null};
const say=text=>input({segments:[{type:'AGIR',text}]});
test('TEMPO é proibido na introdução e durante combate, mas permitido em janela segura',()=>{
 const c=create('Tempo 2',ch);
 assert.equal(canUseTime(c),false);
 let after=apply(c,say('Conversa encerrada.'),r);
 assert.equal(view(after).timeAvailable,true);
 assert.equal(view(after).timeChoices[0].hours,3);
 after=apply(after,say('O duelo começa.'),{...r,sceneType:'combat'});
 assert.equal(view(after).timeAvailable,false);
 assert.equal(canUseTime(after),false);
});
test('relógio suporta horas sem avançar data e faz virada da meia-noite',()=>{
 const c=create('Relógio',ch);
 c.clockMinutes=21*60;
 const a=apply(c,say('As horas passam.'),{...r,narrative:'Após duas horas, a espera termina.',elapsedHours:2});
 assert.equal(a.day,0);
 assert.equal(view(a).clockTime,'23:00');
 const b=apply(a,say('Esperamos mais duas horas.'),{...r,narrative:'Duas horas depois, a cidade descansa.',elapsedHours:2});
 assert.equal(b.day,1);
 assert.equal(view(b).clockTime,'01:00');
 assert.equal(calendar(b.day).day,11);
});
test('dormir até a manhã seguinte muda dia, hora e preserva regeneração',()=>{
 const c=create('Dormir',ch);
 const turn=say('Akira dorme durante a noite.');
 const morning=apply(c,turn,{...r,narrative:'Na manhã seguinte, Akira despertou.',elapsedDays:1});
 assert.equal(morning.day,1);
 assert.equal(view(morning).clockTime,'08:00');
 assert.equal(morning.lastInput.days,0);
 assert.equal(morning.lastInput.hours,0);
 const alternative=apply(c,turn,{...r,narrative:'Akira ainda dormia no mesmo quarto.',elapsedDays:0});
 assert.equal(alternative.day,0);
 assert.equal(view(alternative).clockTime,'20:00');
});
test('viagem de três horas é interrompida por compromisso datado no futuro',()=>{
 const c=create('Compromisso',ch);
 c.day=9;c.clockMinutes=22*60;
 c.pendingTasks=[{id:'reuniao',status:'open',dueDay:10,description:'Reunião marcada com Hiruzen ao amanhecer.'}];
 c.timeAvailable=true;
 const i=input({hours:24,segments:[{type:'AGIR',text:'Akira espera junto ao portão.'}]});
 const plan=timePlan(c,i);
 assert.equal(plan.allowedHours,10);
 assert.match(plan.interruption.reason,/Reunião marcada/);
 const next=apply(c,i,r);
 assert.equal(next.day,10);
 assert.equal(view(next).clockTime,'08:00');
 assert.equal(next.lastTimeInterruption.day,10);
 assert.equal(context(c,i).timePlan.allowedHours,10);
});
test('interrupção espontânea precisa de causa comprovada na campanha',()=>{
 const c=create('Viagem',ch);c.timeAvailable=true;
 c.facts.push({day:0,text:'Uma tempestade se aproxima do caminho.'});
 const i=input({hours:48,segments:[{type:'AGIR',text:'Viajo até a outra cidade.'}]});
 const accepted=actualTime(c,i,{...r,timeInterruption:{cause:'Uma tempestade se aproxima do caminho.',reason:'A tempestade obriga a procurar abrigo.',afterHours:7}},0);
 assert.equal(accepted.hours,7);
 const rejected=actualTime(c,i,{...r,timeInterruption:{cause:'Um ataque de alienígenas aparece.',reason:'Invasão aleatória.',afterHours:2}},0);
 assert.equal(rejected.hours,48);
});
test('saltos de várias semanas param em evento canônico relevante',()=>{
 const c=create('Cânone',ch);c.day=12*365+170;c.timeAvailable=true;
 const i=input({hours:24*30,segments:[{type:'AGIR',text:'Treino durante um mês.'}]});
 const plan=timePlan(c,i);
 assert.ok(plan.allowedHours<24*30,'Marco interrompe o treino');
 assert.match(plan.interruption.reason,/cronologia/);
 const n=apply(c,i,r);
 assert.ok(n.day>=c.day&&n.day<c.day+30);
 assert.ok(n.timeline.some(e=>e.id==='invasion'),'Evento alcançado entra na cronologia');
});
test('durante TEMPO antigo em dias, preserva duração exata para compatibilidade',()=>{
 const c=create('Antigo',ch);
 const n=apply(c,input({days:365,segments:[{type:'AGIR',text:'Treino contínuo'}]}),r);
 assert.equal(n.day,365);
 assert.equal(n.clockMinutes,20*60);
});
test('contrato do Gemini inclui contexto, autonomia e relógio em horas',()=>{
 assert.equal(schema.properties.elapsedHours.type,'INTEGER');
 assert.equal(schema.properties.timeAvailable.type,'BOOLEAN');
 assert.equal(schema.properties.timeChoices.type,'ARRAY');
 assert.ok(schema.required.includes('timeInterruption'));
 assert.match(system,/SISTEMA TEMPORAL 2\.0/);
 assert.throws(()=>validate({...r,elapsedHours:24}),/inválida/);
});

test('API impede salto de horas sem janela segura e permite ao confirmar uma cena livre',async()=>{
 const {app}=await import('../src/server.js');
 const srv=app({dbPath:':memory:',access:{required:false},rateMs:0,configured:true,generate:async(_c,i)=>({
  ...r,narrative:i.segments.some(s=>/segura/i.test(s.text))?'A conversa terminou e todos descansam.':'A espera foi concluída.',
  timeAvailable:true,sceneType:'normal'
 })});
 await new Promise(resolve=>srv.listen(0,'127.0.0.1',resolve));
 let cookie='';
 async function call(path,data){
  const res=await fetch('http://127.0.0.1:'+srv.address().port+'/api/'+path,{
   method:data?'POST':'GET',headers:{cookie,'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});
  if(res.headers.get('set-cookie'))cookie=res.headers.get('set-cookie').split(';')[0];
  return {status:res.status,data:await res.json()};
 }
 try{
  const created=await call('campaigns',{title:'Controle',character:ch});
  assert.equal(created.status,201);
  const id=created.data.id;
  const denied=await call('campaigns/'+id+'/turn',{revision:0,hours:2,segments:[{type:'AGIR',text:'Espero.'}]});
  assert.equal(denied.status,409);
  const unlocked=await call('campaigns/'+id+'/turn',{revision:0,segments:[{type:'AGIR',text:'A cena está segura.'}]});
  assert.equal(unlocked.status,200);
  assert.equal(unlocked.data.timeAvailable,true);
  const advanced=await call('campaigns/'+id+'/turn',{revision:1,hours:2,segments:[{type:'AGIR',text:'Descanso por duas horas.'}]});
  assert.equal(advanced.status,200);
  assert.equal(advanced.data.clockTime,'22:00');
  const regenerated=await call('campaigns/'+id+'/regenerate',{revision:2});
  assert.equal(regenerated.status,200);
  assert.equal(regenerated.data.clockTime,'22:00','Regeneração usa a mesma duração sem dobrar o relógio');
 }finally{await new Promise(resolve=>srv.close(resolve));}
});
