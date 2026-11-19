import {hasExceptionalTalent} from './progression.js';

// Regras SHINOBI 2.4.1: a reserva exibida permanece descritiva (0..100 é interno).
// O Gemini propõe gasto; o motor ajusta à competência, verifica o tempo REAL
// consumido e recompõe chakra apenas quando há oportunidade narrativa.
const clamp=(v,max=100)=>Math.max(0,Math.min(max,Number.isFinite(v)?v:0));
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
const words=s=>norm(s);
const namedCast=/\b(?:rasengan|chidori|bunshin|katon|suiton|doton|raiton|futon)\b/u;

export function chakraExperience(c){
 const p=c.progress||{},controlText=words([c.character?.skills,c.character?.history,c.profile?.skills,...(c.development||[]).slice(-12).map(x=>x.text)].join(' '));
 const skill=Math.max(clamp(p.ninjutsu),clamp(p.genjutsu)*.7)/100;
 const provenControl=/(controle de chakra (?:avancado|refinado|excelente|preciso|aprimorado)|grande controle de chakra|precisao excepcional de chakra|chakra bem controlado)/.test(controlText);
 const largeReserve=/(?:grande|vasta|enorme|imensa|extraordinaria) reserva(?:s)? de chakra|reservas? de chakra (?:elevada|alta|enorme|imensa)|chakra (?:abundante|extraordinario)/.test(controlText);
 const rank=words(c.profile?.affiliation||c.character?.affiliation);
 const veteran=/hokage|kage|sannin|jonin|anbu/.test(rank)?0.09:/chunin/.test(rank)?0.06:/genin/.test(rank)?0.025:0;
 const talent=hasExceptionalTalent(c)?0.075:0;
 return {efficiency:Math.min(.47,.15+skill*.20+(provenControl?.09:0)+(largeReserve?.07:0)+veteran+talent),reserve:largeReserve,control:provenControl};
}

function restingInNarration(c,i,r,tick){
 const narrative=norm(r.narrative),action=norm((i.segments||[]).map(x=>x.text).join(' '));
 const first=norm(c.character?.name).split(/\s+/)[0];
 const subject=first.replace(/[^a-z0-9]/g,'');
 const agent=subject?subject+'|voce|o protagonista|a protagonista|seu personagem|sua personagem':'voce|o protagonista|a protagonista';
 const restVerb='(?:descansou|repousou|dormiu|adormeceu|meditou|despertou|acordou|recuperou(?:-se)?|dormira)';
 const directly=new RegExp('(?:^|[^a-z0-9])(?:'+agent+')(?:\\s+\\w+){0,3}\\s+'+restVerb+'\\b','u').test(narrative);
 const collectively=/\b(?:o grupo|a equipe|os dois|ambos|todos)\s+(?:descansaram|repousaram|dormiram|adormeceram|meditaram|despertaram|acordaram)\b/.test(narrative);
 const explicitNarration=/\b(?:apos|depois de|durante)\s+(?:\w+\s+){0,4}(?:descanso|repouso|sono|meditacao)\b|\bpassou a noite dormindo\b/.test(narrative);
 const intent=/\b(?:dorm|adormec|descans|repous|medit|relax|recuperar\s+(?:o\s+)?chakra)\w*/.test(action);
 const morning=/\b(?:na manha seguinte|no dia seguinte|ao amanhecer|quando amanheceu|nas primeiras horas da manha)\b/.test(narrative);
 return directly||collectively||(intent&&(explicitNarration||(tick.hours>=6&&morning)));
}

function assistedRecovery(c,r){
 const story=norm(r.narrative),first=norm(c.character?.name).split(/\s+/)[0].replace(/[^a-z0-9]/g,'');
 const targeted=first&&story.includes(first)||/\b(?:voce|protagonista|seu personagem|sua personagem)\b/.test(story);
 return Boolean(targeted&&/\b(?:transferiu|transfere|restaurou|restaura|recompos|reabasteceu)\b.{0,45}\bchakra\b|\bchakra\b.{0,35}\b(?:restaurado|reposto|reabastecido)\b/.test(story));
}

