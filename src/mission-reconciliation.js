// Reconcilia missões a partir das narrativas ACEITAS.
// Campos opcionais do Gemini ajudam, mas não são a única forma de registrar.
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const ranks=new Set(['D','C','B','A','S','?']);
const completionVerbs='concluida|concluidas|concluido|concluidos|cumprida|cumpridas|cumprido|cumpridos|finalizada|finalizadas|finalizado|finalizados|completada|completadas|completado|completados|encerrada|encerradas|encerrado|encerrados|terminada|terminadas|terminado|terminados';
const completedActs='concluiu|concluiram|cumpriu|cumpriram|finalizou|finalizaram|completou|completaram|encerrou|encerraram|terminou|terminaram';
const finish=new RegExp('\\bmissao\\b.{0,95}\\b(?:'+completionVerbs+')\\b|\\b(?:'+completedActs+')\\b.{0,90}\\bmissao\\b','u');
const otherFinish=new RegExp('\\b(?:'+completedActs+')\\b.{0,65}\\b(?:objetivo|tarefa|encargo)\\b|\\b(?:objetivo|tarefa)\\b.{0,65}\\b(?:atingido|cumprido|concluido)\\b','u');
const rejection=/\b(?:nao|nunca|jamais|ainda nao|sem sucesso|fracassou|falhou|nao conseguiu)\b.{0,80}\b(?:missao|objetivo|tarefa|conclu\w*|cumpr\w*|termin\w*|finaliz\w*|complet\w*)\b|\bmissao\b.{0,45}\b(?:nao|nunca|ainda nao|sem sucesso)\b/u;
const future=/\b(?:pretende|pretendia|quer|planeja|poderia|tenta|tentara|devera|sera|vai|quando|antes de|espera)\b.{0,35}\b(?:conclu\w*|cumpr\w*|termin\w*|finaliz\w*|complet\w*)\b/u;
const assignments=/\b(?:receb\w*|aceit\w*|designad\w*|encarreg\w*|atribu\w*|convocad\w*|designou|entregou|inici\w*|comec\w*|parti\w*|missao\s+(?:de\s+)?(?:rank|classe|nivel|categoria))\b/u;
const sliceSentences=text=>norm(text).split(/(?<=[.!?])\s+|\n+|[;]+/u).map(v=>v.trim()).filter(Boolean).slice(0,65);
const rankOf=text=>{
 const s=norm(text);
 const patterns=[
  /\bmissao\b.{0,40}?\b(?:de\s+)?(?:rank|classe|categoria|nivel)\s*[:\-]?\s*([dcbas])\b/u,
  /\b(?:rank|classe|nivel|categoria)\s*[:\-]?\s*([dcbas])\b.{0,32}\bmissao\b/u,
  /\bmissao\s+(?:de\s+)?([dcbs])\b/u,
  /\bmissao\b.{0,28}\bclassificad[ao]\s+como\s+([dcbas])\b/u
 ];
 for(const p of patterns){const m=s.match(p);if(m)return m[1].toUpperCase();}
 return null;
};
const actors={team:/\b(?:equipe|time|grupo|esquadrao|todos|nos|voces|voc[eê]s)\b/u};
function otherActor(text,first){
 const s=norm(text);
 // When the text explicitly says someone else accomplished the mission, don't credit the player.
 const named=s.match(new RegExp('\\b([a-z][a-z-]+)\\s+(?:'+completedActs+')\\s+(?:a\\s+|uma\\s+)?missao\\b','u'));
 if(named&&!['equipe','time','grupo','todos','voces'].includes(named[1])&&named[1]!==first)return true;
 const by=s.match(/\bmissao\b.{0,70}\b(?:concluida|cumprida|finalizada|completada)\s+por\s+([a-z][a-z-]+)\b/u);
 if(by&&by[1]!==first&&!['nos','voces'].includes(by[1]))return true;
 return false;
}
function playerLinked(s,first,hasAssignment){
 const name=first&&new RegExp('(?:^|[^a-z0-9])'+first+'(?:[^a-z0-9]|$)','u').test(s);
 const direct=name&&new RegExp('\\b'+first+'\\b.{0,60}\\b(?:'+completedActs+')\\b|\\b(?:'+completedActs+')\\b.{0,60}\\b'+first+'\\b','u').test(s);
 if(direct||/\b(?:voce|voces|seu grupo|sua equipe|seu time|o protagonista|a protagonista)\b/u.test(s))return true;
 return hasAssignment&&(name||actors.team.test(s)||/\bmissao\b/u.test(s));
}
function complete(s,first,active,scene,lastPlayer){
 if(rejection.test(s)||future.test(s)||otherActor(s,first))return false;
 const remoteNews=/\b(?:noticias|noticia|rumor|soube|ouviu|informaram|outro pais|outra vila|distante)\b/u.test(scene);
 if(finish.test(s)){
  if(playerLinked(s,first,Boolean(active)))return true;
  // Passive announcements without actor need a player connection, not merely a rank.
  const sceneReferencesPlayer=first&&new RegExp('(?:^|[^a-z0-9])'+first+'(?:[^a-z0-9]|$)','u').test(scene);
  const playerPerformedTask=/\b(?:missao|relatorio|objetivo|entreg\w*|conclu\w*|cumpr\w*|finaliz\w*|termin\w*)\b/u.test(lastPlayer);
  return Boolean(rankOf(s)&&(sceneReferencesPlayer||playerPerformedTask)&&!remoteNews);
 }
 // Only an established, still-active mission may finish via "objetivo cumprido".
 if(active&&otherFinish.test(s))return playerLinked(s,first,true);
 return false;
}

