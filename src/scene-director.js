import {narrationQuality} from './narrator-guard.js';
import {itachiAgeConflict,itachiStage} from './itachi-stage.js';
import {searchSpecialistKnowledge} from './shinobi-specialist.js';
import {chakraCondition} from './chakra-engine.js';

const normalize=value=>String(value??'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
const tokens=value=>normalize(value).match(/[\p{L}\p{N}]+/gu)||[];
const nameIn=(value,name)=>(' '+tokens(value).join(' ')+' ').includes(' '+tokens(name).join(' ')+' ');
function split(text){
 const quotations=[...text.matchAll(/“[^”\n]*”|«[^»\n]*»|"[^"\n]*"/gu)];
 const parts=[];
 let start=0;
 for(const boundary of text.matchAll(/(?:(?<=[.!?…])|(?<=[.!?…][”"»]))[^\S\n]+(?=[\p{Lu}“"—])|\n+/gu)){
  if(quotations.some(quote=>boundary.index>quote.index&&boundary.index<quote.index+quote[0].length))continue;
  parts.push(text.slice(start,boundary.index).trim());
  start=boundary.index+boundary[0].length;
 }
 return [...parts,text.slice(start).trim()].filter(Boolean);
}

const subjects=[
 ['clones',/\b(?:bunshin|clonagem|clone\w*)\b/u],
 ['substituição',/\b(?:kawarimi|substituicao)\b/u],
 ['chakra',/\b(?:chakra|ninjutsu|natureza elemental|fluxo de energia)\b/u],
 ['missão',/\b(?:miss[aã]o|missoes|relatorio|entrega)\b/u],
 ['treino',/\b(?:trein\w*|pratic\w*|exercit\w*|aprend\w*)\b/u],
 ['descanso',/\b(?:descans\w*|repous\w*|cansad\w*|exaust\w*|dorm\w*)\b/u]
];

const lesson={
 clones:[
  '— Comece pela distinção mais importante: um Bunshin comum engana os olhos, mas não consegue tocar em nada. Se ele segurar um objeto, estamos falando de outra técnica.',
  '— Pense no que o observador pode testar. Um clone sem corpo pode distrair, mas não sustenta o peso de um objeto.'
 ],
 substituição:[
  '— A substituição depende da distração e do momento em que você sai do lugar. Primeiro identifique o que o adversário está vendo.',
  '— Pense no que fica no seu lugar e em como você sai sem ser notado. São duas partes do mesmo movimento.'
 ],
 chakra:[
  '— Comece com pouco chakra e mantenha o fluxo estável. Se ele oscilar, diminua a intensidade até conseguir repetir o movimento com controle.',
  '— Antes de aumentar a potência, verifique se consegue repetir o efeito. Um fluxo irregular fica mais difícil de controlar quando você põe mais chakra.'
 ],
 treino:[
  '— Escolha uma parte do exercício e repita até conseguir comparar duas tentativas. Assim vamos saber exatamente o que precisa mudar.',
  '— Observe onde o movimento perde precisão. Vale mais corrigir esse ponto do que repetir o exercício inteiro de qualquer jeito.'
 ],
 missão:[
  '— Antes de sair, confirme o objetivo e o ponto de encontro com quem está encarregado. Se algo mudar no caminho, reporte o que viu.',
  '— Me diga primeiro qual é o objetivo. Depois podemos decidir o que levar e como avisar a equipe se o plano mudar.'
 ],
 descanso:[
  '— Se respirar fundo ainda custa esforço, dá para deixar o próximo exercício para depois. Uma pausa curta ajuda, mas não repõe toda a reserva.',
  '— Antes de voltar, veja se a respiração e o controle do chakra se estabilizaram. A gente retoma a partir daí.'
 ]
};
const instructors=['Hiruzen','Kakashi','Iruka','Yamato','Jiraiya','Tsunade','Asuma','Kurenai','Guy'];
const instruction=/\b(?:ensin\w*|explic\w*|instru\w*|orient\w*|aconselh\w*|mostra\w*)\b/u;
const spoken=/(?:^|\n)\s*[—–]|[.!?:]\s+[—–]\s|[“"«][^”"»\n]{2,}[”"»]/u;
const generic=/\b(?:escut\w*|ouv\w*|observ\w*|assent\w*|acena\w*|responde\w*|explic\w*|aguard\w*|permanec\w*|olha\w*|diz\b|faz uma pausa)\b/u;
const endsConversation=/\b(?:recus\w*|se nega|em silencio|nao (?:responde|fala|diz|pode|aceita)|sem (?:responder|dizer|falar)|foi embora|da as costas|sumiu|se afasta)\b/u;
const deliveredInstruction=/\b(?:explic\w* que|orient\w* a|recomend\w* que|aconselh\w* a|ensina como|descreve como)\b/u;

function acceptedScene(c){
 return (c.messages||[]).findLast(m=>m.role==='ai'&&!m.awaitingNarrator)?.text||'';
}

function readIntent(c,i){
 const text=(i.segments||[]).map(s=>s.text).join(' ');
 const speech=(i.segments||[]).filter(s=>s.type==='FALAR').map(s=>s.text).join(' ');
 const scene=acceptedScene(c);
 const subject=subjects.find(([,match])=>match.test(normalize(text)))?.[0]||
  (speech&&text.length<100?subjects.find(([,match])=>match.test(normalize(scene)))?.[0]:null)||null;
 return {topic:subject,mode:i.hours||i.days?'tempo':speech?'diálogo':'ação',speech,text,scene};
}

export function directorBrief(c,i){
 const intent=readIntent(c,i);
 const names=[...new Set([...instructors,...Object.keys(c.relations||{}),...Object.keys(c.npcAgents||{})])];
 const inScene=names.filter(name=>nameIn(intent.scene,name)||nameIn(intent.speech,name)).slice(0,6);
 return {
  mode:intent.mode,topic:intent.topic,possibleParticipants:inScene,
  direction:'Entregue uma proposta de cena concreta, em 2 a 4 parágrafos quando a situação comportar. Mostre o que mudou, com uma resposta específica ou um detalhe que afete a próxima escolha. Se houver diálogo, escreva o que o NPC de fato responde. Não repita o jogador, não antecipe sua decisão e não force uma fala ou reação.'
 };
}

function cleanDraft(text){
 return text.replace(/<(?:analysis|thinking|raciocinio)>[\s\S]*?<\/(?:analysis|thinking|raciocinio)>/giu,'')
  .split('\n').filter(line=>!/^\s*(?:racioc[ií]nio|nota do narrador|an[aá]lise interna|resumo t[eé]cnico):/iu.test(line))
  .join('\n').replace(/^\s*(?:NARRATIVA|NARRADOR):\s*/iu,'').trim();
}

function canonIssue(c,text){
 const normalized=normalize(text);
 if(itachiAgeConflict(text,itachiStage(c.day||0)))return true;
 if((c.day||0)>365)return false;
 if(/\b(?:no futuro|anos depois|um dia|sonh\w*|imagin\w*)\b/u.test(normalized))return false;
 return /\b(?:naruto|sasuke)\b[^.!?]{0,24}\b(?:e um genin|virou genin|atua como genin|lidera a equipe|entrou na academia)\b/u.test(normalized)||
  /\biruka\b[^.!?]{0,36}\b(?:e o professor|e professor|da aula|leciona)\b[^.!?]{0,36}\bacademia\b/u.test(normalized);
}

function unauthorizedSpeech(c,text){
 const name=tokens(c.character?.name)[0];
 if(!name||!spoken.test(text))return false;
 const t=normalize(text);
 const lead=t.match(/^([^“"«—–]{0,120})(?:[“"«—–]|$)/u)?.[1]||'';
 return lead.trim().endsWith(':')&&nameIn(lead,c.character?.name||name)||
  new RegExp(`^(?:${name}\\s*:\\s*|${name}\\b[^,;.!?]{0,48}\\b(?:diz|disse|fala|falou|declara|responde|respondeu|promete|prometeu)\\b)`, 'u').test(lead);
}

function duplicate(a,b){return tokens(a).join(' ')===tokens(b).join(' ');}

function localDialogue(c,intent,text){
 if(!intent.speech||spoken.test(text)||tokens(text).length>54)return '';
 const normalized=normalize(text);
 if(endsConversation.test(normalized)||deliveredInstruction.test(normalized))return '';
 const voice=instructors.find(name=>nameIn(text,name)&&
  (nameIn(intent.speech,name)||nameIn(intent.scene,name)));
 if(!voice||(!generic.test(normalized)&&!instruction.test(normalized)))return '';
 // Iruka ainda não leciona no começo da campanha.
 if(voice==='Iruka'&&(c.day||0)<12*365)return '';
 const recent=(c.messages||[]).slice(-8).map(m=>m.text);
 const askDefinition=/\b(?:o que (?:e|significa)|como funciona|me explic\w*)\b/u.test(normalize(intent.speech));
 const shadowClone=/\b(?:kage bunshin|clones? (?:da|das|de) sombras?)\b/u.test(normalize(intent.speech));
 if(shadowClone){
  const known=(c.jutsus||[]).some(jutsu=>nameIn(jutsu.name,'Kage Bunshin'));
  const facts=searchSpecialistKnowledge('Kage Bunshin no Jutsu',{day:c.day||0,categories:['technique'],limit:4});
  const line='— Um clone das sombras pode tocar objetos e divide o chakra com quem o criou. Por isso preparar vários muda o quanto resta para a próxima técnica.';
  return (known||facts.some(fact=>fact.title==='Kage Bunshin no Jutsu'))&&!recent.some(scene=>scene.includes(line))?line:'';
 }
 const variants=lesson[intent.topic]||[];
 if(askDefinition&&!variants.length){
  const entry=searchSpecialistKnowledge(intent.speech,{day:c.day||0,categories:['technique'],limit:8})
   .find(item=>item.reference&&nameIn(intent.speech,item.title)&&!recent.some(s=>s.includes(item.text)));
  if(entry&&!nameIn(text,entry.title))return '— '+entry.text;
 }
 return variants.find(line=>!recent.some(s=>s.includes(line)))||'';
}

// As regras opcionais da resposta não devem fazer uma boa cena inteira falhar.
// Cada proposta recuperada continua passando pelo mesmo validador do motor.
export function validateDraft(raw,validate){
 try{return validate(raw);}catch(error){
  if(!raw||typeof raw.narrative!=='string'||!raw.narrative.trim())throw error;
 }
 const baseline=validate({narrative:raw.narrative});
 const result={...baseline};
 for(const key of Object.keys(baseline)){
  if(key==='narrative'||!Object.hasOwn(raw,key))continue;
  try{result[key]=validate({narrative:raw.narrative,[key]:raw[key]})[key];}
  catch{/* Preserva o padrão validado para o campo inválido. */}
 }
 return result;
}

const withheld={
 facts:[],relations:[],development:[],pendingTasks:[],npcKnowledge:[],personalityTraits:[],consequences:[],
 divergences:[],profileUpdates:[],learnedJutsus:[],databookUpdates:[],missionCompletion:null,teamUpdate:null,
 training:null,moment:null,energyDelta:0,chakraDelta:0,timeAvailable:false,timeOptions:[],timeChoices:[],
 elapsedDays:0,elapsedHours:0,clockHour:null,timeInterruption:null
};

export function directScene(c,i,proposal,{fixedCombat=false}={}){
 const draft=cleanDraft(proposal.narrative||'');
 const originalParts=split(draft);
 const issues=[];
 const parts=[];
 let contradicted=false;
 for(const part of originalParts){
  if(!fixedCombat&&!i.days&&!i.hours&&canonIssue(c,part)){contradicted=true;issues.push('cronologia');continue;}
  if(!fixedCombat&&unauthorizedSpeech(c,part)){contradicted=true;issues.push('fala-do-jogador');continue;}
  if(parts.some(v=>duplicate(v,part))){issues.push('repetição');continue;}
  parts.push(part);
 }
 const text=issues.length?parts.join('\n\n'):draft;
 const quality=narrationQuality(c,i,text);
 if(!quality.narrative)return {narrative:'',issues:[...issues,'sem-cena']};
 if(quality.removed)issues.push('eco');
 let narrative=quality.narrative;
 if(!fixedCombat&&!contradicted&&!i.opening&&!i.legacyRewrite&&!i.hours&&!i.days&&proposal.sceneType!=='combat'){
  const intent=readIntent(c,i);
  const extra=localDialogue(c,intent,narrative);
  if(extra&&!narrationQuality(c,i,extra).echoes){narrative+='\n\n'+extra;issues.push('orientação-contextual');}
 }
 return {
  narrative,
  proposal:contradicted?{...proposal,...withheld,narrative}: {...proposal,narrative},
  issues:[...new Set(issues)]
 };
}

export function describeExertion(narrative,{energyBefore,energyAfter,chakraBefore,chakraAfter}){
 const normalized=normalize(narrative);
 const notes=[];
 if((energyBefore>=50&&energyAfter<50||energyBefore>=25&&energyAfter<25)&&
    !/\b(?:cansad\w*|exaust\w*|fadiga|fatigad\w*|ofegan\w*|folego|desgaste fisico|sem forcas)\b/u.test(normalized)){
  notes.push(energyAfter<25?'O esforço deixou o corpo no limite.':'O esforço deixou o corpo cansado.');
 }
 const chakra=chakraCondition(chakraAfter);
 if(chakraAfter<chakraBefore&&chakra!==chakraCondition(chakraBefore)&&
    !/\b(?:reservas? (?:de chakra )?(?:esgotad\w*|reduzid\w*|baix\w*)|chakra (?:consumid\w*|gast\w*|esgot\w*)|sem chakra)\b/u.test(normalized)){
  notes.push(chakraAfter<=0?'A reserva de chakra se esgotou.':chakraAfter<=20?'Resta pouco chakra na reserva.':'O esforço reduziu a reserva de chakra.');
 }
 return notes.length?narrative+'\n\n'+notes.join(' '):narrative;
}

export function directCombatSpeech(c,i,plan,speech){
 if(typeof speech!=='string')return null;
 const draft=cleanDraft(speech.slice(0,500));
 const changesResult=/\b(?:voce (?:venceu|perdeu|me derrotou|foi derrotad[oa])|acertou (?:o ultimo golpe|em cheio)|suas reservas voltaram|o combate terminou|nao posso mais lutar)\b/u;
 if(canonIssue(c,draft)||unauthorizedSpeech(c,draft)||!plan.finished&&changesResult.test(normalize(draft)))return null;
 return narrationQuality(c,i,draft).narrative||null;
}
