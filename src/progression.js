// Recupera conquistas antigas de fontes aceitas, sem confiar em tentativas do jogador.
// A origem do personagem fica intocada; only dynamic profile and jutsu repertoire evolve.
const normalize=s=>String(s||'').normalize('NFC').toLocaleLowerCase('pt-BR');
const clauses=s=>String(s||'').split(/[.!?\n;]+/).map(x=>x.trim()).filter(Boolean);
const negative=/\b(?:não|nunca|jamais|sem|ainda não|falhou|fracassou|tentou|tentativa|pretende|planeja|deseja|quer|precisa|não conseguiu|incapaz)\b/iu;
const learned=/\b(?:aprendeu|dominou|domina|dominado|aprendida|aprendido|conseguiu executar|conseguiu realizar|executou com sucesso|realizou com êxito|usou com sucesso|utilizou|usou|adquiriu|já sabe|sabe utilizar|sabe usar|possui|já possui|conhece e utiliza)\b/iu;
const promoted=/\b(?:tornou-se|tornou se|passou a ser|foi promovid[oa] a|promovid[oa] a|graduou-se como|formou-se como|recebeu o posto de|agora é|já é|é oficialmente|foi reconhecid[oa] como|novo genin|nova genin|é genin)\b/iu;
const genin=/\bgenin\b/iu;
const jutsu=/\b(?:bunshin\s+no\s+jutsu|kage\s+bunshin|jutsu\s+d[eo]s?\s+clones?|técnica\s+de\s+clonagem|clones?\s+(?:comuns?|simples?))\b/iu;
function rank(affiliation){
 const v=normalize(affiliation);
 if(/\b(?:jōnin|jonin|chūnin|chunin|anbu|hokage)\b/u.test(v))return 3;
 if(/\bgenin\b/u.test(v))return 2;
 return 0;
}
function sources(c){
 const items=[];
 // Backstory is user-confirmed starting information, but rank is not inferred from it.
 if(c.character?.history)items.push({kind:'backstory',text:c.character.history});
 if(c.character?.skills)items.push({kind:'backstory',text:c.character.skills});
 for(const m of c.messages||[])if(m?.role==='ai')items.push({kind:'narration',text:m.text});
 for(const m of c.development||[])items.push({kind:'development',text:m.text});
 for(const m of c.memories||[])if(m.status==='saved')items.push({kind:'memory',text:(m.title||'')+'. '+(m.description||'')});
 return items;
}
// Conquistas pertencem a quem executou a ação, não a quem a presenciou.
function playerPerformed(clause,name,verb){
 const v=normalize(clause);
 if(/\b(?:você|o protagonista|a protagonista|seu personagem|sua personagem)\b/iu.test(v))return true;
 if(!name)return false;
 const nameAt=v.indexOf(name);
 if(nameAt<0)return false;
 const before=v.slice(0,nameAt);
 if(/(?:\b(?:a|ao|para|de|do|diante de|perante|sobre|com|informou a|contou a|disse a)\s+)$/iu.test(before))return false;
 // Only the first named actor in the clause may earn the achievement.
 const firstActor=v.match(/\b([\p{L}][\p{L}'-]*)\s+(?:foi\s+)?(?:aprendeu|dominou|usou|utilizou|executou|realizou|conseguiu|tornou-se|passou|graduou-se|formou-se|recebeu|é|foi|sabe)\b/iu);
 if(firstActor&&firstActor[1]!==name)return false;
 const after=v.slice(nameAt+name.length);
 return new RegExp('^\\s*(?:,\\s*)?(?:foi\\s+)?(?:'+verb+')(?=\\s|$|[.,!?])','iu').test(after);
}
export function reconcileProgress(c){
 const profile={...(c.profile||{})},jutsus=Array.isArray(c.jutsus)?c.jutsus.map(j=>({...j})):[];
 const name=normalize(c.character?.name).split(/\s+/)[0];
 for(const item of sources(c)){
  for(const clause of clauses(item.text)){
   const v=normalize(clause);
   if(negative.test(v))continue;
   // Ver uma técnica executada por outra pessoa não é aprender a técnica.
   if(/\b(?:assistiu|observou|presenciou|viu)\b/iu.test(v)&&/\b(?:que|mestre|sensei|outro ninja)\b/iu.test(v))continue;
   const relevant=playerPerformed(v,name,'aprendeu|dominou|domina|conseguiu|executou|realizou|usou|utilizou|adquiriu|sabe|possui|foi|tornou-se|passou|graduou-se|formou-se|recebeu|é|já');
   if(!relevant)continue;
   if(item.kind!=='backstory'&&genin.test(v)&&(promoted.test(v)||/(?:^|\s)é\s+genin\b/u.test(v))&&rank(profile.affiliation||c.character.affiliation)<2)profile.affiliation='Genin';
   if(jutsu.test(v)&&learned.test(v)){
    const isShadow=/\bkage\s+bunshin\b/u.test(v);
    const jname=isShadow?'Kage Bunshin no Jutsu':'Bunshin no Jutsu';
    if(!jutsus.some(j=>normalize(j.name)===normalize(jname))){
     jutsus.push({name:jname,description:isShadow?'Técnica dos clones das sombras; aprendizado confirmado na campanha.':'Técnica de clonagem; aprendizado confirmado na campanha.',day:c.day||0});
    }
   }
  }
 }
 return {profile,jutsus};
}
export function hasExceptionalTalent(c){
 return /\b(?:g[eê]nio|(?:prod[ií]gio|prodigio)|talento excepcional|aprendi[sz]agem acelerada|aptid[aã]o extraordin[aá]ria)\b/iu.test([c.character?.skills,c.character?.history,c.profile?.skills].join(' '));
}
export function trainingGainLimit(c,i,tick,r){
 const timeHours=Math.max(0,tick.hours||0);
 const evidence=(i.segments||[]).map(s=>s.text).join(' ')+' '+(r.narrative||'');
 const practice=/\b(?:trein\w*|estud\w*|pratic\w*|exercit\w*|aperfei[çc]o\w*)\b/iu.test(evidence);
 if(!practice||timeHours<48)return 2;
 const days=Math.floor(timeHours/24);
 return Math.min(8,2+Math.floor(days/3)+(hasExceptionalTalent(c)?2:0));
}
