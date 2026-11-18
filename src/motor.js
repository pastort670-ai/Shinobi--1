import {visibleRelationships,isGroupNpc} from './relationship-engine.js';
// Motor Shinobi 2.0: event-driven NPC intentions and persistent goals, no extra model calls.
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
 const all=distinct([...Object.keys(c.npcKnowledge||{}),...Object.keys(visibleRelationships(c)),...Object.keys(c.npcAgents||{})]);
 return all.filter(name=>name.length>1&&!isGroupNpc(name)&&textInput.includes(name.toLocaleLowerCase('pt-BR'))).slice(0,8);
}
function dueTask(c,name,target){
 return (c.pendingTasks||[]).filter(t=>t.status==='open'&&t.description?.toLocaleLowerCase('pt-BR').includes(name.toLocaleLowerCase('pt-BR'))).sort((a,b)=>(a.dueDay??999999)-(b.dueDay??999999)).find(t=>t.dueDay===null||t.dueDay===undefined||t.dueDay<=target);
}
export function planNpcTurn(c,i){
 if(process.env.MOTOR_SHINOBI_ENABLED==='false')return {mode:'disabled',day:c.day+(i.days||0),intentions:[]};
 const target=c.day+(i.days||0);
 const named=relevantNames(c,i);
 // NPCs conhecidos podem cuidar de compromissos durante períodos longos,
 // mas não precisam aparecer fisicamente nem conhecer segredos do jogador.
 if(target>c.day){
  const candidates=[...new Set([...Object.keys(c.npcAgents||{}),...Object.keys(visibleRelationships(c)),...Object.keys(c.npcKnowledge||{})])].filter(name=>!isGroupNpc(name));
  for(const name of candidates){
   if(named.length>=8)break;
   const hasDatedTask=(c.pendingTasks||[]).some(t=>t.status==='open'&&Number.isInteger(t.dueDay)&&t.dueDay>c.day&&t.dueDay<=target&&t.description?.toLocaleLowerCase('pt-BR').includes(name.toLocaleLowerCase('pt-BR'))) || (c.npcAgents?.[name]?.goals||[]).some(g=>Number.isInteger(g.dueDay)&&g.dueDay>c.day&&g.dueDay<=target);
   if(hasDatedTask&&!named.includes(name))named.push(name);
  }
 }
 const intentions=named.map(name=>{
  const agent=c.npcAgents?.[name]||{};
  const knowledge=distinct([...(c.npcKnowledge?.[name]||[]),...(agent.knowledge||[])]).slice(-MAX_KNOWLEDGE);
  const task=dueTask(c,name,target);
  const addressed=(i.segments||[]).some(s=>s.text?.toLocaleLowerCase('pt-BR').includes(name.toLocaleLowerCase('pt-BR')));
  const relation=c.relations?.[name]||agent.relationship||'';
  const goals=(agent.goals||[]).filter(g=>!g.resolved).slice(-3);
  const plannedGoal=goals.find(g=>Number.isInteger(g.dueDay)&&g.dueDay<=target&&g.dueDay>=c.day)||null;
  const offscreen=!(i.segments||[]).some(s=>s.text?.toLocaleLowerCase('pt-BR').includes(name.toLocaleLowerCase('pt-BR')))&&!c.messages.slice(-2).some(m=>m.text?.toLocaleLowerCase('pt-BR').includes(name.toLocaleLowerCase('pt-BR')));
  const choices=[
   {action:'continue',score:20,reason:'Preservar a rotina e a continuidade sem inventar acontecimentos.'},
   ...(addressed?[{action:'respond',score:62+(relation?8:0),reason:'Responder apenas ao contato presente do protagonista.'}]:[]),
   ...(task?[{action:'follow_up',score:75+(task.dueDay!==null&&task.dueDay<=target?15:0),reason:'Acompanhar compromisso existente.',task:text(task.description)}]:[]),
   ...(plannedGoal&&!task?[{action:'follow_up',score:73,reason:'Retomar meta preexistente na data combinada.',task:text(plannedGoal.description)}]:[]),
   ...(addressed&&relationPriority(relation)!==0?[{action:'relationship',score:51+Math.abs(relationPriority(relation))*8,reason:'Manter a relação já estabelecida.'}]:[])
  ];
  choices.sort((a,b)=>b.score-a.score||a.action.localeCompare(b.action));
  return {name,action:choices[0].action,scope:offscreen?'offscreen':'scene',reason:choices[0].reason,task:choices[0].task||null,relationship:text(relation,160),goals,knownFacts:knowledge.slice(-5).map(v=>text(v,180)),priority:choices[0].score};
 });
 return {mode:'event-driven',version:2,day:target,intentions,
  instructions:'São intenções sugeridas, não acontecimentos realizados. Responder depende de contato real no turno; NPCs apenas lembrados ou presentes na cena não devem repetir respostas e discursos sem nova causa. Metas futuras não devem ser cobradas antes do vencimento. scope=offscreen indica compromisso fora da cena: descreva notícias plausíveis apenas se relevantes; não teletransporte o NPC nem revele segredos. Respeite a vontade do jogador, o cânone e a informação disponível. Nunca force ações, revelações ou decisões sem causa.'};
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
 // Reconciliar agendas de TODOS os NPCs conhecidos com os compromissos realmente abertos:
 // tarefas concluídas/canceladas não podem continuar aparecendo como metas em próximas cenas.
 for(const [name,agent] of Object.entries(agents)){
  const activeTasks=(next.pendingTasks||[]).filter(t=>t.status==='open'&&t.description?.toLocaleLowerCase('pt-BR').includes(name.toLocaleLowerCase('pt-BR')));
  agent.goals=activeTasks.slice(-4).map(t=>({description:text(t.description,240),dueDay:t.dueDay??null}));
 }
 // Nunca apagar conhecimento e relações de NPCs que não participaram do turno.
 const entries=Object.values(agents).sort((a,b)=>(b.lastObservedDay??0)-(a.lastObservedDay??0)).slice(0,MAX_AGENTS);
 next.npcAgents=Object.fromEntries(entries.map(agent=>[agent.name,agent]));
 const oldLog=previous.motorEvents||[];
 const event={day:next.day,kind:i.days?'time':'turn',participants:touched.slice(0,8),facts:(r.facts||[]).slice(0,5).map(v=>text(v,240))};
 next.motorEvents=[...oldLog,event].slice(-MAX_EVENTS);
 next.motorVersion=2;
 return next;
}
export const motorLimits={MAX_AGENTS,MAX_KNOWLEDGE,MAX_EVENTS};