// Memórias Marcantes são acontecimentos da campanha confirmados pelo jogador.
// Elas sobrevivem à compactação do histórico narrativo e são fontes válidas para a ficha.
const nounCompletion=/\b(?:conclusao|finalizacao|cumprimento)\b.{0,95}\bmissao\b|\bmissao\b.{0,95}\b(?:conclusao|finalizacao|cumprimento)\b/u;
const missionOrdinals=/\b(?:primeir[ao]|segund[ao]|terceir[ao]|quart[ao]|quint[ao])\s+(?:missao|designacao)\b/u;
const stopMissionWords=new Set('a o as os de da do das dos em no na nos nas com por para sua seu primeira segunda terceir terceira missao rank classe nivel categoria oficial sucesso retornou reporte reportar relatou concluiu concluiu cumprimento cumprida concluida finalizada hokage konoha personagem ate apos quando recebeu ficou muito mais ja nesta naquela durante nova'.split(' '));

function distinctiveWords(summary,first){
 return new Set((norm(summary).match(/\b[a-z]{5,}\b/gu)||[]).filter(word=>!stopMissionWords.has(word)&&word!==first));
}
function sameMission(existing,incoming,first){
 const distance=Math.abs((existing.day||0)-(incoming.day||0));
 if(distance>7)return false;
 const oldText=norm(existing.summary),newText=norm(incoming.summary);
 const oldOrdinal=oldText.match(missionOrdinals)?.[0],newOrdinal=newText.match(missionOrdinals)?.[0];
 if(oldOrdinal&&newOrdinal&&oldOrdinal!==newOrdinal)return false;
 const oldWords=distinctiveWords(oldText,first),newWords=distinctiveWords(newText,first);
 const overlap=[...newWords].some(word=>oldWords.has(word));
 if(oldOrdinal&&newOrdinal&&oldOrdinal===newOrdinal)return true;
 if(overlap)return true;
 return distance<=1&&!/\b(?:outra|segunda|terceira|nova)\s+missao\b/u.test(newText);
}

