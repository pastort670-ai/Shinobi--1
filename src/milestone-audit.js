import {playerPerformed} from './progression.js';
// Auditoria de conquistas: somente registros aceitos da campanha podem ser fontes.
const normalized=t=>String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').replace(/\s+/g,' ').trim();
export function milestoneSources(c){
 const out=[];
 const add=(id,kind,day,text)=>{if(typeof text==='string'&&text.trim())out.push({id,kind,day:Number.isInteger(day)?day:c.day,text:text.trim().slice(0,1000)});};
 (c.memories||[]).filter(m=>m?.status==='saved').slice(-75).forEach((m,i)=>add('memory-'+i,'saved-memory',m.day,[m.title,m.description].filter(Boolean).join(' — ')));
 (c.development||[]).slice(-40).forEach((m,i)=>add('development-'+i,'development',m.day,m.text));
 (c.messages||[]).filter(m=>m?.role==='ai').slice(-35).forEach((m,i)=>add('narration-'+i,'accepted-narration',m.day,m.text));
 return out;
}
export function needsMilestoneAudit(c){return (c.milestoneAuditVersion||0)<1 && (c.memories||[]).some(m=>m?.status==='saved');}
export function verifiedMilestones(c,proposals,sources=milestoneSources(c)){
 const profile={...(c.profile||{})},jutsus=Array.isArray(c.jutsus)?c.jutsus.map(x=>({...x})):[];
 const accepted=[];
 const byId=new Map(sources.map(s=>[s.id,s]));
 const disallowed=/(?:\bnao\b|\bnunca\b|\bsem\b|\btentou\b|\btentativa\b|\bfalhou\b|\bquer\b|\bdeseja\b|\bpretende\b|\bplaneja\b|\bainda\b|\bso observou\b|\bviu\b)/u;
 for(const p of Array.isArray(proposals)?proposals.slice(0,30):[]){
  if(!p||typeof p!=='object')continue;
  const src=byId.get(p.sourceId),quote=normalized(p.evidence),value=normalized(p.value);
  if(!src||quote.length<10||!normalized(src.text).includes(quote)||disallowed.test(quote))continue;
  // Memória confirmada: prova preferencial; relatos aceitos: devem citar claramente o protagonista.
  const protagonist=normalized(c.character?.name||'').split(' ')[0];
  if(src.kind==='accepted-narration'&&protagonist&&!normalized(src.text).includes(protagonist))continue;
  // Verificar QUEM conquistou: encontrar o verbo e o jutsu/patente no mesmo
  // trecho confirmado. Citar um texto verdadeiro não basta se o autor for NPC.
  const proof=src.text.split(/[.!?;\n]+/u).find(part=>normalized(part).includes(quote));
  const rankVerb='recebeu|foi|tornou-se|graduou-se|formou-se|passou|é|já|promovido';
  const jutsuVerb='aprendeu|concluiu|dominou|usou|utilizou|executou|realizou|conseguiu|sabe|possui';
  const actor=proof&&(playerPerformed(proof,protagonist,p.kind==='rank'?rankVerb:jutsuVerb));
  if(!actor)continue;
  if(p.kind==='rank'&&value==='genin'&&/\bgenin\b/u.test(quote)){
   if(/\b(?:chunin|jonin|jounin|anbu|hokage)\b/u.test(normalized(profile.affiliation||c.character?.affiliation)))continue;
   profile.affiliation='Genin';accepted.push({kind:'rank',value:'Genin',sourceId:src.id});
  }else if(p.kind==='jutsu'){
   const shadow=/\bkage\s+bunshin\b/u.test(value);
   const clone=/\bbunshin\b|\bclone\b|\bclonagem\b/u.test(value);
   const sourceMentions=shadow?/\bkage\s+bunshin\b/u.test(quote):/\bbunshin\b|\bclone\b|\bclonagem\b/u.test(quote);
   if(!clone||!sourceMentions)continue;
   const name=shadow?'Kage Bunshin no Jutsu':'Bunshin no Jutsu';
   if(!jutsus.some(x=>normalized(x.name)===normalized(name))){
    jutsus.push({name,description:'Técnica confirmada em um acontecimento da campanha.',day:src.day});accepted.push({kind:'jutsu',value:name,sourceId:src.id});
   }
  }
 }
 return {profile,jutsus,accepted};
}
