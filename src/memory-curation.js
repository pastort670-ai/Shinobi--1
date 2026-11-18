// Memórias marcantes são marcos da história, não um diário de cada atividade.
// Não apaga memórias que o jogador já confirmou em campanhas antigas.
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const significant=/\b(?:missao.{0,38}(?:conclu|cumpr|finaliz)|(?:conclu|cumpr|finaliz)\w*.{0,38}missao|promovido|graduou|nomeado|aprendeu.{0,36}jutsu|dominou.{0,36}jutsu|tecnica nova|tecnica inedita|salvou|resgatou|protegeu|revelou.{0,25}segredo|descobriu.{0,25}segredo|mudou.{0,25}relacao|reconciliou|rompeu.{0,25}(?:vinculo|relacao)|alianca|vitoria decisiva|decisivo|reconhecimento publico|reconhecid\w* por testemunhas|sacrificou|juramento importante|compromisso duradouro|virada importante|protegido foi salvo|desfecho irreversivel)\b/u;
const subtle=/\b(?:confian[cç]a|lealdade|alian[cç]a|perd[aã]o|reconcilia[cç][aã]o|parentesco|promessa importante|vinculo duradouro|mudan[cç]a permanente|descoberta importante)\b/u;
const routine=/\b(?:voltou ao|retornou ao|conversou|aguardou|esperou|cumprimentou|relatou|apresentou relat[oó]rio|tarefas? burocr[aá]ticas?|recebeu proposta|treinou|praticou|estudou|pesquisou|acordou|dormiu|foi para|chegou ao)\b/u;
const uncertain=/\b(?:pretende|planeja|tentou|poderia|gostaria|ainda n[aã]o|n[aã]o conseguiu|falhou|fracassou)\b/u;
const trivialTitle=/^(?:decisao com consequencias|conquista na jornada|compromisso cumprido|a nova diretriz|memoria marcante)$/u;
const stopped=new Set('o a os as de do da dos das e em um uma ao com por para seu sua seus suas esse essa foi mais sobre como apos depois por fim durante enquanto nova decisao consequencias'.split(' '));
const words=s=>new Set((norm(s).match(/[a-z0-9]{4,}/gu)||[]).filter(w=>!stopped.has(w)));
function duplicate(c,description){
 const incoming=words(description),n=norm(description);
 return (c.memories||[]).filter(m=>m.status==='saved').some(m=>{
  const existing=norm(m.description||'');
  if(n===existing)return true;
  const a=words(existing),overlap=[...incoming].filter(w=>a.has(w)).length;
  const min=Math.min(a.size,incoming.size);
  return min>=3&&overlap/min>=.73;
 });
}
function acceptable(title,description){
 const text=norm(title+' '+description);
 if(description.length<22||uncertain.test(description))return false;
 if(significant.test(text)||subtle.test(text))return true;
 // Uma sugestão da IA com título genérico e rotina sem mudança duradoura não basta.
 return false;
}
export function curateMoment(c,i,r){
 if(!(i.segments||[]).some(x=>String(x.text||'').trim()))return null;
 const options=[];
 const add=(title,description)=>{
  const t=String(title||'').trim().slice(0,100),d=String(description||'').trim().slice(0,350);
  if(!t||!d||!acceptable(t,d)||duplicate(c,d))return;
  options.push({title:trivialTitle.test(norm(t))?'Marco da jornada':t,description:d});
 };
 if(r.moment&&typeof r.moment==='object')add(r.moment.title,r.moment.description);
 for(const effect of r.consequences||[])add('Consequência duradoura',effect.description);
 for(const item of r.development||[])add('Conquista importante',item);
 for(const task of r.pendingTasks||[])if(task.status==='done')add('Objetivo alcançado',task.description);
 for(const rel of r.relations||[])add('Mudança de vínculo com '+String(rel.name||'').slice(0,55),rel.description);
 return options[0]||null;
}
