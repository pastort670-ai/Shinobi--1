import {visibleRelationships} from './relationship-engine.js';
import {itachiStage} from './itachi-stage.js';

const normalize=value=>String(value??'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
const words=value=>normalize(value).match(/[\p{L}\p{N}]+/gu)||[];
const includes=(value,name)=>(' '+words(value).join(' ')+' ').includes(' '+words(name).join(' ')+' ');
const startsWithName=(value,name)=>new RegExp('^'+normalize(name).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?=[^\\p{L}]|$)','u').test(normalize(value).trim());
const stop=new Set('agora aqui aquele aqueles aquela aquelas pode posso deve quero acho que isso isto esta esse essa meus minhas tem tenho está sobre onde muito mesmo sabe saber voce pode meu minha para com uma das por das dos nos fica ficar quem quando'.split(' '));
const signature=text=>words(text).filter(w=>w.length>=3&&!stop.has(w));
const protectedLanguage=/\b(?:segredo|somente (?:voce|tu)|so (?:voce|tu)|pode saber|em particular|em sigilo|sussurr\w*|cochich\w*|so entre nos)\b/u;
const tells=/\b(?:conto|digo|falo|revelo|explico|sussurro|cochicho|informo)\b/u;
const acknowledges=/\b(?:ouve|ouviu|ao ouvir|escuta|escutou|assente|assentiu|acena|acenou|responde|respondeu|murmura|diz|pergunta|confirma|repete|reage|faz que sim|guarda|inclina a cabeca)\b/u;
const blocked=/\b(?:nao (?:ouve|ouviu|escuta|escutou|chegou|conseguiu|conta|contou|revela|revelou)|nao chegou a (?:falar|ouvir)|sem (?:ouvir|escutar)|antes (?:de ouvir|que pudesse (?:falar|ouvir))|nao esta presente|longe demais)\b/u;
const split=text=>String(text??'').split(/(?<=[.!?…])\s+(?=[\p{Lu}“"—])|\n+/u).map(s=>s.trim()).filter(Boolean);

const canon={
 Hiruzen:'Hokage e mentor experiente. Fala com calma e calor; ensina com perguntas e exemplos concretos. Como Hokage, considera as consequências para a vila e explica limites quando precisa negar um pedido.',
 Itachi:'Observador, econômico nas palavras e atento às pessoas próximas. Na infância, é uma criança prodígio com responsabilidades e conhecimentos da idade.',
 Kakashi:'Reservado, irônico com discrição e atento à coordenação de equipe. Avalia posição e preparação com exemplos práticos.',
 Iruka:'Paciente, firme e atento a como quem está aprendendo reage. Use responsabilidades compatíveis com sua idade.',
 Asuma:'Direto, ponderado e próximo do grupo. Prefere explicar uma escolha pelo efeito que tem sobre a equipe.',
 Kurenai:'Atenta ao comportamento e às percepções dos outros. Faz perguntas precisas antes de tirar conclusões.',
 Jiraiya:'Irreverente nas conversas comuns e direto quando identifica um risco ou precisa ensinar.',
 Tsunade:'Franca, pragmática e exigente. Costuma apontar o erro concreto e o que precisa mudar.',
 Naruto:'Expressivo, persistente e sensível ao reconhecimento. Use fala e iniciativa compatíveis com sua idade.',
 Sasuke:'Contido e competitivo. O que aconteceu na campanha e sua idade definem como reage.',
 Shisui:'Atento a vínculos e consequências para o grupo. Fala com naturalidade, sem antecipar sua trajetória.'
};
const canonicalNames=new Map(Object.keys(canon).map(name=>[normalize(name),name]));
const canonName=name=>canonicalNames.get(words(name)[0])||null;
const sameName=(a,b)=>{const ak=canonName(a),bk=canonName(b);return ak&&bk?ak===bk:words(a).join(' ')===words(b).join(' ');};
export const mentionsActor=(text,name)=>includes(text,name)||(canonName(name)&&includes(text,canonName(name)))||
 canonName(name)==='Hiruzen'&&/\b(?:terceiro hokage|sandaime)\b/u.test(normalize(text));
const hasName=mentionsActor;
function uniqueNames(list){
 const distinct=new Map();
 for(const name of list){
  if(typeof name!=='string'||!name.trim())continue;
  const key=canonName(name)||words(name).join(' ');
  if(!distinct.has(key))distinct.set(key,name);
 }
 return [...distinct.values()];
}
const nameValid=name=>typeof name==='string'&&name.length<=100&&/^[\p{L}][\p{L}\p{M} .'’-]*$/u.test(name);
const ledgerLimit=150;

export function sanitizeDisclosures(raw,day){
 if(!Array.isArray(raw))return [];
 return raw.slice(-ledgerLimit).filter(record=>record&&typeof record.text==='string'&&record.text.length<=600&&signature(record.text).length>=3&&
  Number.isInteger(record.day)&&record.day>=0&&record.day<=day&&Array.isArray(record.audience)&&record.audience.length<=12&&record.audience.every(nameValid))
  .map(({text,day,audience})=>({text:text.trim(),day,audience:uniqueNames(audience)}))
  .filter(record=>record.audience.length);
}

function namesFor(c,i){
 const privateName=(i.segments||[]).flatMap(segment=>{
  const text=segment.text.trim();
  if(!protectedLanguage.test(normalize(text)))return [];
  if(segment.type==='FALAR')return text.match(/^([\p{Lu}][\p{L}'’-]+(?:\s+[\p{Lu}][\p{L}'’-]+){0,2})\s*[,:]/u)?.[1]||[];
  return text.match(/\b(?:para|a|ao)\s+([\p{Lu}][\p{L}'’-]+(?:\s+[\p{Lu}][\p{L}'’-]+){0,2})\b/u)?.[1]||[];
 }).filter(name=>!['pai','mae','sensei','hokage'].includes(normalize(name)));
 return uniqueNames([...Object.keys(c.npcAgents||{}),...Object.keys(visibleRelationships(c)),...Object.keys(c.npcKnowledge||{}),
  ...(Array.isArray(c.team?.peers)?c.team.peers:[]),c.team?.leader,...Object.keys(canon),...privateName])
  .filter(name=>nameValid(name)&&!sameName(name,c.character?.name));
}

function adoptedByHiruzen(c){
 const history=normalize(c.character?.history);
 return /\badotad[oa]\b[^.!?]{0,75}\bpor hiruzen\b|\bhiruzen\b[^.!?]{0,45}\badotou\b/u.test(history);
}

const addressesFather=text=>/^pai\s*[,!:]/u.test(normalize(text).trim());
const directAddressee=(c,text,names)=>directRecipient(text,names,false)||(adoptedByHiruzen(c)&&addressesFather(text)?'Hiruzen':null);

export function correctKinship(c,text,nearby=''){
 const normalized=normalize(text),firstName=words(c.character?.name)[0];
 if(!firstName||!adoptedByHiruzen(c)||!hasName(text+' '+nearby,'Hiruzen')||
    /\b(?:konohamaru|outr[oa] menin[oa]|net[oa] de)\b/u.test(normalized))return text;
 const linked=includes(text+' '+nearby,firstName)||hasName(text,'Hiruzen')&&
  /\b(?:olha|olhou|olhando|aponta|apontou|se volta|se voltou)\s+para\s+(?:o|a|seu|sua) net[oa] adotiv[oa]\b/u.test(normalized)||
  /^(?:o idoso|terceiro hokage|o terceiro hokage|hiruzen)\b[^.!?]{0,130}\b(?:ouve|ouvir|observa|observou|ouvindo|mede|medindo)\s+(?:o|a|seu|sua) net[oa]\b/u.test(normalized);
 if(!linked)return text;
 return text.replace(/\bnet([oa])(?: adotiv[oa])?\b/giu,'filh$1 adotiv$1').replace(/\bavô(?: adotivo)?(?=$|[^\p{L}])/giu,'pai adotivo');
}

function directRecipient(text,names,action){
 const source=String(text??'');
 const suitable=names.filter(name=>hasName(source,name));
 if(action&&suitable.length!==1)return null;
 if(action)return suitable[0];
 return suitable.find(name=>{
  const first=canonName(name)||name;
  return normalize(source).trim().startsWith(normalize(first)+' ')||normalize(source).trim().startsWith(normalize(first)+',')||
   normalize(source).trim().startsWith(normalize(first)+':')||normalize(source).trim().startsWith(normalize(first)+'!');
 })||null;
}

function playerDisclosures(c,i,names,ledger){
 let recipient=null,isPrivate=false;
 const disclosures=[];
 for(const [index,segment] of (i.segments||[]).entries()){
  const normalized=normalize(segment.text);
  if(segment.type==='AGIR'){
   recipient=null;
   isPrivate=false;
   if(tells.test(normalized)&&!/^\s*(?:nao|se|finjo|tento)/u.test(normalized)){
    recipient=directRecipient(segment.text,names,true);
    isPrivate=protectedLanguage.test(normalized);
   }
   continue;
  }
  if(/^\s*(?:nao contei|nao vou contar|se eu contar|imagine)/u.test(normalized))continue;
  const addressed=directAddressee(c,segment.text,names)||recipient;
  if(!addressed)continue;
  const text=segment.text.replace(/^[^,:!?]{1,100}[,:]\s*/u,'').replace(/^[^:]{1,100}\b(?:segredo|saber|sigilo)\s*:\s*/iu,'').trim();
  if(signature(text).length<3||text.length>600)continue;
  const existing=ledger.find(record=>mentionsDisclosure(text,record.text));
  const privateTurn=protectedLanguage.test(normalized)||isPrivate;
  if(privateTurn||existing)disclosures.push({text:existing?.text||text,audience:[addressed],pending:true,utteranceAt:index+1});
 }
 return disclosures;
}

function mentionsDisclosure(value,secret){
 const source=words(value).join(' '),wanted=words(secret).join(' ');
 if(source.includes(wanted))return true;
 const needle=[...new Set(signature(secret))];
 if(needle.length<3)return false;
 const haystack=new Set(signature(value));
 return needle.filter(word=>haystack.has(word)).length>=Math.max(3,Math.ceil(needle.length*.78));
}

export function sceneContinuity(c,i){
 const names=namesFor(c,i);
 const latest=(c.messages||[]).findLast(m=>m.role==='ai'&&!m.awaitingNarrator)?.text||'';
 const player=(i.segments||[]).map(s=>s.text).join(' ');
 const ledger=sanitizeDisclosures(c.disclosures,c.day||0);
 const pending=playerDisclosures(c,i,names,ledger);
 const mentioned=name=>hasName(player,name)||canonName(name)==='Hiruzen'&&adoptedByHiruzen(c)&&
  (i.segments||[]).some(segment=>segment.type==='FALAR'&&addressesFather(segment.text));
 const addressed=names.filter(mentioned);
 const participants=uniqueNames([...addressed,...names.filter(name=>hasName(latest,name))]).slice(0,8);
 const addressees=uniqueNames((i.segments||[]).filter(segment=>segment.type==='FALAR').map(segment=>directAddressee(c,segment.text,names)));
 return {names,latest,ledger,pending,participants,addressed,addressees};
}

export function continuityBrief(c,continuity,day=c.day||0){
 const relations=visibleRelationships(c);
 const sameEntries=(record,name)=>Object.entries(record||{}).filter(([key])=>sameName(key,name)).flatMap(([,value])=>Array.isArray(value)?value:[]);
 return {
  actors:continuity.participants.map(name=>{
   const key=canonName(name);
   const knowledge=[...sameEntries(c.npcKnowledge,name),...sameEntries(Object.fromEntries(Object.entries(c.npcAgents||{}).map(([n,a])=>[n,a?.knowledge])),name)];
   const restricted=[...continuity.ledger,...continuity.pending];
   const known=[...new Set(knowledge)].filter(fact=>!restricted.some(record=>mentionsDisclosure(fact,record.text))).slice(-5);
   const voice=key==='Itachi'?canon.Itachi+' No fim da janela do turno, Itachi tem '+itachiStage(day).age+' anos.':canon[key]||null;
   return {name,appearedInLastScene:hasName(continuity.latest,name),voice,
    kinship:key==='Hiruzen'&&adoptedByHiruzen(c)?'Pai adotivo do protagonista, segundo a ficha.':null,
    relationship:Object.entries(relations).find(([actor])=>sameName(actor,name))?.[1]||null,
    knownFacts:known,
    openCommitments:(c.pendingTasks||[]).filter(task=>task.status==='open'&&hasName(task.description,name)).slice(-3)
     .map(task=>({description:task.description,dueDay:task.dueDay??null}))};
  }),
  policy:'Menção ao nome não confirma presença. Cada NPC só pode agir com o que observou, ouviu ou descobriu na campanha. Vozes são orientações, não fatos. Considere compromissos em aberto e mantenha reações distintas entre personagens.'
 };
}

export function scopedDisclosures(continuity){
 const candidates=continuity.addressees.length?continuity.addressees:continuity.participants;
 const relevant=continuity.ledger.filter(record=>record.audience.some(name=>candidates.some(other=>sameName(name,other))));
 return [...relevant.slice(-8),...continuity.pending.slice(0,8)].map(({text,audience,pending,utteranceAt})=>({text,knownOnlyBy:audience,awaitingPrivateExchange:!!pending,...(pending?{utteranceAt}:{})}));
}

export function postponedDisclosure(continuity,text){
 if(!continuity.pending.length)return false;
 const planned=/\b(?:aguard\w*|esper\w*) (?:a revelacao|a confidencia|que (?:kaien|o garoto|a garota|o protagonista) (?:fale|conte|revele)|o que (?:ele|ela) tem a dizer)\b/u;
 return split(text).some(part=>planned.test(normalize(part))&&!blocked.test(normalize(part)));
}

export function maskDisclosures(value,records){
 if(!records.length)return value;
 if(typeof value==='string'){
  const parts=split(value);
  if(!parts.some(part=>records.some(record=>mentionsDisclosure(part,record.text))))return value;
  return parts.map(part=>records.some(record=>mentionsDisclosure(part,record.text))?'[relato privado limitado aos participantes]':part).join('\n');
 }
 if(Array.isArray(value))return value.map(item=>maskDisclosures(item,records));
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,maskDisclosures(item,records)]));
 return value;
}

