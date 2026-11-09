// Motor Shinobi 1.0: event-driven NPC intentions, no extra model calls.
// Simulation suggestions do not become canon until a completed turn is accepted.
const MAX_AGENTS=24;
const MAX_KNOWLEDGE=12;
const MAX_EVENTS=120;
const text=(v,n=280)=>String(v??'').trim().slice(0,n);
const norm=v=>text(v,100).toLocaleLowerCase('pt-BR');
const distinct=list=>[...new Set(list.filter(Boolean))];
function relationPriority(value=''){
 const v=norm(value);
 if(/confi|amig|famíli|familiar|mentor|afeto|aliad|respeit|prote[gç]/iu.test(v))return 2;
 if(/rival|inimig|ameaç|desconf|hostil|conflit|ódio/iu.test(v))return -1;
 return 0;
}
function relevantNames(c,i){
 const textInput=[...(i.segments||[]).map(s=>s.text),...c.messages.slice(-2).map(m=>m.text?.slice(-850))].join(' ').toLocaleLowerCase('pt-BR');
 const all=distinct([...Object.keys(c.npcKnowledge||{}),...Object.keys(c.relations||{}),...Object.keys(c.npcAgents||{})]);
 return all.filter(name=>name.length>1&&textInput.includes(name.toLocaleLowerCase('pt-BR'))).slice(0,8);
}
function dueTask(c,name,target){
 return (c.pendingTasks||[]).filter(t=>t.status==='open'&&t.description?.toLocaleLowerCase('pt-BR').includes(name.toLocaleLowerCase('pt-BR'))).sort((a,b)=>(a.dueDay??999999)-(b.dueDay??999999)).find(t=>t.dueDay===null||t.dueDay===undefined||t.dueDay<=target+7);
}
export function planNpcTurn(c,i){
 if(process.env.MOTOR_SHINOBI_ENABLED==='false')return {mode:'disabled',day:c.day+(i.days||0),intentions:[]};
 const target=c.day+(i.days||0),named=relevantNames(c,i);
 const intentions=named.map(name=>{
  const agent=c.npcAgents?.[name]||{};
  const knowledge=distinct([...(c.npcKnowledge?.[name]||[]),...(agent.knowledge||[])]).slice(-MAX_KNOWLEDGE);
  const task=dueTask(c,name,target);
  const relation=c.relations?.[name]||agent.relationship||'';
  const goals=(agent.goals||[]).slice(-3);
  const choices=[
   {action:'continue',score:20,reason:'Preservar a rotina e a continuidade sem inventar acontecimentos.'},
   {action:'respond',score:48+(relation?8:0),reason:'Responder de forma coerente ao contato com o protagonista.'},
   ...(task?[{action:'follow_up',score:75+(task.dueDay!==null&&task.dueDay<=target?15:0),reason:'Acompanhar compromisso existente.',task:text(task.description)}]:[]),
   ...(relationPriority(relation)!==0?[{action:'relationship',score:51+Math.abs(relationPriority(relation))*8,reason:'Manter a relação já estabelecida.'}]:[])
  ];
  choices.sort((a,b)=>b.score-a.score||a.action.localeCompare(b.action));
  return {name,action:choices[0].action,reason:choices[0].reason,task:choices[0].task||null,relationship:text(relation,160),goals,knownFacts:knowledge.slice(-5).map(v=>text(v,180)),priority:choices[0].score};
 });
 return {mode:'event-driven',day:target,intentions,
  instructions:'São intenções sugeridas, não acontecimentos realizados. Respeite a vontade do jogador, o cânone, a cena e a informação disponível. Nunca force ações, revelações ou decisões sem causa.'};
}
export function commitNpcTurn(previous,next,i,r){
 if(process.env.MOTOR_SHINOBI_ENABLED==='false')return next;
 const agents={...(previous.npcAgents||{})};
 const active=distinct([...Object.keys(agents),...Object.keys(previous.npcKnowledge||{}),...Object.keys(previous.relations||{})]);
 const touched=distinct([...(r.npcKnowledge||[]).map(k=>k.name),...(r.relations||[]).map(k=>k.name)]);
 for(const name of touched){
  const safeName=text(name,100);if(!safeName)continue;
  const old=agents[safeName]||{};
  const additions=(r.npcKnowledge||[]).filter(k=>k.name===name).map(k=>text(k.fact));
  const knowledge=distinct([...(old.knowledge||[]),...additions]).slice(-MAX_KNOWLEDGE);
  const relationship=(r.relations||[]).find(v=>v.name===name)?.description||old.relationship||'';
  const goals=(next.pendingTasks||[]).filter(t=>t.status==='open'&&t.description?.toLocaleLowerCase('pt-BR').includes(safeName.toLocaleLowerCase('pt-BR'))).slice(-4).map(t=>({description:text(t.description,240),dueDay:t.dueDay??null}));
  agents[safeName]={name:safeName,knowledge,relationship:text(relationship,280),goals,lastObservedDay:next.day};
 }
 // Never update NPCs not mentioned by accepted results or delete the original NPC knowledge ledger.
 const entries=Object.values(agents).sort((a,b)=>(b.lastObservedDay??0)-(a.lastObservedDay??0)).slice(0,MAX_AGENTS);
 next.npcAgents=Object.fromEntries(entries.map(agent=>[agent.name,agent]));
 const oldLog=previous.motorEvents||[];
 const event={day:next.day,kind:i.days?'time':'turn',participants:touched.slice(0,8),facts:(r.facts||[]).slice(0,5).map(v=>text(v,240))};
 next.motorEvents=[...oldLog,event].slice(-MAX_EVENTS);
 next.motorVersion=1;
 return next;
}
export const motorLimits={MAX_AGENTS,MAX_KNOWLEDGE,MAX_EVENTS};
