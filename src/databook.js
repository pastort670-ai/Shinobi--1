// Ficha inspirada nos gráficos de oito parâmetros dos databooks de Naruto.
// Escalas são estimativas do Shinobi, NÃO notas oficiais para personagens originais.
// Os campos ausentes permanecem "não avaliados" em vez de receber valores inventados.
export const DATABOOK_ATTRIBUTES=Object.freeze([
 {key:'ninjutsu',label:'Ninjutsu',kind:'training'},
 {key:'taijutsu',label:'Taijutsu',kind:'training'},
 {key:'genjutsu',label:'Genjutsu',kind:'training'},
 {key:'intelligence',label:'Inteligência',kind:'assessment'},
 {key:'strength',label:'Força',kind:'assessment'},
 {key:'speed',label:'Velocidade',kind:'assessment'},
 {key:'stamina',label:'Resistência',kind:'assessment'},
 {key:'handSeals',label:'Selos de mão',kind:'assessment'}
]);
export const MISSION_RANKS=Object.freeze(['D','C','B','A','S']);
const assessmentKeys=new Set(DATABOOK_ATTRIBUTES.filter(a=>a.kind==='assessment').map(a=>a.key));
const normal=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
const validRating=v=>typeof v==='number'&&Number.isFinite(v)&&v>=.5&&v<=5&&Number.isInteger(v*2);
const grade=v=>v===null?'Ainda não avaliado':v<=1?'Iniciante':v<=1.5?'Básico':v<=2.5?'Mediano':v<=3.5?'Bom':v<5?'Avançado':'Excepcional';
const trainingRating=v=>{
 if(!Number.isFinite(v)||v<=0)return null;
 const clamped=Math.min(100,Math.max(0,v));
 return Math.max(.5,Math.min(5,Math.round((.5+clamped/100*4.5)*2)/2));
};
const confirmedStats=c=>{
 const stored=c.databook?.ratings||{},progress=c.progress||{};
 return Object.fromEntries(DATABOOK_ATTRIBUTES.map(a=>[a.key,a.kind==='training'?trainingRating(progress[a.key]):validRating(stored[a.key])?stored[a.key]:null]));
};

export function databookView(c){
 const ratings=confirmedStats(c),log=Array.isArray(c.databook?.missions)?c.databook.missions.filter(m=>m&&MISSION_RANKS.includes(m.rank)).slice(-200):[];
 const missions=Object.fromEntries(MISSION_RANKS.map(rank=>[rank,log.filter(x=>x.rank===rank).length]));
 return {
  version:'1.0',basis:'Avaliações internas aproximadas; não são notas oficiais de databooks.',
  attributes:DATABOOK_ATTRIBUTES.map(a=>({key:a.key,label:a.label,value:ratings[a.key],description:grade(ratings[a.key]),evaluated:ratings[a.key]!==null})),
  ratings,missions,missionLog:log.slice(-12),
  missionPolicy:'Só conta missões concluídas e registradas a partir desta versão; números anteriores não são presumidos.',
  history:(Array.isArray(c.databook?.history)?c.databook.history:[]).filter(h=>h&&Number.isInteger(h.day)&&h.day>=0).slice(-18),
  hasPartialData:Object.values(ratings).some(v=>v===null)
 };
}

function hasNarrativeEvidence(narrative,evidence,name){
 if(typeof evidence!=='string'||evidence.trim().length<20||evidence.length>260)return false;
 if(typeof narrative!=='string'||!normal(narrative).includes(normal(evidence.trim())))return false;
 const full=normal(name).trim(),first=full.split(/\s+/)[0],phrase=normal(evidence);
 if(!first)return false;
 const escaped=v=>v.replace(/[.*+?^\x24{}()|[\]\\]/g,'\\ const subject=normal(name).split(/\s+/)[0],phrase=normal(evidence);
 return Boolean(subject&&phrase.includes(subject))||/\b(voce|protagonista|seu personagem|sua personagem)\b/.test(phrase);');
 const verbs='(?:treinou|aprendeu|estudou|praticou|demonstrou|mostrou|completou|executou|aprimorou|aperfeicoou|resistiu|concluiu|desenvolveu|realizou|dominou|superou|utilizou|usou)';
 const actors=[full,first,'voce','o protagonista','a protagonista','seu personagem','sua personagem'].map(escaped).join('|');
 const direct=new RegExp('(?:^|[^a-z0-9])(?:'+actors+')(?:\\s+(?:ja|tambem|claramente|finalmente)){0,2}\\s+'+verbs+'\\b','u');
 const team=new RegExp('\\b(?:equipe|time|esquadrao)\\s+(?:de|do)\\s+'+escaped(first)+'\\s+'+verbs+'\\b','u');
 return direct.test(phrase)||team.test(phrase);
}

export function commitDatabook(previous,next,result){
 const stored=next.databook&&typeof next.databook==='object'?next.databook:{};
 const out={ratings:{...(stored.ratings||{})},missions:Array.isArray(stored.missions)?stored.missions.slice(-199):[],history:Array.isArray(stored.history)?stored.history.slice(-17):[]};
 const old=confirmedStats(previous);
 const name=next.character?.name||'';
 const narrative=result.narrative||'';
 let reason=null;
 const updates=Array.isArray(result.databookUpdates)?result.databookUpdates.slice(0,2):[];
 for(const update of updates){
  if(!update||!assessmentKeys.has(update.attribute)||!validRating(update.rating))continue;
  if(!hasNarrativeEvidence(narrative,update.evidence,name))continue;
  if(!/\b(trein|aprend|estud|pratic|demonstr|mostr|complet|execut|aprimor|aperfei|resist|conclu|desenvolv|realiz)\w*/u.test(normal(update.evidence)))continue;
  const prior=validRating(out.ratings[update.attribute])?out.ratings[update.attribute]:null;
  const score=prior===null?Math.min(update.rating,2.5):Math.min(update.rating,prior+.5);
  if(prior===null||score>prior){out.ratings[update.attribute]=score;reason='Aptidão observada e confirmada na história.';}
 }
 const mission=result.missionCompletion;
 if(mission&&MISSION_RANKS.includes(mission.rank)&&typeof mission.summary==='string'&&mission.summary.trim()&&
    hasNarrativeEvidence(narrative,mission.evidence,name)&&
    /\bmiss[aã]o\b/u.test(normal(mission.evidence))&&
    /\b(conclu|cumpr|finaliz|termin|encerr|complet)\w*/u.test(normal(mission.evidence))&&
    new RegExp('\\b(?:rank|classe)\\s*'+mission.rank.toLowerCase()+'\\b','u').test(normal(mission.evidence))){
  const messageIndex=(next.messages||[]).length-1;
  if(!out.missions.some(m=>m.messageIndex===messageIndex)){
   out.missions.push({rank:mission.rank,summary:mission.summary.slice(0,180).trim(),day:next.day,messageIndex});
   reason=reason||'Missão concluída e confirmada na história.';
  }
 }
 const current=Object.fromEntries(DATABOOK_ATTRIBUTES.map(a=>[a.key,a.kind==='training'?trainingRating(next.progress?.[a.key]):validRating(out.ratings[a.key])?out.ratings[a.key]:null]));
 const changed=DATABOOK_ATTRIBUTES.some(a=>current[a.key]!==old[a.key]);
 if(changed){out.history.push({day:next.day,ratings:current,reason:reason||'Evolução de treinamento registrada pelo motor.'});}
 next.databook={ratings:out.ratings,missions:out.missions.slice(-200),history:out.history.slice(-18)};
 return next;
}
