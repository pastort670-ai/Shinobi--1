import {trainingGainLimit} from './progression.js';

// Treinamento longo oferece progresso real, nunca maestria instantânea.
// 100 é reservado a conquista específica fora de repetição de exercícios.
export const TRAINING_ONLY_MAX=99;
export const MAX_LONG_TRAINING_GAIN=20;
export const LONG_TRAINING_DAYS=30;
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

const specificPractice=/\b(?:trein\w*|pratic\w*|exercit\w*|aperfeico\w*|estud\w*|aprend\w*|instruc\w*|ensina\w*|taijutsu|ninjutsu|genjutsu|treinamento|pratica|estudo)\b/u;
const done=/\b(?:treinou|treina|praticou|pratica|exercitou|aprimorou|aprimora|aperfeicoou|estudou|estuda|aprendeu|concluiu|conclui|completou|completa|realizou|realiza|executou|evoluiu|desenvolveu|passou|dedicou|terminou|finalizou)\b/u;

// Não converte uma intenção do jogador em perícia sem resultado na narração.
export function balancedTrainingProgress(c,i,r,tick){
 if(!r?.training||!['taijutsu','ninjutsu','genjutsu'].includes(r.training.skill))return null;
 const skill=r.training.skill,old=Math.min(100,Math.max(0,Number(c.progress?.[skill])||0));
 const proposal=Math.max(0,Math.min(8,Number(r.training.gain)||0));
 if(proposal===0||old>=TRAINING_ONLY_MAX)return {skill,before:old,after:old,gain:0,limited:true};
 const hours=Math.max(0,Number(tick.hours)||0),days=Math.floor(hours/24);
 const skip=i.hours>0||i.days>0;
 const narrated=norm(r.narrative);
 if(skip&&days>=LONG_TRAINING_DAYS&&(!specificPractice.test(narrated)||!done.test(narrated))){
  return {skill,before:old,after:old,gain:0,limited:true};
 }
 const base=Math.min(proposal,trainingGainLimit(c,i,tick,r));
 // Progresso extra moderado nos períodos longos, com retornos decrescentes.
 // Duração sozinha não concede nada: a qualidade base vem do resultado narrado.
 const extra=days>=LONG_TRAINING_DAYS
  ?Math.min(12,Math.round(Math.log2(1+days/LONG_TRAINING_DAYS)*3*base/8))
  :0;
 const potential=Math.min(MAX_LONG_TRAINING_GAIN,base+extra);
 const multiplier=old>=85?.25:old>=60?.50:old>=35?.75:1;
 const increment=Math.max(1,Math.floor(potential*multiplier));
 const after=Math.min(TRAINING_ONLY_MAX,old+increment);
 return {skill,before:old,after,gain:after-old,limited:after<old+increment,days};
}
export function isLongTrainingSkip(i,r,tick){
 const days=Math.floor(Math.max(0,tick.hours||0)/24);
 if(!(i?.hours>0||i?.days>0)||days<LONG_TRAINING_DAYS)return false;
 const activity=norm((i.segments||[]).map(s=>s.text).join(' '));
 const narrative=norm(r?.narrative||'');
 return specificPractice.test(activity)||specificPractice.test(narrative);
}
export function verifiedLongTrainingJutsus(r,i,tick){
 const list=Array.isArray(r.learnedJutsus)?r.learnedJutsus:[];
 const days=Math.floor(Math.max(0,tick.hours||0)/24);
 if(days<LONG_TRAINING_DAYS||!(i.hours>0||i.days>0))return list;
 const narrative=norm(r.narrative);
 // Aprender técnicas é possível; só não criar repertório ilimitado em um único salto.
 return list.filter(j=>j?.name&&narrative.includes(norm(j.name))).slice(0,2);
}