function savedMissionRecords(c,first,already){
 const memories=Array.isArray(c.memories)?c.memories:[];
 const records=[...already];
 const seen=new Set();
 for(const m of memories){
  if(m?.status!=='saved'||typeof m.description!=='string')continue;
  const description=m.description.trim(),text=norm([m.title,description].filter(Boolean).join('. '));
  if(!/\bmissao\b/u.test(text)||!(finish.test(text)||nounCompletion.test(text))||rejection.test(text)||future.test(text)||otherActor(text,first))continue;
  // Requer que o desfecho confirmado se refira ao protagonista, não a terceiros.
  const direct=playerLinked(norm(description),first,false);
  const indirect=first&&new RegExp('\\b'+first+'\\b.{0,105}\\b(?:conclusao|cumprimento|finalizacao)\\b.{0,85}\\bmissao\\b','u').test(norm(description));
  if(!direct&&!indirect)continue;
  const rank=rankOf(text)||'?';
  const day=Number.isInteger(m.day)?m.day:c.day||0;
  const memoryId=typeof m.id==='string'?m.id:null;
  const memoryKey=memoryId||norm(description).slice(0,180);
  if(seen.has(memoryKey))continue;
  seen.add(memoryKey);
  const candidate={rank,summary:description.slice(0,180),day,source:'saved-memory',memoryId,memoryKey};
  const match=records.findIndex(item=>
    (item.rank===rank||item.rank==='?'||rank==='?')&&sameMission(item,candidate,first)
  );
  if(match>=0){
   // Memória pode dar o rank correto a uma conclusão antes registrada sem rank.
   if(records[match].rank==='?'&&rank!=='?')records[match]=candidate;
  }else records.push(candidate);
 }
 return records.sort((a,b)=>(a.day||0)-(b.day||0)||(a.messageIndex??Number.MAX_SAFE_INTEGER)-(b.messageIndex??Number.MAX_SAFE_INTEGER)).slice(-200);
}

/** Reconstruct an idempotent mission ledger from accepted AI scenes, never player claims alone.
 *  Records with messageIndex are stable for checkpoints and rewind.
 */
export function reconciledMissions(c,stored=[]){
 const messages=Array.isArray(c.messages)?c.messages:[];
 const out=Array.isArray(stored)?stored.filter(m=>m&&ranks.has(m.rank)&&Number.isInteger(m.messageIndex)&&m.messageIndex>=0&&m.messageIndex<messages.length&&messages[m.messageIndex]?.role==='ai').map(m=>({...m})):[];
 const seen=new Set(out.map(m=>m.messageIndex));
 const first=norm(c.character?.name).split(/\s+/)[0].replace(/[^a-z0-9]/g,'');
 let active=null,lastCompletion=null;
 // Scan all accepted scene messages, so an uncounted recent mission is visible immediately
 // after the update, even before another player turn. Messages from rewound scenes are absent.
 for(let index=0;index<messages.length;index++){
  const message=messages[index];
  if(message?.role!=='ai'||typeof message.text!=='string')continue;
  const parts=sliceSentences(message.text);
  const ranked=rankOf(message.text);
  if(ranked&&parts.some(s=>assignments.test(s)&&!finish.test(s)&&!otherActor(s,first))){
   active={rank:ranked,source:index,opened:index};
  }
  const preceding=norm(messages[index-1]?.role==='user'?messages[index-1].text:'');
  const match=parts.find(s=>complete(s,first,active,norm(message.text),preceding));
  if(!match)continue;
  const explicit=rankOf(match);
  const rank=explicit||active?.rank||ranked||'?';
  if(!ranks.has(rank))continue;
  // Do not count repeated victory announcements for the same mission.
  const assignment=active?.rank===rank?active.source:null;
  const repeated=lastCompletion?.rank===rank&&(
   (assignment!==null&&lastCompletion.assignment===assignment)||
   (assignment===null&&index-lastCompletion.index<=4)
  );
  if(!seen.has(index)&&!repeated){
   out.push({rank,summary:message.text.replace(/\s+/g,' ').slice(0,180),day:Number.isInteger(message.day)?message.day:c.day||0,messageIndex:index,source:'accepted-narration'});
   seen.add(index);
  }
  lastCompletion={rank,index,assignment};
  active=null;
 }
 return savedMissionRecords(c,first,out.sort((a,b)=>a.messageIndex-b.messageIndex).slice(-200));
}