function audienceOf(record,continuity){
 const matches=[...continuity.ledger,...continuity.pending].filter(item=>mentionsDisclosure(item.text,record.text));
 return uniqueNames(matches.flatMap(item=>item.audience));
}

export function disclosureConflict(c,continuity,part,preceding=''){
 const speech=part.match(/^[—–“"]/u);
 const attributed=speech&&part.match(/[”"—–]\s*(?:diz|disse|responde|respondeu|pergunta|perguntou|murmura)\s+([^.!?]+)[.!?]?$/iu)?.[1];
 const clause=attributed||(speech&&preceding?preceding:part);
 const candidates=continuity.names.filter(name=>!sameName(name,c.character?.name)&&hasName(clause,name));
 return [...continuity.ledger,...continuity.pending].some(record=>{
  if(!mentionsDisclosure(part,record.text))return false;
  const audience=audienceOf(record,continuity);
  if(!candidates.length)return !audience.some(name=>continuity.participants.some(actor=>sameName(actor,name)));
  const speaker=candidates.find(name=>startsWithName(clause,canonName(name)||name))||candidates[0];
  return !audience.some(actor=>sameName(actor,speaker));
 });
}

export function commitDisclosures(previous,next,i,r,continuity=sceneContinuity(previous,i)){
 const parts=split(r.narrative);
 const confirmed=continuity.ledger.map(record=>{
  const disclosed=parts.filter(part=>record.audience.some(name=>startsWithName(part,canonName(name)||name))&&
   mentionsDisclosure(part,record.text)&&!blocked.test(normalize(part)))
   .flatMap(part=>{
    const receiver=normalize(part).match(/\b(?:conta|contou|revela|revelou|sussurra|sussurrou|informa|informou)\s+(?:a|ao|para|pra)\s+([^.!?:;,]+)/u)?.[1];
    return receiver?continuity.names.filter(name=>startsWithName(receiver,canonName(name)||name)):[];
   });
  return disclosed.length?{...record,audience:uniqueNames([...record.audience,...disclosed]).slice(0,12)}:record;
 });
 for(const record of continuity.pending){
  const spoken=record.audience.filter(name=>parts.some(part=>{
   const subject=startsWithName(part,canonName(name)||name);
   return subject&&acknowledges.test(normalize(part))&&!blocked.test(normalize(part));
  }));
  if(!spoken.length)continue;
  const index=confirmed.findIndex(item=>mentionsDisclosure(item.text,record.text));
  if(index<0)confirmed.push({text:record.text,day:next.day,audience:spoken});
  else confirmed[index]={...confirmed[index],audience:uniqueNames([...confirmed[index].audience,...spoken]).slice(0,12)};
 }
 if(confirmed.length)next.disclosures=confirmed.slice(-ledgerLimit);
 return next;
}

export function cleanPrivateKnowledge(proposal,continuity){
 const restricted=[...continuity.ledger,...continuity.pending];
 if(!restricted.length)return proposal;
 return {...proposal,npcKnowledge:(proposal.npcKnowledge||[]).filter(item=>!restricted.some(record=>mentionsDisclosure(item.fact,record.text)))};
}
