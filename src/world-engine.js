// SHINOBI 2.0: deterministic, evidence-based companion to the Gemini narrator.
// Plans never become facts. Commit only after a successful accepted turn.
import {hasExceptionalTalent,trainingGainLimit} from './progression.js';
const lower=v=>String(v||'').toLocaleLowerCase('pt-BR');
const stamp=(day,minutes)=>day*1440+minutes;
const effort=/\b(?:trein\w*|estud\w*|pratic\w*|exercit\w*|aperfei[çc]o\w*)/iu;
const completed=/\b(?:trein\w*|estud\w*|pratic\w*|exercit\w*|aperfei[çc]o\w*|conclui\w*|termin\w*)/iu;
const failed=/\b(?:não conseguiu|não treinou|não estudou|interrompido antes|cancelado|não pôde|não pode)\b/iu;
const rest=/\b(?:dorm\w*|descans\w*|repous\w*)/iu;
const skillHint={taijutsu:/\b(?:taijutsu|corpo a corpo|combate físico|artes marciais)\b/iu,ninjutsu:/\b(?:ninjutsu|chakra|selos de mão|jutsu)\b/iu,genjutsu:/\b(?:genjutsu|ilusões ninja)\b/iu};
export function motorTimePlan(c,i,plan){
 const hours=Math.max(0,Number(plan?.allowedHours)||0);
 const start=c.day*24+Math.floor((c.clockMinutes??480)/60);
 const end=start+hours;
 const due=(c.pendingTasks||[]).filter(t=>t.status==='open'&&Number.isInteger(t.dueDay)&&t.dueDay>c.day&&t.dueDay*24+8<=end).slice(0,12).map(t=>({description:t.description,day:t.dueDay,status:'requer atenção; não concluído'}));
 const existing=(c.consequences||[]).filter(x=>x.status==='ongoing').slice(-10).map(x=>x.description);
 const sections=hours>=48?['início','período transcorrido','chegada']:hours>0?['período transcorrido','chegada']:[];
 return {hours,startDay:c.day,endDay:c.day+Math.floor(((c.clockMinutes??480)+hours*60)/1440),sections,interrupt:plan?.interruption||null,due,ongoingConsequences:existing,instruction:'O tempo só avança após resposta aceita. Registre apenas acontecimentos descritos; compromissos vencidos pedem atenção, não são concluídos automaticamente.'};
}
export function motorProgressPlan(c,i,allowedHours=0){
 const query=(i.segments||[]).map(s=>s.text).join(' ');
 const isTraining=effort.test(query);
 const talent=hasExceptionalTalent(c);
 const skill=Object.entries(skillHint).find(([,pattern])=>pattern.test(query))?.[0]||null;
 const hours=Math.max(0,allowedHours);
 return {trainingRequested:isTraining,skill,allowedHours:hours,exceptionalTalent:talent,
  guidance:isTraining?'Para treinos concluídos e explicitamente narrados, creditar prática de acordo com a duração; prodígios podem progredir acima da média, sem ganhar jutsus ou graduações sem confirmação.':'Sem treino confirmado, não criar progresso.'};
}
export function motorProgressCommit(c,i,r,tick){
 const plan=motorProgressPlan(c,i,tick.hours);
 if(!plan.trainingRequested||r.training||!completed.test(r.narrative)||failed.test(r.narrative))return null;
 // Não atribuir ao protagonista o treino realizado por outro personagem.
 const ownerName=lower(c.character?.name).split(/\s+/)[0];
 const text=lower(r.narrative);
 const playerIsSubject=(ownerName&&text.includes(ownerName))||/\b(?:você|protagonista|seu personagem)\b/iu.test(text);
 if(!playerIsSubject)return null;
 // No category guess: apply only when the user supplied a specific technique/skill.
 if(!plan.skill)return null;
 const gain=Math.min(trainingGainLimit(c,i,tick,r),tick.hours>=48?Math.min(8,1+Math.floor(tick.hours/72)+(plan.exceptionalTalent?2:0)):tick.hours>=1?1:0);
 if(gain<=0)return null;
 return {skill:plan.skill,gain,source:'Treino solicitado pelo jogador e concluído na narração aceita.'};
}
export function motorWorldPlan(c,i,time,agents){
 const progression=motorProgressPlan(c,i,time?.allowedHours||0);
 const npcGoals=(agents?.intentions||[]).filter(a=>a.task||a.goals?.length).slice(0,8).map(a=>({name:a.name,scope:a.scope,priority:a.priority,task:a.task||null,goals:a.goals||[],knownFacts:a.knownFacts||[],status:'planejado, ainda não confirmado'}));
 return {version:2,time:motorTimePlan(c,i,time),progression,npcGoals,
  safeguards:'A intenção de NPC não é fato. Não controle o protagonista. Não resolva compromissos, jutsus, graduações ou consequências sem eventos narrados e aceitos.'};
}
export function motorWorldCommit(previous,next,i,r,tick){
 const history=(previous.worldHistory||[]).slice(-99);
 const progress=motorProgressCommit(previous,i,r,tick);
 if(progress){next.progress[progress.skill]=Math.min(100,next.progress[progress.skill]+progress.gain);next.development??=[];next.development.push({text:'Prática de '+progress.skill+' reconhecida após treinamento concluído.',day:next.day});}
 // Daily/task state only advances on accepted turns; no invisible outcomes are fabricated.
 const due=(next.pendingTasks||[]).filter(t=>t.status==='open'&&Number.isInteger(t.dueDay)&&t.dueDay<=next.day).slice(0,15).map(t=>t.description);
 const event={day:next.day,clockMinutes:next.clockMinutes,hours:tick.hours||0,kind:tick.hours>0?'time':'turn',dueCommitments:due,progress:progress?{skill:progress.skill,gain:progress.gain}:null,confirmedFacts:(r.facts||[]).slice(0,4)};
 history.push(event);next.worldHistory=history;next.worldEngineVersion=2;
 return next;
}