function activeInterval(i,r){
 const text=norm([...(i.segments||[]).map(x=>x.text),r.narrative].join(' '));
 return /\b(?:trein|pratic|lut|batalh|combate|corr|persegu|exercit|uso(?:u|ando)\s+chakra|travessia exaustiva)\w*/.test(text);
}


function confirmedChakraUse(c,i,r){
 const actions=norm((i.segments||[]).filter(x=>x.type==='AGIR').map(x=>x.text).join(' '));
 const magic=/\b(?:chakra|jutsu|ninjutsu|genjutsu|fuinjutsu|selos de mao|bunshin|clon(?:e|es)|rasengan|chidori|sharingan|byakugan|katon|suiton|doton|raiton|futon|invocacao|tecnica ninja)\b/u;
 const casting=/\b(?:uso|usa|usou|utilizo|utiliza|utilizou|executo|executa|executou|ativo|ativa|ativou|canalizo|canaliza|canalizou|concentro|concentra|concentrou|moldo|molda|moldou|libero|libera|liberou|invoco|invoca|invocou|crio|cria|criou|treino|treina|treinou|pratico|pratica|praticou|realizo|realiza|realizou|faco|fiz|lanco|lanca|lancou|disparo|aplico|controle|controlo|controla|controlou)\b/u;
 if(magic.test(actions)&&casting.test(actions))return true;
 const narrative=norm(r.narrative),name=norm(c.character?.name).split(/\s+/)[0].replace(/[^a-z0-9]/g,'');
 if(!name)return false;
 const actor=name+'|voce|o protagonista|a protagonista|seu personagem|sua personagem';
 const nameCast=new RegExp('(?:^|[^a-z0-9])(?:'+actor+')\\s+(?:\\w+\\s+){0,3}(?:usou|utilizou|executou|ativou|canalizou|consumiu|gastou|concentrou|liberou|invocou|criou|moldou|perdeu|teve|drenou)\\b','u');
 return magic.test(narrative)&&nameCast.test(narrative);
}

export function chakraBalance(c,i,r,tick){
 const before=clamp(c.chakra),previousStrain=clamp(c.chakraStrain,20);
 if(r.encounterResolved===true){
  const spent=Math.min(before,clamp(r.combatChakraSpent));
  const strain=Math.min(20,previousStrain+(spent>=14?5:spent>=8?3:spent>=5?1:0));
  return {after:before-spent,spent,gained:0,strain,activity:spent?'Chakra consumido em técnicas.':'',mode:'none'};
 }
 const used=confirmedChakraUse(c,i,r);
 const proposed=used?clamp(-Math.min(0,r.chakraDelta||0),20):0;
 const costProposed=Math.max(proposed,used&&r.sceneType==='combat'?combatCastCost(i,r):0);
 const experience=chakraExperience(c);
 // Mesmo com reservas especiais, ataques grandes continuam custosos.
 const heavy=costProposed>=14;
 const adjustment=heavy?Math.min(.35,experience.efficiency):experience.efficiency;
 const spent=costProposed?Math.min(before,Math.max(1,Math.round(costProposed*(1-adjustment)))):0;
 const strainGain=spent>=14?5:spent>=8?3:spent>=5?1:0;
 const strain=Math.min(20,previousStrain+strainGain);
 const rest=r.sceneType!=='combat'&&restingInNarration(c,i,r,tick);
 const active=activeInterval(i,r);
 const hours=Math.max(0,Number.isFinite(tick.hours)?tick.hours:0);
 let gained=0,mode='none';
 if(rest){
  // O custo do esforço anterior importa: descanso leve recupera rapidamente;
  // exaustão/uso pesado exige mais tempo. A recuperação usa horas realmente transcorridas.
  const rate=strain>=10?4:strain>=5?6:9;
  gained=hours>0?Math.ceil(Math.min(hours,72)*rate):2;
  mode='rest';
 }else if(r.sceneType!=='combat'&&hours>0){
  // Passagem tranquila regenera lentamente, mesmo sem o Gemini declarar chakraDelta>0.
  const rate=active?.65:1.6;
  gained=Math.floor(Math.min(hours,240)*rate*(strain>=10?.65:1));
  mode='passive';
 }
 if(r.chakraDelta>0&&(rest||assistedRecovery(c,r))){
  // Somente uma recuperação efetivamente narrada pode receber bônus do modelo.
  gained+=Math.min(6,r.chakraDelta);
  if(mode==='none')mode='assisted';
 }
 gained=Math.min(100-before+spent,gained);
 const after=clamp(before-spent+gained);
 let remaining=strain;
 if(rest)remaining=Math.max(0,strain-Math.ceil(Math.min(hours,72)/3)-(hours===0?1:0));
 else if(mode==='passive')remaining=Math.max(0,strain-Math.floor(hours/12));
 const activity=spent>0&&gained>0?'Chakra gasto e parcialmente recuperado.':gained>0?(mode==='rest'?'Chakra recuperado com descanso.':mode==='assisted'?'Chakra restaurado por auxílio.':'Chakra se recuperou com o tempo.'):spent>0?'Chakra consumido em técnicas.':'';
 return {after,spent,gained,strain:remaining,activity,mode};
}

