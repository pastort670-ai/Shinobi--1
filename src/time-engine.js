import {events} from './lore.js';
import {longTermTimeOpportunity} from './long-term-time.js';
export const HOURS_LIMIT=3650*24;
export const CLOCK_DEFAULT=8*60;
export const clockOf=c=>Number.isInteger(c.clockMinutes)&&c.clockMinutes>=0&&c.clockMinutes<1440?c.clockMinutes:CLOCK_DEFAULT;
export const formatClock=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
// Each canon milestone and dated promise is a potential scene break, never a fabricated threat.
export function timePlan(c,i){
 const requested=i.hours||i.days*24||0;
 if(!requested)return {requestedHours:0,allowedHours:0,interruption:null};
 const origin=c.day*24+Math.floor(clockOf(c)/60);
 const end=origin+requested;
 const candidates=[
  ...events.filter(e=>e.day>c.day&&!c.overrides?.[e.id]).map(e=>({hour:e.day*24+8,reason:'Acontecimento da cronologia: '+e.title})),
  ...(c.pendingTasks||[]).filter(t=>t.status==='open'&&Number.isInteger(t.dueDay)&&t.dueDay>c.day)
    .map(t=>({hour:t.dueDay*24+8,reason:'Compromisso pendente: '+t.description}))
 ].filter(e=>e.hour>origin&&e.hour<end).sort((a,b)=>a.hour-b.hour);
 const stop=candidates[0];
 return {requestedHours:requested,allowedHours:stop?stop.hour-origin:requested,interruption:stop?{reason:stop.reason,day:Math.floor(stop.hour/24)}:null};
}
export function timeOpportunity(c){
 return longTermTimeOpportunity(c);
}
export function canUseTime(c){
 return c.timeScene!=='combat'&&!(c.introConfirmed===false&&(c.messages||[]).length<=1)&&
   (c.timeAvailable===true||Boolean(timeOpportunity(c)));
}
// Um compromisso antigo pode continuar válido, mas só domina as sugestões
// enquanto a cena atual está falando daquela atividade.
const topicPattern={
 treino:/\b(?:trein\w*|pratic\w*|mestre|mentor|sensei|instrutor|taijutsu|ninjutsu|genjutsu)\b/u,
 estudo:/\b(?:estud\w*|pesquis\w*|aprend\w*|aula|professor|formac\w*)\b/u,
 viagem:/\b(?:viag\w*|expedic\w*|travess\w*|jornad\w*|partida)\b/u,
 'recuperação':/\b(?:recuper\w*|descans\w*|repous\w*|tratament\w*|reabilit\w*)\b/u,
 projeto:/\b(?:constru\w*|fabric\w*|projet\w*|obra|oficina)\b/u,
 espera:/\b(?:aguard\w*|esper\w*|prazo|periodo combinado)\b/u
};
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function focusedTimeOpportunity(c){
 const offer=timeOpportunity(c);
 if(!offer||!Array.isArray(c.messages))return null;
 let latest=-1;
 for(let i=c.messages.length-1;i>=0;i--)if(c.messages[i]?.role==='ai'){latest=i;break;}
 if(latest<0)return null;
 if(latest===offer.sourceMessageIndex)return offer;
 const gap=latest-offer.sourceMessageIndex;
 if(gap<1||gap>3)return null;
 const scene=normalize(c.messages[latest]?.text);
 return (topicPattern[offer.kind]?.test(scene)||false)?offer:null;
}
function ordinarySuggestions(maxHours){
 const choices=[
  {hours:1,label:'Esperar um pouco',action:'Aguardo por uma hora.'},
  {hours:3,label:'Passar algumas horas',action:'Aguardo durante três horas.'},
  {hours:8,label:'Descansar algumas horas',action:'Descanso por oito horas.'},
  {hours:24,label:'Avançar um dia',action:'Sigo minha rotina durante um dia.'}
 ];
 return choices.filter(x=>x.hours<=maxHours).slice(-3);
}
export function timeSuggestions(c){
 if(!canUseTime(c))return [];
 const focused=focusedTimeOpportunity(c);
 if(focused)return focused.choices;
 // As boas sugestões contextuais do narrador têm prioridade fora de uma
 // cena de longa duração. Não substituí-las por botões genéricos de treino.
 const max=timeMaxHours(c);
 const explicit=(c.timeChoices||[]).filter(x=>
  Number.isInteger(x.hours)&&x.hours>0&&x.hours<=max&&typeof x.label==='string'&&x.label.trim()
 ).slice(0,3).map(x=>({hours:x.hours,label:x.label,action:typeof x.action==='string'&&x.action.trim()?x.action.trim():x.label}));
 if(explicit.length)return explicit;
 const legacy=(c.timeOptions||[]).filter(n=>Number.isInteger(n)&&n>=1&&n*24<=max)
  .slice(0,3).map(n=>({hours:n*24,label:n===1?'Avançar um dia':'Avançar '+n+' dias',action:n===1?'Passo um dia seguindo minha rotina.':'Passo '+n+' dias seguindo minha rotina.'}));
 if(legacy.length)return legacy;
 return ordinarySuggestions(Math.min(max,24));
}
export function timeMaxHours(c){
 if(!canUseTime(c))return 0;
 const offer=timeOpportunity(c);
 if(offer)return Math.min(offer.maximumHours,HOURS_LIMIT);
 const allowed=(c.timeChoices||[]).map(x=>x.hours).filter(n=>Number.isInteger(n)&&n>0&&n<=HOURS_LIMIT);
 return allowed.length?Math.max(...allowed):24;
}
export function actualTime(c,i,r,resolvedDays){
 // Legacy saved turns used days directly. Preserve them exactly on regeneration.
 const plan=timePlan(c,i);
 let consumed=plan.allowedHours;
 let interruption=plan.interruption;
 if(plan.requestedHours){
  const cause=String(r.timeInterruption?.cause||'').trim();
  const at=r.timeInterruption?.afterHours;
  const grounded=[...(c.facts||[]).slice(-35).map(f=>f.text),...(c.pendingTasks||[]).filter(t=>t.status==='open').map(t=>t.description),...(c.consequences||[]).filter(x=>x.status==='ongoing').map(x=>x.description)];
  const matches=grounded.some(f=>f.toLocaleLowerCase('pt-BR').includes(cause.toLocaleLowerCase('pt-BR')));
  if(cause.length>=8&&matches&&Number.isInteger(at)&&at>0&&at<consumed){
   consumed=at;interruption={reason:String(r.timeInterruption.reason||cause).slice(0,240),source:cause};
  }
  const absolute=clockOf(c)+consumed*60;
  return {dayDelta:Math.floor(absolute/1440),clockMinutes:absolute%1440,hours:consumed,interruption};
 }
 // On normal turns the model can advance hours, but a new morning counts as a date transition.
 if(resolvedDays>0){
  const clock=Number.isInteger(r.clockHour)&&r.clockHour>=0&&r.clockHour<=23?r.clockHour*60:CLOCK_DEFAULT;
  return {dayDelta:resolvedDays,clockMinutes:clock,hours:resolvedDays*24,interruption:null};
 }
 const hours=Number.isInteger(r.elapsedHours)&&r.elapsedHours>=0&&r.elapsedHours<=23?r.elapsedHours:0;
 const absolute=clockOf(c)+hours*60;
 return {dayDelta:Math.floor(absolute/1440),clockMinutes:absolute%1440,hours,interruption:null};
}
