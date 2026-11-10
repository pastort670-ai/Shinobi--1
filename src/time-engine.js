import {events} from './lore.js';
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
export function canUseTime(c){
 return c.timeAvailable===true&&c.timeScene!=='combat';
}
export function timeMaxHours(c){
 if(!canUseTime(c))return 0;
 const allowed=(c.timeChoices||[]).map(x=>x.hours).filter(n=>Number.isInteger(n)&&n>0&&n<=HOURS_LIMIT);
 return allowed.length?Math.max(...allowed):24;
}
export function actualTime(c,i,r,resolvedDays){
 // Legacy saved turns used days directly. Preserve them exactly on regeneration.
 if(i.days>0){const absolute=clockOf(c)+i.days*1440;return {dayDelta:i.days,clockMinutes:absolute%1440,hours:i.days*24,interruption:null};}
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
