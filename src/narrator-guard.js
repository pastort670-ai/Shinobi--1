// Deterministic narrator quality guard. The player owns their dialogue.
// No paid model requests are needed; evidence and accepted history are untouched.
const normal=v=>String(v||'').normalize('NFC').toLocaleLowerCase('pt-BR').replace(/\s+/g,' ').trim();
const quoted=/[“”"«»]/g;
const clean=v=>String(v||'').trim().replace(/^[“"«'‘]+|[”"»'’]+$/gu,'').trim();
const words=v=>normal(v).split(/\s+/).filter(Boolean);
export function playerDialogue(c,i){
 const result=[];
 const add=v=>{const s=clean(v);if(s.length>=6&&!result.some(q=>normal(q)===normal(s)))result.push(s);};
 for(const s of i.segments||[])if(s.type==='FALAR')add(s.text);
 for(const m of (c.messages||[]).filter(m=>m.role==='user').slice(-8)){
  const lines=String(m.text||'').split(/\n(?=(?:FALAR|AGIR|NARRAR|TEMPO):)/u);
  for(const line of lines){if(/^FALAR:\s*/iu.test(line))add(line.replace(/^FALAR:\s*/iu,''));}
 }
 return result.slice(-14);
}
export function narrativeEchoes(c,i,narrative){
 const actual=normal(narrative).replace(quoted,'');
 return playerDialogue(c,i).filter(q=>{
  const phrase=normal(q).replace(quoted,'');
  // Very short utterances can legitimately be used by an NPC. A repeated
  // short phrase is prohibited when the narrator explicitly quotes it.
  const long=phrase.length>=18&&words(phrase).length>=3;
  return long&&actual.includes(phrase) || (phrase.length>=6&&new RegExp('(?:[“"«])'+escapeRegex(phrase)+'(?:[”"»])','iu').test(actual));
 });
}
const escapeRegex=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function removeSpan(text,start,end){
 // Remove the complete standalone quoted sentence, not adjacent NPC reactions.
 const before=text.slice(0,start),after=text.slice(end);
 const p=before.lastIndexOf('\n'),endOfLine=after.indexOf('\n');
 const lineStart=p<0?0:p+1,lineEnd=endOfLine<0?text.length:end+endOfLine;
 const line=text.slice(lineStart,lineEnd);
 const prefix=line.slice(0,start-lineStart),suffix=line.slice(end-lineStart);
 // When a line only replays the character's speech, drop it.
 if(/^(?:[-—* ]|\*\*|[\wÀ-ÿ .,'“"«»:]{0,100}(?:diz|disse|fala|falou|responde|respondeu|declara|declarou)[: ,]+)*[“"«]?$/iu.test(prefix.trim())&&/^[”"»]?[.!?\s]*$/u.test(suffix.trim())){
  return text.slice(0,lineStart)+text.slice(lineEnd).replace(/^\n/,'');
 }
 // Preserve the rest of the response; replace the echoed quotation by an omission.
 return before.replace(/[“"«]\s*$/u,'')+after.replace(/^\s*[”"»]/u,'').replace(/^\s+/,' ');
}
export function stripPlayerEcho(c,i,narrative){
 let result=String(narrative||''),removed=0;
 for(const quote of playerDialogue(c,i)){
  const phrase=normal(quote);
  if(phrase.length<6)continue;
  const long=phrase.length>=18&&words(phrase).length>=3;
  let n=0;
  while(n++<8){
   const normalized=normal(result);
   const pos=normalized.indexOf(phrase);
   // Find original match with whitespace-insensitive regular expression.
   const exact=new RegExp(escapeRegex(clean(quote)).replace(/\s+/g,'\\s+'),'iu');
   const match=exact.exec(result);
   if(!match||(!long&&!new RegExp('(?:[“"«])'+escapeRegex(clean(quote))+'(?:[”"»])','iu').test(result)))break;
   result=removeSpan(result,match.index,match.index+match[0].length);removed++;
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
