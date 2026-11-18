// Avaliação transversal de habilidades a partir da campanha real, não de intenções.
// Evidências antigas são consultadas sem reescrever a origem do personagem.
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const negative=/\b(?:nao|nunca|jamais|nao conseguiu|nao treinou|nao estudou|falhou|fracassou|apenas observou|somente observou|pretende|quer treinar|planeja treinar)\b/u;
const subjectVerb=/\b(?:treinou|treina|praticou|pratica|estudou|estuda|executou|executa|realizou|realiza|completou|completa|concluiu|conclui|aperfeicoou|desenvolveu|demonstrou|aprimorou|exercitou|repetiu|correu|corre|escalou|escala|saltou|salta|levantou|levanta|carregou|carrega|resistiu|resiste|desviou|desvia|bloqueou|bloqueia|lutou|luta|utilizou|utiliza|dominou|domina|manteve|mantem|concentrou|concentra|moldou|molda|meditou|medita|persistiu|perseverou|fortaleceu|passou|dedicou-se|dedicava-se|trabalhou|trabalha)\b/u;
const physical=/\b(?:treinamento fisico|treino fisico|taijutsu|corpo a corpo|artes marciais|corrida|correu|corre|escalada|escalou|salto|saltou|flexoes|levantamento de peso|peso|agachamento|luta|combate|exercicios fisicos|resistencia|fôlego|folego)\b/u;
const length=/\b(?:durante varios dias|por varios dias|durante dias|por dias|durante semanas|por uma semana|por horas|durante horas|todos os dias|treinou intensamente|longa sessao|sessao prolongada|exaustivo|treino prolongado|treinamento prolongado|por [2-9] dias|por [2-9] horas|durante [2-9] dias|passou [2-9] dias|durante (?:dois|tres|quatro|cinco|seis|sete|oito|nove|dez) dias|passou (?:dois|tres|quatro|cinco|seis|sete|oito|nove|dez) dias|por (?:dois|tres|quatro|cinco|seis|sete|oito|nove|dez) dias)\b/u;
const matchers={
 ninjutsu:/\b(?:ninjutsu|jutsu|tecnicas? ninja|manipulacao de chakra|moldou chakra|controle de chakra|clonagem|bunshin|rasengan|chakra elemental|natureza elemental)\b/u,
 taijutsu:/\b(?:taijutsu|artes marciais|corpo a corpo|golpes?|socos?|chutes?|postura de combate|movimentos? de luta|combate fisico|luta corporal)\b/u,
 genjutsu:/\b(?:genjutsu|ilusoes? ninja|tecnicas? ilusorias|tecnica de ilusao|manipulacao dos sentidos)\b/u,
 strength:/\b(?:forca fisica|musculos?|muscular|levantamento de peso|levantou pesos?|carregou pesos?|carga pesada|flexoes|agachamentos?|potencia fisica|golpes? fortes?|fortaleceu o corpo|treino de forca)\b/u,
 speed:/\b(?:velocidade|rapidez|agilidade|reflexos?|corrida|correu|sprint|desviou|esquiva|acelerou|movimentacao rapida|deslocamento rapido)\b/u,
 stamina:/\b(?:resistencia|folego|condicionamento|vigor|corrida longa|corrida prolongada|maratona|persistiu|perseverou|treino prolongado|exercicios? de resistencia)\b/u,
 handSeals:/\b(?:selos? de mao|sinais? de mao|sequencia de selos|gestos? de jutsu|mudras?|execucao de selos)\b/u
};
const keys=Object.keys(matchers);
function sources(c){
 const out=[];
 (c.messages||[]).forEach((m,i)=>{if(m?.role==='ai')out.push({text:m.text,day:m.day,source:'narration',id:'msg-'+i});});
 (c.memories||[]).forEach((m,i)=>{if(m?.status==='saved')out.push({text:m.description,day:m.day,source:'saved-memory',id:'mem-'+(m.id||i)});});
 (c.development||[]).forEach((m,i)=>out.push({text:m.text,day:m.day,source:'development',id:'dev-'+i}));
 return out;
}
function isOwnAction(clause,name,source){
 const actor=norm(name).split(/\s+/u)[0].replace(/[^a-z0-9]/g,'');
 if(!actor)return false;
 // O motor registra sua própria prática como conquista persistente.
 if(source==='development'&&/^pratica de (?:taijutsu|ninjutsu|genjutsu) reconhecida apos treinamento concluido/u.test(clause))return true;
 const player=new RegExp('(?:^|[^a-z0-9])(?:'+actor+'|voce|o protagonista|a protagonista|seu personagem|sua personagem)\\b','u');
 const m=clause.match(player);
 if(!m||!subjectVerb.test(clause.slice(m.index+m[0].length)))return false;
 const prior=clause.slice(0,m.index);
 // Não transformar "Hiruzen treinou enquanto Kaien observava" em treino de Kaien.
 if(/\b(?:hiruzen|kakashi|iruka|asuma|sensei|mestre|instrutor|outro ninja)\s+(?:\w+\s+){0,3}(?:treinou|praticou|demonstrou|estudou|executou)\b/u.test(prior))return false;
 return true;
}
export function assessAttributeEvidence(c){
 const data=Object.fromEntries(keys.map(k=>[k,[]]));
 const seen=new Set(),name=c.character?.name||'';
 for(const source of sources(c)){
  const body=String(source.text||'').slice(0,5000);
  const clauses=body.split(/[.!?;\n]+/u).map(norm).filter(Boolean);
  for(const clause of clauses){
   if(negative.test(clause)||!isOwnAction(clause,name,source.source))continue;
   const prolonged=length.test(clause);
   for(const key of keys){
    const match=matchers[key].test(clause)||
     key==='stamina'&&prolonged&&physical.test(clause)||
     key==='strength'&&prolonged&&/\b(?:taijutsu|treino fisico|treinamento fisico|luta corporal|artes marciais|flexoes|agachamentos|escalada|escalou)\b/u.test(clause)||
     key==='speed'&&prolonged&&/\b(?:taijutsu|treino de combate|exercicios de esquiva|esquiva)\b/u.test(clause);
    if(!match)continue;
    const day=Number.isInteger(source.day)?source.day:Math.max(0,c.day||0);
    const compact=clause.replace(/\b(?:kaien|akira|o|a|os|as|um|uma|de|do|da|em|com|por|para)\b/g,'').trim().slice(0,95);
    const fingerprint=key+':'+day+':'+compact;
    if(seen.has(fingerprint))continue;
    seen.add(fingerprint);
    data[key].push({day,source:source.source,evidence:clause.slice(0,220),prolonged});
   }
  }
 }
 const stats={};
 for(const key of keys){
  const items=data[key],days=new Set(items.map(x=>x.day)).size;
  const long=items.filter(x=>x.prolonged).length;
  // A mesma atividade repetida no mesmo dia não concede evolução ilimitada.
  const evidenceCount=Math.max(days,Math.min(items.length,days+1));
  const weight=evidenceCount+Math.min(2,long);
  const rating=weight?Math.min(3.5,Math.round((.5+.33*weight)*2)/2):null;
  stats[key]={rating,records:items.length,days,extendedSessions:long,examples:items.slice(-3).map(x=>x.evidence)};
 }
 return stats;
}
