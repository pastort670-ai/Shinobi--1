// A fala do jogador pode dar um nome ao jutsu. O domínio vem da cena aceita.
const plain=value=>String(value??'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
export const jutsuKey=value=>(plain(value).match(/[\p{L}\p{N}]+/gu)||[]).join(' ');
const escape=value=>value.replace(/[.*+?^$${}()|[\]\\]/g,'\\$&');
const sentences=text=>String(text??'').match(/[^.!?;\n]+[.!?]?/gu)||[];
const nameLimit=100;
const repertoireLimit=100;

const technique=/\b(?:jutsu|ninjutsu|genjutsu|taijutsu|tecnic[ao])\b/u;
const title=/^[\p{Lu}\p{Lt}][\p{L}\p{N}'’\p{Pd}]*(?:(?:[ \t]*:[ \t]*|[ \t]+(?:(?:de|da|do|das|dos|e|em|no|na|del)\s+){0,2})[\p{Lu}\p{Lt}\p{N}][\p{L}\p{N}'’\p{Pd}]*){0,9}/u;
const quotedTitle=/^(?:[“«"‘'`]|\*\*)([^”»"’'`*\n]{2,100})(?:[”»"’'`]|\*\*)/u;
const label=/\b(?:chamad[oa]|nomead[oa]|batizad[oa]|de nome)\s+(?:de\s+)?|\b(?:chamo|nomeio|batizo|chamou|nomeou|batizou)\s+(?:(?:o|a|esse|essa|meu|minha)(?:\s+(?:nov[oa]|propri[oa]))?\s+(?:tecnica|jutsu)\s+)?de\s+/gu;
const jutsuMention=/\b(?:jutsu|tecnica)\s+(?:(?:nov[oa]|original|propri[ao]|autoral)\s+)?(?:de\s+nome\s+)?/gu;
const playerCast=/\b(?:uso|executo|conjuro|ativo|lanco|invoco|aperfeicoo|pratico|treino|crio|desenvolvo|testo)\s+(?:(?:a|o|meu|minha)\s+)?/gu;
const possessiveSuccess=/^(?:a sua|sua|a tua|tua|o seu|seu)\s+(?:(?:nov[oa]|propri[ao])\s+)?(?:tecnica|jutsu|criacao)\b.{0,80}\b(?:funciona|funcionou|se estabiliza|se estabilizou|saiu como planejado)\b/u;
const learned=/(?:aprendeu|aprende|dominou|domina|criou|cria|desenvolveu|aperfeicoou|concluiu (?:o )?desenvolvimento (?:do|da)|consegu(?:e|iu) (?:usar|executar|realizar|ativar|dominar|controlar|criar|desenvolver)|(?:execut(?:a|ou)|realiz(?:a|ou)|us(?:a|ou)|utiliz(?:a|ou)|ativ(?:a|ou)|aplic(?:a|ou))\b.{0,145}\b(?:com sucesso|com exito|como planejado|sem falhar))/u;
const unsuccess=/\b(?:nao (?!so\b)|nunca|jamais|falh\w*|fracass\w*|instav\w*|prototip\w*|rascunh\w*|incomplet\w*|colaps\w*|apenas tent\w*|tentou|sem conseguir|ainda precisa|por um instante|na teoria|hipoteticamente|poderia|talvez|se (?:voce|ele|ela)\s+(?:consegui\w*|domin\w*|cri\w*))\b/u;

function candidateName(text,allowLowercase){
 const value=text.trim().replace(/^[\s:–—-]+/u,'');
 const candidate=quotedTitle.exec(value)?.[1]||title.exec(value)?.[0]||
  (allowLowercase?value.split(/\s+(?:que|para|com|cujo|cuja|durante|enquanto|quando|e quero|e tento|e volto)\b|[.,;!?():]/iu)[0].trim():'');
 if(!candidate||candidate.length>nameLimit||candidate.split(/\s+/u).length>10||!/^\p{L}/u.test(candidate))return null;
 const key=jutsuKey(candidate);
 return /^(?:a|o|um|uma|essa|esse|isso|isto|ele|ela|minha|meu|tecnica|jutsu)$/u.test(key)?null:candidate;
}

function mentions(text,fromPlayer){
 const source=text.normalize('NFC');
 const normalized=plain(source);
 if(!technique.test(normalized))return [];
 const result=new Set();
 const patterns=[[label,true],[jutsuMention,false]];
 if(fromPlayer)patterns.push([playerCast,false]);
 for(const [pattern,allowLowercase] of patterns){
  for(const match of normalized.matchAll(pattern)){
   const name=candidateName(source.slice(match.index+match[0].length),allowLowercase);
   if(name)result.add(name);
  }
 }
 return result;
}

export function recoverNarratedJutsus(campaign){
 const recovered=[];
 const knownNames=new Set((Array.isArray(campaign.jutsus)?campaign.jutsus:[]).map(item=>jutsuKey(item?.name)));
 if(knownNames.size>=repertoireLimit)return recovered;
 const fullName=plain(campaign.character?.name).trim();
 const subjects=[fullName,fullName.split(/\s+/u)[0],'você','o protagonista','a protagonista'].map(plain).filter(Boolean).map(escape);
 const performer=new RegExp('^(?:'+subjects.join('|')+')\\s+(?:(?:concluiu|terminou|completou) (?:o|um|seu) (?:treino|treinamento|exercicio) e )?(?:(?:finalmente|com sucesso|enfim|agora)\\s+)?'+learned.source+'\\b','u');
 const pending=new Map();
 let currentNames=[];
 for(const message of campaign.messages??[]){
  if(typeof message?.text!=='string')continue;
  if(message.role==='user'){
   currentNames=[...mentions(message.text,true)].slice(0,8);
   for(const name of currentNames){
    const key=jutsuKey(name);
    pending.delete(key);
    pending.set(key,name);
    if(pending.size>24)pending.delete(pending.keys().next().value);
   }
   continue;
  }
  if(message.role!=='ai'||message.awaitingNarrator||message.combatResult){
   currentNames=[];
   continue;
  }
  for(const sentence of sentences(message.text)){
   const evidence=sentence.trim().replace(/^[-–—]\s*/u,'');
   const normalized=plain(evidence).replace(/^(?:(?:apos|depois de|com|por fim|finalmente)\b[^,]{0,150},\s*)/u,'');
   if(evidence.endsWith('?')||unsuccess.test(normalized.replace(/\bsem falhar\b/gu,''))||!performer.test(normalized)&&!possessiveSuccess.test(normalized))continue;
   const words=' '+jutsuKey(normalized)+' ';
   const named=[...pending.entries()].filter(([key])=>words.includes(' '+key+' ')).map(([,name])=>name);
   for(const name of mentions(evidence,false))if(!named.some(value=>jutsuKey(value)===jutsuKey(name)))named.push(name);
   if(!named.length&&currentNames.length===1&&(technique.test(normalized)||possessiveSuccess.test(normalized)||
      /\b(?:executa|usar|domina|controla)-l[oa]\b/u.test(normalized)))named.push(currentNames[0]);
   for(const name of named){
    const key=jutsuKey(name);
    if(knownNames.has(key)||knownNames.has(key+' no jutsu'))continue;
    recovered.push({name,description:evidence.slice(0,300),day:Number.isInteger(message.day)?message.day:campaign.day||0});
    knownNames.add(key);
    if(knownNames.size>=repertoireLimit)return recovered;
   }
  }
  currentNames=[];
 }
 return recovered;
}
