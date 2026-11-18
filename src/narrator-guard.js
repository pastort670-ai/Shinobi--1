// Deterministic narrator quality guard. The player owns their dialogue.
// No paid model requests are needed; evidence and accepted history are untouched.
const normal=v=>String(v||'').normalize('NFC').toLocaleLowerCase('pt-BR').replace(/\s+/g,' ').trim();
const quoted=/[“”"«»]/g;
const clean=v=>String(v||'').trim().replace(/^[“"«'‘]+|[”"»'’]+$/gu,'').trim();
const words=v=>normal(v).split(/\s+/).filter(Boolean);
export function playerDialogue(c,i){
 const result=[];
 const add=v=>{const s=clean(v);if(s.length>=3&&!result.some(q=>normal(q)===normal(s)))result.push(s);};
 for(const s of i.segments||[])if(s.type==='FALAR'){add(s.text);for(const part of String(s.text||'').split(/(?<=[?!])\\s+/u))if(part!==s.text)add(part);}
 for(const m of (c.messages||[]).filter(m=>m.role==='user').slice(-8)){
  const lines=String(m.text||'').split(/\n(?=(?:FALAR|AGIR|NARRAR|TEMPO):)/u);
  for(const line of lines){if(/^FALAR:\s*/iu.test(line)){const phrase=line.replace(/^FALAR:\s*/iu,'');add(phrase);for(const part of phrase.split(/(?<=[?!])\\s+/u))if(part!==phrase)add(part);}}
 }
 return result.slice(-28);
}
const escapeRegex=s=>s.replace(/[.*+?^\u0024{}()|[\]\\]/g,'\\$&');
const tokens=s=>clean(s).match(/[\p{L}\p{N}]+/gu)||[];
function echoRegex(s){
 const t=tokens(s);if(!t.length)return null;
 const sep='[\\s.,!?;:—–"“”«»…-]*';
 return new RegExp('(?<![\\p{L}\\p{N}])'+t.map(escapeRegex).join(sep)+'(?![\\p{L}\\p{N}])','giu');
}
function findEcho(text,quote){
 const phrase=clean(quote),long=phrase.length>=18&&tokens(phrase).length>=3;
 const pattern=echoRegex(phrase);if(!pattern)return null;
 for(const m of text.matchAll(pattern)){
  const before=text.slice(0,m.index),after=text.slice(m.index+m[0].length);
  const quotedBefore=/[“"«]\s*$/u.test(before),quotedAfter=/^[.!?…]*\s*[”"»]/u.test(after);
  const linePrefix=before.slice(before.lastIndexOf('\n')+1);
  const attributed=/\b(?:diz|disse|fala|falou|declara|declarou|responde|respondeu|sussurra|sussurrou)\b[^\n]{0,25}$/iu.test(linePrefix)||/^[\p{L}\s.'-]{2,90}:\s*["“«]?$/iu.test(linePrefix);
  if(long||(phrase.length>=3&&(attributed||(phrase.length>=5&&quotedBefore&&quotedAfter))))return m;
 }
 return null;
}
export function narrativeEchoes(c,i,narrative){
 return playerDialogue(c,i).filter(phrase=>!!findEcho(String(narrative||''),phrase));
}
function removeSpan(text,start,end){
 const before=text.slice(0,start),after=text.slice(end),lineStart=before.lastIndexOf('\n')+1;
 const prefix=before.slice(lineStart),lineEnd=after.indexOf('\n'),suffix=lineEnd<0?after:after.slice(0,lineEnd);
 const attribution=/\b(?:diz|disse|fala|falou|declara|declarou|responde|respondeu|sussurra|sussurrou)\b[^\n]{0,25}[: —]?\s*["“«]?\s*$/iu.test(prefix)||/^[\p{L}\s.'-]{2,90}:\s*["“«]?\s*$/iu.test(prefix);
 const rest=suffix.replace(/^[.!?…]*\s*[”"»]?\s*/u,'');
 if(attribution){
  // Remove only the player's speech attribution, preserving the other
  // characters' words and actions on the same line.
  const beginning=before.slice(0,lineStart),tail=after.slice(lineEnd<0?after.length:lineEnd);
  return beginning+rest+(tail.startsWith('\n')&&rest?'\n':'')+tail.replace(/^\n/u,'');
 }
 return before.replace(/[“"«]\s*$/u,'').trimEnd()+(after.replace(/^[.!?…]*\s*[”"»]?/u,'').startsWith('\n')?'':' ')+after.replace(/^[.!?…]*\s*[”"»]?/u,'');
}
export function stripPlayerEcho(c,i,narrative){
 let result=String(narrative||''),removed=0;
 for(const phrase of playerDialogue(c,i)){
  for(let guard=0;guard<12;guard++){
   const match=findEcho(result,phrase);if(!match)break;
   const previous=result;
   result=removeSpan(result,match.index,match.index+match[0].length);
   if(previous===result)break;
   removed++;
  }
 }
 result=result.replace(/\n{3,}/g,'\n\n').replace(/\s+([.,!?])/g,'$1').trim();
 return {narrative:result,removed};
}
export function narrationQuality(c,i,narrative){
 const echoes=narrativeEchoes(c,i,narrative);
 const clean=stripPlayerEcho(c,i,narrative);
 return {echoes:echoes.length,removed:clean.removed,narrative:clean.narrative};
}
