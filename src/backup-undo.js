// As listas são quase sempre prefixos do estado atual. Só gravamos os itens
// diferentes para incluir pontos de retorno sem duplicar a campanha inteira.
const historyFields=['messages','facts','timeline','development'];
export const maxBackupBytes=8_000_000;
export const checkpointLimit=50;
const undoBudget=2_000_000;

export function packUndo(campaign,rows){
 const reference=Object.fromEntries(historyFields.map(key=>[key,(campaign[key]||[]).map(value=>JSON.stringify(value))]));
 const checkpoints=[];
 let bytes=0,scanned=0;
 for(const {message_index:index,state} of rows){
  scanned+=Buffer.byteLength(state);
  if(scanned>48_000_000)break;
  const {id,revision,...saved}=JSON.parse(state);
  if(id!==campaign.id||campaign.messages[index]?.role!=='user'||saved.messages?.length!==index)continue;
  const lists={};
  for(const key of historyFields){
   const items=saved[key]||[];
   lists[key]={length:items.length,changed:items.flatMap((item,n)=>JSON.stringify(item)===reference[key][n]?[]:[[n,item]])};
   delete saved[key];
  }
  const entry={index,state:saved,lists};
  bytes+=Buffer.byteLength(JSON.stringify(entry));
  if(bytes>undoBudget)break;
  checkpoints.push(entry);
 }
 return checkpoints;
}

export function unpackUndo(entries,source,campaign,readInput){
 if(entries===undefined)return [];
 if(!Array.isArray(entries)||entries.length>checkpointLimit)throw new Error('Número inválido de pontos de retorno.');
 const seen=new Set();
 const result=[];
 let expandedBytes=0;
 for(const entry of entries){
  const {index,state,lists}=entry||{};
  if(!Number.isInteger(index)||index<1||source.messages[index]?.role!=='user'||seen.has(index)||
   typeof state!=='object'||!state||Array.isArray(state)||!lists||lists.messages?.length!==index||
   !Number.isInteger(state.day)||state.day<0||state.day>campaign.day||
   ![state.energy,state.chakra,state.progress?.taijutsu,state.progress?.ninjutsu,state.progress?.genjutsu]
    .every(value=>Number.isInteger(value)&&value>=0&&value<=100))throw new Error('Ponto de retorno inválido.');
  const histories={};
  for(const key of historyFields){
   const list=lists[key];
   const original=source[key];
   if(!list||!Number.isInteger(list.length)||list.length<0||list.length>20000||
     !Array.isArray(list.changed)||list.changed.length>list.length)throw new Error('Lista inválida no ponto de retorno.');
   const rebuilt=original.slice(0,list.length);
   const positions=new Set();
   for(const pair of list.changed){
    if(!Array.isArray(pair)||pair.length!==2||!Number.isInteger(pair[0])||pair[0]<0||pair[0]>=list.length||
      positions.has(pair[0])||!pair[1]||typeof pair[1]!=='object')throw new Error('Diferença inválida no ponto de retorno.');
    positions.add(pair[0]);
    rebuilt[pair[0]]=pair[1];
   }
   if(rebuilt.length!==list.length||Array.from(rebuilt).some(item=>!item||typeof item!=='object'))throw new Error('Lista incompleta no ponto de retorno.');
   if(key==='messages'&&rebuilt.some((item,n)=>item.role!==source.messages[n]?.role||item.text!==source.messages[n]?.text))
    throw new Error('Turnos incompatíveis com o ponto de retorno.');
   histories[key]=rebuilt;
  }
  const snapshot={...state,...histories,id:campaign.id,character:campaign.character,locked:true,revision:0,
   lastInput:readInput(state.lastInput),regenerationHistory:[]};
  const json=JSON.stringify(snapshot);
  expandedBytes+=Buffer.byteLength(json);
  if(expandedBytes>48_000_000)break;
  result.push({index,json});
  seen.add(index);
 }
 return result;
}
