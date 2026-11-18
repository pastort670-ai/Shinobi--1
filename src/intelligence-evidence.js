// Avaliação retrospectiva da Inteligência, a partir de eventos aceitos.
// Não aceita declarações isoladas do jogador nem atribui feitos de NPCs ao protagonista.
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const cl=s=>norm(s).replace(/\s+/g,' ').trim();
const studyVerb=/\b(?:estudou|estuda|estudava|leu|lendo|pesquisou|pesquisa|investigou|investiga|aprendeu|aprendia|analisou|analisa|examinou|examina|memorizou|memorizava|revisou|revisa|compreendeu|compreende|praticou|treinou|dedicou-se)\b/u;
const studyTopic=/\b(?:teoria|teorico|teoricos|teorica|teoricas|livro|livros|leitura|manuais?|pergaminhos?|biblioteca|taticas?|estrategias?|historias?|geografia|matematica|logica|academia|aulas?|jutsus?|chakras?|selos?|conhecimento|pesquisa|mapas?|planos?|combate|tecnicas?|fundamentos|aplicacoes)\b/u;
const planVerb=/\b(?:elaborou|planejou|tracou|antecipou|deduziu|decifrou|calculou|identificou|percebeu|analisou|criou|formulou|executou|aplicou|adaptou|organizou|preparou|concebeu|desenvolveu|usou|montou)\b/u;
const tacticTopic=/\b(?:plano|estrategia|estrategico|taticas?|armadilha|isca|flanco|flanqueamento|cobertura|distracao|terreno|posicionamento|emboscada|ponto fraco|vantagem|brecha|movimentos?|rotas?|defesas?|adversario|oponente|inimigos?|ataque|formacao)\b/u;
const tacticalResult=/\b(?:funcionou|teve efeito|deu certo|conseguiu|permitiu|assegurou|evitou|superou|enganou|neutralizou|protegeu|escapou|abriu uma brecha|obteve vantagem|ganhou vantagem|cumpriu|venceu|resultado positivo|foi eficaz)\b/u;
const neg=/\b(?:nao|nunca|jamais|sem conseguir|nao conseguiu|falhou|fracassou|tentou|tentaria|pretende|planeja estudar|quer estudar|precisa estudar|ainda nao|apenas observou)\b/u;
const hardNeg=/\b(?:nao|nunca|jamais|falhou|fracassou|nao conseguiu|sem sucesso|ainda nao)\b/u;
const closeDays=(a,b)=>Math.abs(a-b)<=1;

function protagonistAction(text,name,verbs){
 const parts=text.split(/(?<=[.!?;])\s+|\n+/u).map(s=>cl(s)).filter(Boolean);
 const first=cl(name).split(/\s+/u)[0];
 if(!first)return [];
 const quoted=first.replace(/[^a-z0-9]/g,'');
 const actor=new RegExp('(?:^|[^a-z0-9])(?:'+quoted+'|voce|o protagonista|a protagonista|seu personagem|sua personagem)\\b','u');
 return parts.filter(p=>{
  if(neg.test(p)||!verbs.test(p)||!actor.test(p))return false;
  const actorAt=p.search(actor),v=p.match(verbs);
  // Sucesso atribuído a Hiruzen e Kaien apenas observando não vira conquista de Kaien.
  const earlier=p.slice(0,actorAt);
  if(/\b(?:hiruzen|kakashi|iruka|asuma|orochimaru|sensei|mestre|instrutor)\s+(?:\w+\s+){0,3}(?:estudou|treinou|planejou|elaborou|calculou|analisou|executou|aplicou)\b/u.test(earlier))return false;
  return p.slice(actorAt).search(verbs)>=0;
 });
}
function candidates(c){
 const list=[];
 const push=(text,day,kind,id)=>{
  if(typeof text!=='string'||!text.trim())return;
  list.push({text:text.slice(0,4000),day:Number.isInteger(day)?day:c.day||0,kind,id});
 };
 (c.messages||[]).forEach((m,i)=>{if(m?.role==='ai')push(m.text,m.day,'narration','msg-'+i);});
 (c.memories||[]).forEach((m,i)=>{if(m?.status==='saved')push(m.description,m.day,'memory','mem-'+(m.id||i));});
 (c.development||[]).forEach((d,i)=>push(d.text,d.day,'development','dev-'+i));
 return list;
}
export function assessHistoricalIntelligence(c){
 const name=c.character?.name||'';
 let study=[],tactics=[],successful=[];
 for(const item of candidates(c)){
  for(const clause of protagonistAction(item.text,name,/(?:estudou|estuda|estudava|leu|lendo|pesquisou|pesquisa|investigou|investiga|aprendeu|aprendia|analisou|analisa|examinou|examina|memorizou|memorizava|revisou|revisa|compreendeu|compreende|praticou|treinou|dedicou-se|elaborou|planejou|tracou|antecipou|deduziu|decifrou|calculou|identificou|percebeu|criou|formulou|executou|aplicou|adaptou|organizou|preparou|concebeu|desenvolveu|usou|montou)\b/u)){
   const isStudy=studyVerb.test(clause)&&studyTopic.test(clause);
   const isTactic=planVerb.test(clause)&&tacticTopic.test(clause);
   if(isStudy)study.push({...item,clause});
   if(isTactic)tactics.push({...item,clause});
   if(isTactic&&!hardNeg.test(clause)&&tacticalResult.test(clause))successful.push({...item,clause});
  }
 }
 const distinct=(items)=>{
  const output=[];
  for(const item of items){
   const compact=item.clause.replace(/\b(?:o|a|de|do|da|para|com|e|em|um|uma|seu|sua)\b/g,'').replace(/\s+/g,' ');
   // Duplicatas no mesmo dia de fontes distintas não devem inflar a nota.
   if(output.some(x=>closeDays(x.day,item.day)&&(x.clause===item.clause||x.clause.includes(compact.slice(0,30))||compact.includes(x.clause.slice(0,30)))))continue;
   output.push(item);
  }
  return output.slice(-40);
 };
 study=distinct(study);tactics=distinct(tactics);successful=distinct(successful);
 const studyCount=study.length,tacticCount=tactics.length,successCount=successful.length;
 // Atribuição conservadora: prova de estudo já permite avaliação básica;
 // aplicação estratégica e prática repetida refinam a nota.
 let rating=null;
 if(studyCount||tacticCount){
  const weight=Math.min(5,studyCount)+Math.min(4,tacticCount)*1.25+Math.min(3,successCount)*.75;
  rating=Math.min(3.5,Math.max(.5,Math.round((1+.34*weight)*2)/2));
 }
 return {rating,studyCount,tacticCount,successCount,sourceCount:studyCount+tacticCount,policy:'Apenas estudos e estratégias confirmados nas narrações, desenvolvimento ou memórias salvas; não avalia apenas intenções.'};
}
