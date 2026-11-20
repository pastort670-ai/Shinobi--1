import {chakraOf} from './chakra-engine.js';
import {techniquesInTurn} from './encounter.js';

const plain=value=>String(value??'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
const safe=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const names={bunshin:'Bunshin', 'kage bunshin':'Kage Bunshin', rasengan:'Rasengan', chidori:'Chidori',
 katon:'Katon', suiton:'Suiton', doton:'Doton', raiton:'Raiton', futon:'Fūton', sharingan:'Sharingan',
 byakugan:'Byakugan', invocacao:'Invocação'};
const reach={Rasengan:'A versão básica precisa de contato. Uma variação à distância exige repertório comprovado.',
 Chidori:'A versão básica precisa alcançar o alvo. Cobertura, distância e oportunidade de aproximação importam.',
 Bunshin:'O clone básico distrai, sem um corpo capaz de tocar ou carregar objetos.'};

export function planTurnDirection(c,i,{combat,time}={}){
 const chakra=chakraOf(c);
 let reserve=chakra;
 const techniques=techniquesInTurn(c,i).map(({name,price,known})=>{
  const result=reserve===0?'reserva esgotada':known&&price>reserve?'chakra insuficiente':known?'pode tentar':'não confirmada';
  if(result==='pode tentar')reserve-=price;
  return {technique:Object.hasOwn(names,name)?names[name]:name,result};
 });
 const sceneConstraints=[...new Set(techniques.map(({technique})=>Object.hasOwn(reach,technique)?reach[technique]:null).filter(Boolean))];
 return {
  sequence:(i.segments||[]).map((s,index)=>({order:index+1,kind:s.type==='FALAR'?'fala a interpretar':'ação a resolver'})),
  resolvedCombat:combat?.narrative||null,
  techniques,
  sceneConstraints,
  allowedHours:time?.allowedHours||null,
  direction:'Considere cada trecho na ordem, mesmo se a fala mudar o que uma ação significa. Responda ao que NPCs podem ouvir e mostre a consequência do que o jogador tentou. Se duas intenções forem incompatíveis, deixe a escolha em aberto. Respeite resolvedCombat quando presente. Qualquer técnica com reserva esgotada não se completa. Uma tentativa viável ainda pode falhar. Se não houver confirmação de domínio, não conceda técnica nova por declaração. Use frases claras, com nomes ou referentes inequívocos.'
 };
}

export function unavailableCast(c,i,part){
 if(i.hours||i.days||chakraOf(c)>0||!techniquesInTurn(c,i).length)return false;
 const name=safe(plain(c.character?.name).split(' ')[0]);
 const sentence=plain(part);
 const subject=new RegExp('^(?:voce|[oa] protagonista'+(name?'|'+name:'')+')\\b','u');
 if(!subject.test(sentence)||/\b(?:nao|tent\w*|falh\w*|sem chakra|interromp\w*|apenas|simula\w*|parece|finj\w*)\b/u.test(sentence))return false;
 const cast=/\b(?:ativa|ativou|executa|executou|lanca|lancou|dispara|disparou|invoca|invocou|cria|criou|libera|liberou|forma|formou|utiliza|utilizou|usa|usou)\b/u;
 const technique=/\b(?:chakra|jutsu|genjutsu|katon|suiton|doton|raiton|futon|bunshin|rasengan|chidori|byakugan|sharingan|invocacao|clone\w*)\b/u;
 return cast.test(sentence)&&(technique.test(sentence)||(c.jutsus||[]).some(jutsu=>sentence.includes(plain(jutsu.name).trim())&&jutsu.name));
}
