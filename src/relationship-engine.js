// Vínculos importantes ≠ pessoas e grupos apenas encontrados.
// As relações já existentes são lidas de maneira compatível; contatos casuais
// permanecem no histórico do mundo, sem lotar a ficha do protagonista.
const norm=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[\u2018\u2019'".,:;!?()[\]]/g,' ').replace(/\s+/g,' ').trim();
const groups=/\b(?:guarnicao|patrulha|guarda(?:s)?|soldados?|tropas?|esquadrao|equipe|time|pelotao|batalhao|multidao|inimigos?|adversarios?|oponentes?|mercenarios?|bandidos?|aldeoes|moradores|clientes|visitantes|comerciantes|vendedores|lojistas)\b/u;
const roles=/\b(?:comerciante|vendedor|lojista|mercador|dono|dona|proprietario|proprietaria|atendente)\b/u;
const place=/\b(?:loja|mercado|banca|estabelecimento|oficina|restaurante|taverna|armazem|farmacia|livraria)\b/u;
const significant=/\b(?:pai|mae|filho|filha|irmao|irma|adotiv\w*|familia|mestre|mentor|sensei|tutor|amigo|amizade|aliad\w*|companheir\w*|rival|rivalidade|namor\w*|parceir\w*|confia|confiou|confianca|respeita|respeitou|respeito|admira|admiracao|lealdade|vinculo|afet\w*|protegido|protetor|protecao|traicao|traiu|odeia|odio|inimigo jurado|jurou vinganca|promessa duradoura|relacao duradoura|compromisso permanente)\b/u;
const mundane=/\b(?:comprou|vendeu|pagou|loja|mercadoria|atendimento|recebeu pagamento|vigiou|patrulhou|passou por|entrou na|visitou|ficou presente|observou|encontrou|enfrentou|combateu|conversou|cumprimentou|chegou|retornou|compras)\b/u;
const surnameWords=new Set('sr sra senhor senhora mestre sensei hokage terceiro terceiro-hokage jovem velho dona doutor dr'.split(' '));
const ignored=new Set('o a os as do da dos das de em no na ao um uma'.split(' '));
const KEY_LIMIT=22;
const safeName=x=>String(x||'').trim().replace(/\s+/g,' ').slice(0,100);
function components(name){
 return norm(name).split(' ').filter(t=>t&&!surnameWords.has(t)&&!ignored.has(t));
}
function shopAnchor(name,description=''){
 const t=norm(name+' '+description);
 const m=t.match(/\b(loja|banca|oficina|restaurante|taverna|livraria|farmacia|armazem)\s+(?:de|do|da|dos|das)\s+([a-z0-9-]+)/u);
 return m?m[1]+' '+m[2]:null;
}
function aliasMatch(a,b,aDesc='',bDesc=''){
 const x=components(a),y=components(b),one=x.join(' '),two=y.join(' ');
 if(!one||!two)return false;
 if(one===two)return true;
 const ax=norm(a),by=norm(b);
 const genericA=roles.test(ax),genericB=roles.test(by);
 // Shopkeeper role alone cannot identify shopkeepers in two different stores.
 if(genericA||genericB){
  const locA=shopAnchor(a,aDesc),locB=shopAnchor(b,bDesc);
  return Boolean(locA&&locB&&locA===locB);
 }
 // Distinct full personal names are never merged by job or location.
 if(x.length>=2&&y.length>=2&&x[0]!==y[0])return false;
 if(x.length>=2&&y.length>=2&&x[0]===y[0]&&x.at(-1)!==y.at(-1))return false;
 // Short name is an alias of a full name only when it has a distinctive first token.
 return x[0]===y[0]&&x[0].length>=3;
}
export function isGroupNpc(name){return isGroup(name);}
function isGroup(name){
 const s=norm(name);
 if(!s)return true;
 if(/^(?:guarnicao|patrulha|guardas?|tropas?|soldados?|grupo|equipe|esquadrao|inimigos?|adversarios?|oponentes?|comerciantes?|vendedores?|lojistas?|moradores|aldeoes)(?:\s|$)/u.test(s)){
  return !roles.test(s)||/\b(?:comerciantes|vendedores|lojistas)\b/u.test(s);
 }
 return false;
}
function isGenericContact(name){
 const s=norm(name);
 return /^(?:o |a )?(?:comerciante|vendedor|lojista|mercador|atendente|dono|dona)(?:\s|$)/u.test(s)||/^(?:o |a )?(?:homem|mulher|garoto|garota|crianca|ninja|guarda|guarnicao)\b/u.test(s);
}
function originLink(c,name){
 const history=norm([c.character?.history,c.character?.personality].join(' '));
 const first=components(name)[0];
 return Boolean(first&&history.includes(first)&&/\b(?:adotad\w*|familia|pai|mae|mentor|mestre|treinad\w*|criad\w*|irmao|irma)\b/u.test(history));
}
function meaningful(c,name,description){
 if(!name||isGroup(name)||isGenericContact(name))return false;
 const d=norm(description);
 if(originLink(c,name))return true;
 // Avoid unrelated single encounters despite dramatic adjectives.
 return significant.test(d)||(
  /\b(?:salvou a vida|passou a confiar|declarou amizade|tornou-se aliado|rompeu relacao)\b/u.test(d)
 );
}
export function canonicalNpcName(name,known=[],descriptions={}){
 const incoming=safeName(name);
 if(!incoming)return '';
 for(const current of known){
  if(aliasMatch(incoming,current,descriptions[incoming]||'',descriptions[current]||''))return current;
 }
 return incoming;
}
function relationEntries(c){
 const obj=c.relations&&typeof c.relations==='object'&&!Array.isArray(c.relations)?c.relations:{};
 const result={};
 for(const [name,description] of Object.entries(obj)){
  if(!meaningful(c,name,description))continue;
  const canonical=canonicalNpcName(name,Object.keys(result),{...obj,...result});
  if(!Object.hasOwn(result,canonical)||String(description).length>String(result[canonical]).length)result[canonical]=String(description);
 }
 return result;
}
export function visibleRelationships(c){
 const entries=relationEntries(c);
 const order=Object.entries(entries).sort((a,b)=>
  Number(originLink(c,b[0]))-Number(originLink(c,a[0]))||
  Number(significant.test(norm(b[1])))-Number(significant.test(norm(a[1])))||
  a[0].localeCompare(b[0])
 );
 return Object.fromEntries(order.slice(0,KEY_LIMIT));
}
export function commitRelationships(c,proposed=[]){
 const raw=c.relations&&typeof c.relations==='object'&&!Array.isArray(c.relations)?c.relations:{};
 const all={...raw};
 const known=[...Object.keys(all),...Object.keys(c.npcAgents||{}),...Object.keys(c.npcKnowledge||{})];
 for(const p of proposed){
  const name=safeName(p?.name),description=String(p?.description||'').trim().slice(0,300);
  if(!name||!description||isGroup(name))continue;
  const canonical=canonicalNpcName(name,known,{...all,[name]:description});
  // A visit to a merchant never becomes a relationship by itself.
  if(!meaningful(c,canonical,description))continue;
  all[canonical]=description;
  if(!known.includes(canonical))known.push(canonical);
 }
 const simplified=visibleRelationships({...c,relations:all});
 // Keep unselected legacy relationships as hidden backup rather than deleting their history.
 const archive={...(c.relationArchive||{})};
 for(const [name,desc] of Object.entries(all))if(!Object.hasOwn(simplified,name))archive[name]=desc;
 c.relations=simplified;
 c.relationArchive=Object.fromEntries(Object.entries(archive).slice(-160));
 return c;
}
export function consolidateNpcRecords(c){
 const agents=c.npcAgents&&typeof c.npcAgents==='object'&&!Array.isArray(c.npcAgents)?c.npcAgents:{};
 const knowledge=c.npcKnowledge&&typeof c.npcKnowledge==='object'&&!Array.isArray(c.npcKnowledge)?c.npcKnowledge:{};
 const known=Object.keys(c.relations||{});
 const result={},renames={};
 const desc=Object.fromEntries(Object.entries(agents).map(([name,x])=>[name,x.relationship||'']));
 for(const [name,agent] of Object.entries(agents)){
  if(isGroup(name))continue;
  const canonical=canonicalNpcName(name,[...known,...Object.keys(result)],desc);
  renames[name]=canonical;
  const old=result[canonical];
  if(!old)result[canonical]={...agent,name:canonical};
  else result[canonical]={
    ...old,name:canonical,
    knowledge:[...new Set([...(old.knowledge||[]),...(agent.knowledge||[])])].slice(-12),
    goals:[...new Map([...(old.goals||[]),...(agent.goals||[])].map(g=>[g.description,g])).values()].slice(-4),
    relationship:(agent.relationship||'').length>(old.relationship||'').length?agent.relationship:old.relationship,
    lastObservedDay:Math.max(old.lastObservedDay||0,agent.lastObservedDay||0)
  };
 }
 const know={};
 for(const [name,list] of Object.entries(knowledge)){
  const canonical=renames[name]||canonicalNpcName(name,[...known,...Object.keys(result),...Object.keys(know)],desc);
  if(!canonical)continue;
  know[canonical]=[...new Set([...(know[canonical]||[]),...(Array.isArray(list)?list:[])])].slice(-20);
 }
 c.npcAgents=Object.fromEntries(Object.entries(result).sort((a,b)=>(b[1].lastObservedDay||0)-(a[1].lastObservedDay||0)).slice(0,24));
 c.npcKnowledge=Object.fromEntries(Object.entries(know).slice(-70));
 return c;
}
export function npcContinuity(c,i){
 const input=(i.segments||[]).map(x=>String(x.text||'')).join(' ');
 const query=norm(input);
 const shopVisit=place.test(query)||/\b(?:comerciante|vendedor|lojista|mercador|compras?)\b/u.test(query);
 if(!shopVisit)return null;
 const recent=(c.messages||[]).filter(x=>x.role==='ai'&&typeof x.text==='string');
 const references=recent.map((m,index)=>({text:m.text,day:m.day,index})).filter(m=>
  /\b(?:loja|comerciante|vendedor|lojista|mercador|atendente|balcao|mercado|banca|oficina)\b/u.test(norm(m.text))
 );
 const queryWords=new Set(query.split(' ').filter(t=>t.length>4&&!ignored.has(t)&&!roles.test(t)));
 const ranked=references.map(m=>{
  const words=norm(m.text).split(/\s+/);
  const overlap=words.filter(w=>queryWords.has(w)).length;
  const profile=Array.isArray(words)?words.length:0;
  return {...m,score:overlap+Math.min(1,profile/1000)};
 }).sort((a,b)=>b.score-a.score||b.index-a.index).slice(0,5);
 if(!ranked.length)return null;
 const knownNamePattern=/\b(?:comerciante|lojista|vendedor|mercador|atendente)(?:\s+(?:chamado|de nome))?\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ][\p{L}-]{2,})/gu;
 const names=[...new Set(ranked.flatMap(m=>[...String(m.text).matchAll(knownNamePattern)].map(hit=>hit[1])).filter(name=>!/^(?:Um|Uma|Ele|Ela|Esse|Essa|Daquele|Outro|O|A)$/.test(name)))].slice(0,8);
 const previousNPCs=Object.entries(c.npcAgents||{}).filter(([name,a])=>
   names.includes(name)||roles.test(norm(name+' '+(a.relationship||'')+' '+(a.knowledge||[]).join(' ')))||place.test(norm(name+' '+(a.relationship||'')+' '+(a.knowledge||[]).join(' ')))
 ).slice(-10).map(([name,a])=>({name,relationship:a.relationship||'',knownFacts:(a.knowledge||[]).slice(-3)}));
 return {visitedPreviously:true,priorScenes:ranked.map(m=>({day:m.day,text:m.text.slice(0,620)})),
  establishedMerchantNames:names,previousNPCs,
  rule:'Ao revisitar uma loja, retome o comerciante ou responsável que já apareceu no histórico, utilizando o mesmo nome, aparência e lembranças. Se houver nome em establishedMerchantNames, preserve-o como identidade. Não invente outra pessoa para o MESMO funcionário sem um motivo narrado (troca de turno, novo empregado, mudança de proprietário). Pessoas distintas na mesma loja podem coexistir: não as funda automaticamente. Não transforme uma compra em vínculo importante.'};
}
export const relationshipPolicy='A aba Relações mostra apenas indivíduos com vínculo significativo e duradouro: família, mentores, amizades, aliados relevantes ou rivalidades pessoais contínuas. Simples presença, inimigos ocasionais, guardas, guarnições, comerciantes em transações e grupos sem vínculo pessoal NÃO são relações. Os personagens incidentais continuam a existir na memória do mundo, mas não ocupam a ficha. Use o mesmo nome/identidade de um NPC quando ele reaparecer; consulte npcContinuity ao revisitar lojas e locais. Reações novas alteram relações já estabelecidas, não criam uma pessoa diferente.';
