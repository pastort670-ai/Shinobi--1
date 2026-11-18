// Recupera conquistas antigas de fontes aceitas, sem confiar em tentativas do jogador.
// A origem do personagem fica intocada; only dynamic profile and jutsu repertoire evolve.
const normalize=s=>String(s||'').normalize('NFC').toLocaleLowerCase('pt-BR');
const clauses=s=>String(s||'').split(/[.!?\n;]+/).map(x=>x.trim()).filter(Boolean);
const negative=/\b(?:não|nunca|jamais|sem|ainda não|falhou|fracassou|tentou|tentativa|pretende|planeja|deseja|quer|precisa|não conseguiu|incapaz)\b/iu;
const learned=/\b(?:aprendeu|dominou|domina|dominado|aprendida|aprendido|concluiu o aprendizado|recebeu treinamento e dominou|conseguiu executar|conseguiu realizar|executou com sucesso|realizou com êxito|usou com sucesso|utilizou|usou|adquiriu|já sabe|sabe utilizar|sabe usar|possui|já possui|conhece e utiliza)\b/iu;
const promoted=/\b(?:tornou-se|tornou se|passou a ser|foi promovid[oa] a|promovid[oa] a|graduou-se como|formou-se como|recebeu o posto de|recebeu sua graduação de|recebeu a graduação de|agora é|já é|é oficialmente|foi reconhecid[oa] como|novo genin|nova genin|é genin)\b/iu;
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
// Uma menção à técnica ou à patente não prova que foi o protagonista
// quem a conquistou. Inspecionar o sujeito do verbo, não a presença do nome
// em qualquer lugar da frase (ex.: "Hiruzen usou diante de Akira").
const actionJutsu=/\b(?:aprendeu|concluiu o aprendizado|dominou|domina|executou com sucesso|conseguiu executar|conseguiu realizar|realizou com êxito|usou com sucesso|utilizou|usou|já sabe|sabe utilizar|sabe usar|possui|adquiriu)\b/iu;
const actionRank=/\b(?:foi promovid[oa] a|promovid[oa] a|tornou-se|tornou se|passou a ser|graduou-se como|formou-se como|recebeu (?:o posto|sua graduação|a graduação) de|agora é|já é|é oficialmente|foi reconhecid[oa] como|é genin)\b/iu;
const properNames=s=>s.match(/\b[\p{Lu}][\p{L}]{2,}\b/gu)||[];
export function protagonistAchievement(text,characterName,kind='jutsu'){
 const owner=String(characterName||'').trim().split(/\s+/u)[0];
 if(!owner)return false;
 const cue=(kind==='rank'?actionRank:actionJutsu).exec(String(text||''));
 if(!cue)return false;
 const before=String(text).slice(0,cue.index).split(/\b(?:que|enquanto|quando)\b/iu).at(-1).trim();
 const named=properNames(before);
 if(named.length){
  const last=named.at(-1);
  if(last.toLocaleLowerCase('pt-BR')!==owner.toLocaleLowerCase('pt-BR'))return false;
  return true;
 }
 return /\b(?:você|protagonista|seu personagem|o personagem)\b/iu.test(before);
}
export function reconcileProgress(c){
 const profile={...(c.profile||{})},jutsus=Array.isArray(c.jutsus)?c.jutsus.map(j=>({...j})):[];
 for(const item of sources(c)){
  for(const clause of clauses(item.text)){
   const v=normalize(clause);
   if(negative.test(v))continue;
   // Ver uma técnica executada por outra pessoa não é aprender a técnica.
   if(/\b(?:assistiu|observou|presenciou|viu)\b/iu.test(v)&&/\b(?:que|mestre|sensei|outro ninja)\b/iu.test(v))continue;
   const explicit=item.kind==='backstory'&&(!/\b[A-ZÀ-Ý][\p{L}]{2,}\b/u.test(clause)||protagonistAchievement(clause,c.character?.name,'jutsu'));
   if(item.kind!=='backstory'&&genin.test(v)&&promoted.test(v)&&protagonistAchievement(clause,c.character?.name,'rank')&&rank(profile.affiliation||c.character.affiliation)<2)profile.affiliation='Genin';
   if(jutsu.test(v)&&learned.test(v)&&(explicit||protagonistAchievement(clause,c.character?.name,'jutsu'))){
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