function combatCastCost(i,r){
 const narrative=norm(r.narrative);
 const technique=/\b(?:jutsu|ninjutsu|genjutsu|chakra|rasengan|chidori|bunshin|katon|suiton|doton|raiton|futon|invocacao|sharingan|byakugan)\b/u;
 if(!technique.test(narrative))return 0;
 if(/\b(?:nao (?:conseguiu|chegou a|pode) (?:usar|ativar|liberar|moldar)|(?:antes de|sem) (?:moldar|liberar|canalizar) chakra)\b/u.test(narrative))return 0;
 const actions=(i.segments||[]).filter(x=>x.type==='AGIR').flatMap(x=>norm(x.text).split(/[.!?;,\n]+|\s+(?:e depois|e entao|em seguida|e (?=uso|lanco|executo|disparo|ativo|aplico))\s*/u));
 let total=0;
 for(const clause of actions){
  if(!technique.test(clause)||/\b(?:nao|quero|pretendo|observo)\b/u.test(clause))continue;
  const named=clause.match(namedCast)?.[0];
  if(named&&!narrative.includes(named))continue;
  if(!/\b(?:uso|utilizo|executo|ativo|canalizo|moldo|libero|invoco|crio|faco|lanco|disparo|aplico|usa|utiliza|executa|ativa|lanca|dispara)\b/u.test(clause))continue;
  const repetitions=clause.match(/\b([2-9]|dois|duas|tres|quatro|cinco|seis|sete|oito|nove)\s+(?:vezes|jutsus|rasengans?|chidori)\b/u)?.[1];
  const count=repetitions?(Number(repetitions)||({dois:2,duas:2,tres:3,quatro:4,cinco:5,seis:6,sete:7,oito:8,nove:9})[repetitions]):/\b(?:repetidamente|em sequencia|varias vezes)\b/u.test(clause)?2:1;
  total+=count*(/\b(?:rasengan|chidori|invocacao|jutsu complexo)\b/u.test(clause)?10:5);
 }
 return Math.min(45,total);
}

export function chakraCondition(value){
 if(value<=0)return 'esgotado';
 if(value<=20)return 'quase esgotado';
 if(value<=55)return 'reserva reduzida';
 if(value<100)return 'reserva disponível';
 return 'reserva completa';
}

export const chakraPolicy='O motor Shinobi ajusta o gasto de chakra à experiência, talento e controle do personagem. Jutsus leves devem gastar pouco; técnicas intensas ou repetidas têm custo maior. Não marque perda de chakra por diálogo ou movimento comum. Descansar, dormir ou passar horas em segurança permite recuperação, sem restauração instantânea durante combate. Os valores de chakra são internos e a ficha continua descritiva.';
