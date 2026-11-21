import {trainingGainLimit,hasExceptionalTalent} from './progression.js';

// Treinamento longo oferece progresso real, nunca maestria instantânea.
// 100 é reservado a conquista específica fora de repetição de exercícios.
export const TRAINING_ONLY_MAX=99;
export const MAX_LONG_TRAINING_GAIN=30;
export const LONG_TRAINING_DAYS=30;
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

const specificPractice=/\b(?:trein\w*|pratic\w*|exercit\w*|aperfeico\w*|estud\w*|aprend\w*|instruc\w*|ensina\w*|taijutsu|ninjutsu|genjutsu|treinamento|pratica|estudo)\b/u;

// Não converte uma intenção do jogador em perícia sem resultado na narração.
export function balancedTrainingProgress(c,i,r,tick){
 if(!r?.training||!['taijutsu','ninjutsu','genjutsu'].includes(r.training.skill))return null;
 const skill=r.training.skill,old=Math.min(100,Math.max(0,Number(c.progress?.[skill])||0));
 const proposal=Math.max(0,Math.min(8,Number(r.training.gain)||0));
 if(proposal===0||old>=TRAINING_ONLY_MAX)return {skill,before:old,after:old,gain:0,limited:true};
 const hours=Math.max(0,Number(tick.hours)||0),days=Math.floor(hours/24);
 const skip=i.hours>0||i.days>0;
 const narrated=norm(r.narrative);
 // O relato precisa dizer que o protagonista PRATICOU, não apenas que se
 // falou de uma "prática" ou que o instrutor demonstrou uma técnica.
 const first=norm(c.character?.name).split(/\s+/)[0].replace(/[^a-z0-9]/g,'');
 const actor=first?first+'|voce|o protagonista|a protagonista':'voce|o protagonista|a protagonista';
 const practiced=new RegExp('\\b(?:'+actor+')\\b\\s+(?:(?:ja|tambem|finalmente|consistentemente|intensamente)\\s+){0,3}(?:treinou|treina|praticou|pratica|exercitou|aprimorou|aprimora|aperfeicoou|estudou|estuda|aprendeu|concluiu|conclui|completou|completa|realizou|realiza|executou|evoluiu|desenvolveu|dedicou|terminou|finalizou)\\b','u').test(narrated);
 const cancelled=/\b(?:treino|treinamento|pratica|atividade)\s+(?:ainda\s+)?nao\s+(?:comecou|iniciou|ocorreu|foi realizada)\b|\b(?:nao treinou|nao praticou|apenas observou|somente observou)\b/u.test(narrated);
 if(skip&&days>=LONG_TRAINING_DAYS&&(!specificPractice.test(narrated)||!practiced||cancelled)){
  return {skill,before:old,after:old,gain:0,limited:true};
 }
 const base=Math.min(proposal,trainingGainLimit(c,i,tick,r));
 // Progresso extra moderado nos períodos longos, com retornos decrescentes.
 // Duração sozinha não concede nada: a qualidade base vem do resultado narrado.
 const extra=days>=LONG_TRAINING_DAYS
  ?Math.min(19,Math.round(Math.log2(1+days/LONG_TRAINING_DAYS)*4*base/8))
  :0;
 const talentBonus=days>=90&&hasExceptionalTalent(c)?Math.min(3,Math.floor(days/90)):0;
 const potential=Math.min(MAX_LONG_TRAINING_GAIN,base+extra+talentBonus);
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
 const clauses=norm(r.narrative).split(/[.!?;\n]+/u).filter(Boolean);
 const attained=/\b(?:aprendeu|aprendida|aprendido|dominou|executou|realizou|conseguiu executar|passou a usar|utilizou com sucesso|usou com sucesso)\b/u;
 const failed=/\b(?:nao|nunca|jamais|sem conseguir|ainda nao|apenas tentou|fracassou|falhou)\b/u;
 // Só técnicas explicitamente aprendidas na cena, sem aceitar meras tentativas.
 return list.filter(j=>j?.name&&clauses.some(clause=>clause.includes(norm(j.name))&&attained.test(clause)&&!failed.test(clause))).slice(0,2);
}

// O registro acompanha o turno aceito e usa apenas o desfecho verificado.
export function trainingSummary(i,tick,progress,learned,focused=false){
 if(!(i.hours||i.days)||!tick.hours)return '';
 const action=(i.segments||[]).filter(segment=>segment.type==='AGIR').map(segment=>segment.text).join(' ');
 const text=norm(action);
 const practice=/\b(?:trein\w*|pratic\w*|exercit\w*|aperfeico\w*|(?:aprend\w*|domin\w*|desenvolv\w*)\s+(?:(?:o|a|uma?|meu|minha)\s+)?(?:jutsu|tecnica))\b/u;
 if(!practice.test(text)&&!(focused&&!action))return '';
 const days=Math.floor(tick.hours/24),hours=tick.hours%24;
 const duration=[days&&days+(days===1?' dia':' dias'),hours&&hours+(hours===1?' hora':' horas')].filter(Boolean).join(' e ');
 const results=[];
 if(learned.length)results.push('Técnica registrada na ficha: '+learned.map(j=>j.name).join(', ')+'.');
 if(progress?.gain>0)results.push('Houve avanço em '+progress.skill+'.');
 if(!results.length)results.push('Nenhum avanço foi registrado neste período.');
 return 'Resultado do treino após '+duration+'. '+results.join(' ');
}
