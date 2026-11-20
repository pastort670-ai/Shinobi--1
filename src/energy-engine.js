const normalize=text=>String(text??'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
const clamp=value=>Math.max(0,Math.min(100,Number(value)||0));
const physicalPractice=/\b(?:treinos? praticos?|treino (?:fisico|de (?:combate|taijutsu|ninjutsu))|treinou|treina|praticou|exercitou|golpes|cortes desferidos|corrida|carregou)\b/u;
const fatigueSigns=/\b(?:desgaste fisico|recuperar o folego|fadiga muscular|respiracao ofegante)\b/u;
const qualifiers='(?:muito |visivelmente |completamente |ainda |claramente |ja )?';
const exhausted='(?:exaust[oa]|esgotad[oa]|sem forcas)';
const tired='(?:cansad[oa]|fatigad[oa]|ofegante)';

function protagonist(c){
 const full=normalize(c.character?.name);
 const first=full.split(/\s+/u)[0];
 const safe=text=>text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 return [full,first,'voce','o protagonista','a protagonista'].filter(Boolean).map(safe).join('|');
}

function energyEvidence(c,text){
 const actor=protagonist(c),story=normalize(text);
 const linked=story.split(/(?<=[.!?;])\s+|\n+/u).filter(Boolean);
 const subject='(?:^|[^\\p{L}])(?:'+actor+')\\s+';
 const direct=new RegExp(subject+'(?:(?:chegou|voltou|retornou|esta|estava|ficou|continuou|permaneceu|acaba|acabou|terminou|termina|se sente|se sentiu|sentiu-se|acordou|despertou)\\s+)?'+qualifiers+'('+exhausted+'|'+tired+')\\b','u');
 const rest=new RegExp(subject+'(?:(?:descansou|repousou|dormiu|adormeceu)\\b|(?:acordou|despertou|se recuperou|recuperou as forcas)\\b)','u');
 const full=new RegExp(subject+'(?:(?:acordou|despertou|esta|ficou|voltou|retornou)\\s+'+qualifiers+'(?:descansad[oa]|recuperad[oa])|recuperou (?:por completo|completamente|toda a energia)|recuperou todas as forcas)\\b','u');
 const negative=/\b(?:se |quando |talvez |poderia |parecia |diz que |dizia que |imaginou |ouviu que |nao |quase )/u;
 let last=null,trainingSubject=false;
 for(const sentence of linked){
  const hit=direct.exec(sentence);
  const strong=full.exec(sentence);
  const rested=rest.exec(sentence);
  if(hit&&!negative.test(sentence.slice(Math.max(0,hit.index-22),hit.index))){
   last={cap:new RegExp('^'+exhausted+'$','u').test(hit[1])?24:49};
  }else if(strong&&!negative.test(sentence.slice(Math.max(0,strong.index-22),strong.index))){
   last={full:true};
  }else if(rested&&!negative.test(sentence.slice(Math.max(0,rested.index-22),rested.index))){
   last={rest:true};
  }
  if(new RegExp(subject,'u').test(sentence)&&physicalPractice.test(sentence))trainingSubject=true;
  // Marca o desgaste do treino do protagonista, inclusive quando o relato
  // passa a falar do exercício ou do esforço em vez de repetir seu nome.
  if(!hit&&!strong&&!rested&&trainingSubject&&fatigueSigns.test(sentence)&&
    !/\b(?:nao (?:houve|sentiu|precisou)|sem desgaste|recuperou por completo|totalmente recuperad[oa])\b/u.test(sentence)){
   const npcMentioned=!new RegExp(subject,'u').test(sentence)&&/\b(?:instrutor|sensei|mestre|hiruzen|itachi|kakashi)\b/u.test(sentence);
   if(!npcMentioned)last={cap:49};
  }
 }
 return last;
}

export function energyOf(c){
 const energy=clamp(c.energy);
 const accepted=c.messages?.findLast(m=>m.role==='ai'&&!m.awaitingNarrator);
 // Para campanhas anteriores: corrige apenas o relato mais recente e não
 // reaplica desgaste a cada abertura da ficha.
 const condition=accepted?.energyReconciled?null:energyEvidence(c,accepted?.text);
 if(condition?.full)return 100;
 return condition?.cap===undefined?energy:Math.min(energy,condition.cap);
}

export function energyAfterTurn(c,i,r,tick){
 const before=energyOf(c);
 const proposed=Number(r.energyDelta)||0;
 if(r.encounterResolved)return clamp(before+proposed);
 const condition=energyEvidence(c,r.narrative);
 const hours=Math.max(0,tick.hours||0);
 if(condition?.cap!==undefined)return Math.min(clamp(before+Math.min(0,proposed)),condition.cap);
 if(r.sceneType!=='combat'&&condition?.full)return 100;
 if(r.sceneType!=='combat'&&condition?.rest&&hours>0){
  return clamp(before+Math.max(proposed,Math.min(100,Math.floor(hours*12))));
 }
 const active=normalize((i.segments||[]).filter(s=>s.type==='AGIR').map(s=>s.text).join(' '));
 const effort=hours>0&&hours<=16&&/\b(?:trein\w*|pratic\w*|exercit\w*)\b/u.test(active)&&
  physicalPractice.test(normalize(r.narrative))&&!/\b(?:nao (?:treinou|praticou|comecou)|apenas observou)\b/u.test(normalize(r.narrative));
 return clamp(before+(effort?Math.min(proposed,-Math.min(30,Math.ceil(hours*4))):proposed));
}
