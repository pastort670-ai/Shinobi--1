// Referências aproximadas do calendário SHINOBI. O dia 0 é 10 de outubro.
// A coluna oficial do personagem lista graduação aos 7, Sharingan aos 8,
// e promoção a chūnin aos 10.
const year=365;
const firstBirthday=242;

export function itachiStage(day){
 const age=5+Math.max(0,Math.floor((day+year-firstBirthday)/year));
 const stage=age<12?'criança':age<18?'adolescente':'adulto';
 const rank=age<7?'em formação na Academia':age<10?'genin':'chūnin ou posto confirmado pela campanha';
 return {age,stage,rank,sharingan:age>=8,rule:age<12
  ?'Interprete Itachi como criança prodígio de Konoha. Use o porte, a voz, a experiência e as obrigações da idade. Não use visual ou papel de adulto, manto da Akatsuki, Mangekyō, Tsukuyomi, Amaterasu ou Susanoo. Não siga memórias ou consultas que descrevam sua versão futura como se fosse a atual.'
  :'Só use postos, experiências e poderes compatíveis com a data e já estabelecidos na campanha.'};
}

export function itachiAgeConflict(text,stage){
 if(stage.stage==='adulto'||typeof text!=='string')return false;
 const normalized=text.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
 return normalized.split(/[.!?;\n]+/u).some(sentence=>{
  if(!/\bitachi\b/u.test(sentence)||/\b(?:futuro|um dia|lembranca|flashback|imaginou)\b/u.test(sentence))return false;
  if(/\bitachi(?: uchiha)?\s+(?:(?:e|era|parecia)\s+(?:um\s+)?)?(?:adulto|homem adulto)\b/u.test(sentence))return true;
  if(stage.age>=12)return false;
  if(/\b(?:ativou|ativa|usou|usa|despertou|vestia|veste)\b.{0,70}\b(?:mangekyo|tsukuyomi|amaterasu|susanoo|manto da akatsuki)\b/u.test(sentence))return true;
  return !stage.sharingan&&/\bitachi\b.{0,48}\b(?:ativa|ativou|usa|usou)\b.{0,35}\bsharingan\b/u.test(sentence);
 });
}
