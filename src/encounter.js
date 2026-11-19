import {combatForecast} from './combat-difficulty.js';
import {chakraExperience} from './chakra-engine.js';
import {itachiStage} from './itachi-stage.js';

const plain = value => String(value || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const tokens = value => plain(value).replace(/[^a-z0-9]+/g,' ').trim();
const has = (text, phrase) => (' '+tokens(text)+' ').includes(' '+tokens(phrase)+' ');
const bounded = (n, max) => Number.isInteger(n) && n >= 0 && n <= max;
const attack = /\b(?:atac\w*|golpei\w*|soco\w*|chut\w*|acert\w*|ating\w*|invest\w*|arremess\w*|corto|corte|avanco contra|parto pra cima|contra.atac\w*)\b/u;
const retreat = /\b(?:recuo|fujo|fugir|me retiro|vou embora|saio do combate|me rendo|desisto da luta)\b/u;
const prepare = /\b(?:fint\w*|engan\w*|distrai\w*|isca|armadilha|flanc\w*|flanco|mudo (?:o |de )?(?:ritmo|angulo)|cobertura|obstaculo|observ\w*|analiso|estudo|espero a abertura)\b/u;
const defend = /\b(?:defend\w*|desvi\w*|esquiv\w*|bloquei\w*|protejo|ergo a guarda|mantenho a guarda|abaixo|me abaixo|rolo|pulo para o lado)\b/u;
const castVerb = /\b(?:uso|usar|executo|ativo|lanco|disparo|invoco|libero|aplico|faco|conjuro|tento)\b/u;
const imagined = /\b(?:nao|se eu|pretendo|imagino|penso em|finjo|quero|ameaco)\b/u;
const highCost = /rasengan|chidori|invocacao|kage bunshin/;
const techniqueWord = /\b(?:jutsu|ninjutsu|genjutsu|katon|suiton|doton|raiton|futon|bunshin|rasengan|chidori|byakugan|sharingan|invocacao)\b/u;
const quietEnd = /\b(?:acertaram uma tregua|aceitou (?:a tregua|parar)|baixou a guarda e se rendeu|o (?:confronto|combate|duelo|treino) (?:terminou|termina|acabou|se encerrou)|interrompeu o duelo)\b/u;
const labels = {
 press:{hint:'O rival está encurtando a distância. Uma defesa ou uma mudança de ângulo pode abrir espaço.', response:'encurta a distância e ataca antes que a guarda se recomponha'},
 flank:{hint:'O rival procura o seu lado exposto. Mudar de posição ou defender esse lado pode virar a troca.',response:'muda de lado e ataca pela lateral'},
 wait:{hint:'O rival espera uma investida direta. Uma finta ou mudança de ritmo pode quebrar a guarda.',response:'espera o movimento começar e responde com um contra-ataque curto'},
 technique:{hint:'O rival está preparando uma técnica. Ganhar distância, usar cobertura ou interromper o preparo muda a troca.',response:'lança sua técnica no espaço que ficou aberto'}
};

function findOpponent(c, moves, latest, forecast, previous){
 const stage=itachiStage(c.day||0);
 const itachi = forecast.namedOpponent || (previous?.opponent==='Itachi Uchiha' ? {name:previous.opponent, techniques:stage.sharingan?['Sharingan']:[]} : null);
 if(itachi){
  return {name:itachi.name, technique:itachi.techniques.includes('Sharingan')?'Sharingan':null};
 }
 // Outros adversários podem usar habilidades que a cena já atribuiu a eles.
 // A indicação é aceita apenas quando uma frase liga nome e técnica ao uso em combate.
 const verbs = '(?:usou|usa|ativou|ativa|lancou|lanca|executou|executa|prepara|preparou|molda)';
 const roster = [
  ['Kakashi','Sharingan',0], ['Gaara','areia',12], ['Neji','Byakugan',12],
  ['Shikamaru','Possessão das Sombras',12], ['Naruto','Kage Bunshin',12],
  ['Sasuke','Katon',12], ['Hiruzen','Katon',0], ['Temari','Fūton',12]
 ];
 for(const [label,power,minYear] of roster){
  const name=plain(label);
  if(has(plain(c.character?.name),name))continue;
  const usage = new RegExp('\\b'+name+'\\b[^.!?]{0,45}\\b'+verbs+'\\b[^.!?]{0,48}\\b'+plain(power)+'\\b','u');
  const engaged = new RegExp('\\b'+name+'\\b[^.!?]{0,34}\\b(?:ataca|atacou|avanca|avancou|desafia|desafiou|entra em guarda|se prepara para o duelo)\\b','u');
  if(usage.test(latest)||engaged.test(latest)||has(moves,name)&&has(latest,name)){
   const available=(c.day||0)>=minYear*365;
   return {name:label,technique:available?power:null};
  }
 }
 const observed=latest.match(/\b(?:o (?:adversario|oponente|inimigo)|a (?:adversaria|oponente|inimiga))\s+(?:usou|usa|lancou|lanca|ativou|ativa|prepara)\s+(?:o |a |um |uma )?(rasengan|chidori|katon|suiton|doton|raiton|futon|genjutsu|um bunshin|kage bunshin)\b/u);
 if(observed)return {name:previous?.opponent||'O adversário',technique:observed[1]};
 if(previous)return {name:previous.opponent,technique:previous.technique};
 return {name:'O adversário',technique:null};
}

function castOptions(c, clauses){
 const known=[...(c.jutsus||[]).map(j=>j?.name),c.character?.skills,c.profile?.skills].filter(s=>typeof s==='string');
 const learned=(name)=>known.some(s=>has(s,name));
 const named=/\b(?:kage bunshin|bunshin|rasengan|chidori|katon|suiton|doton|raiton|futon|sharingan|byakugan|invocacao)\b/u;
 const spells=[];
 for(const clause of clauses){
  if(!castVerb.test(clause)||imagined.test(clause))continue;
  const alias=clause.match(named)?.[0];
  const custom=(c.jutsus||[]).map(j=>plain(j?.name)).find(n=>n.length>=4&&has(clause,n));
  if(!alias&&!custom&&!techniqueWord.test(clause))continue;
  const knownTechnique=custom||(!alias&&/\b(?:chakra|jutsu de distracao|jutsu basico)\b/.test(clause))||
   (alias&&(learned(alias)||(alias==='bunshin'&&/genin|chunin|jonin|hokage/.test(plain(c.profile?.affiliation||c.character?.affiliation)))));
  const repetition=clause.match(/\b([2-8]|duas|dois|tres|quatro|cinco|seis|sete|oito)\s+(?:vezes|jutsus|rasengans?|clones?)\b/u)?.[1];
  const counts={duas:2,dois:2,tres:3,quatro:4,cinco:5,seis:6,sete:7,oito:8};
  const copies=repetition?(Number(repetition)||counts[repetition]):/em sequencia|repetidamente|varias vezes/.test(clause)?2:1;
  const kind=alias||custom||'chakra';
  const price=Math.max(2,Math.round((highCost.test(kind)?12:kind==='chakra'?4:7)*(1-chakraExperience(c).efficiency)));
  for(let n=0;n<copies&&spells.length<8;n++)spells.push({price,known:Boolean(knownTechnique)});
 }
 return spells;
}

function currentEncounter(c){
 const e=c.encounter;
 if(!e||e.day!==c.day||typeof e.opponent!=='string'||e.opponent.length>100||!(e.technique===null||typeof e.technique==='string'&&e.technique.length<=80))return null;
 if(!['press','flank','wait','technique'].includes(e.intent)||!bounded(e.harm,36)||!bounded(e.limit,36)||
   !bounded(e.exchange,500)||!bounded(e.streak,20)||typeof e.opening!=='boolean'||e.harm>=e.limit)return null;
 return e;
}

export function encounterPlan(c,i){
 if(i.days||i.hours)return null;
 const last=(c.messages||[]).at(-1);
 const previous=currentEncounter(c);
 const raw=(i.segments||[]).filter(s=>s.type==='AGIR').map(s=>plain(s.text));
 const clauses=raw.flatMap(s=>s.split(/[.!?;,\n]+|\s+(?:e depois|e entao|em seguida|e (?=uso|lanco|executo|disparo|ativo|aplico|ataco))\s*/u))
  .filter(s=>!imagined.test(s));
 const moves=clauses.join(' ');
 const forecast=combatForecast(c,i);
 const named=forecast.namedOpponent;
 if(!previous&&last?.sceneType!=='combat'&&!named)return null;
 if(!previous&&quietEnd.test(plain(last?.text)))return null;
 const jutsus=castOptions(c,clauses);
 const strikes=attack.test(moves.replace(/\b(?:desvio|esquivo|desviar|bloqueio|bloquear) (?:do|de um|o|um) atac\w*/g,''));
 const evades=defend.test(moves);
 const tactics=prepare.test(moves);
 const leaving=retreat.test(moves);
 if(!strikes&&!evades&&!tactics&&!leaving&&!jutsus.length)return null;
 const foe=findOpponent(c,moves,plain(last?.text),forecast,previous);
 const same=previous?.opponent===foe.name;
 const pressure=Math.min(4,Math.max(0,Math.ceil(forecast.risk/2)));
 const limit=same?previous.limit:3+pressure+Math.min(3,Math.max(0,forecast.enemyCount-1));
 const round=same?previous.exchange:0;
 const intent=same?previous.intent:foe.technique?'technique':'press';
 let cost=0,fired=0,unknown=false,short=false;
 const available=c.chakra??100;
 for(const j of jutsus){
  if(!j.known){unknown=true;continue;}
  if(cost+j.price>available){short=true;break;}
  cost+=j.price;
  fired++;
 }
 const changingAngle=/\b(?:angulo|flanc\w*|lateral|cobertura|lado|obstaculo|distancia)\b/.test(moves);
 const reading=evades&&(intent==='press'||intent==='flank')||tactics&&(intent==='press'||intent==='wait'||changingAngle)||
  changingAngle&&(intent==='flank'||intent==='technique');
 const read=reading||(evades&&changingAngle);
 const hadOpening=same&&previous.opening;
 const committed=(strikes||fired>0)&&!leaving;
 const streak=committed&&!read&&!hadOpening?Math.min(20,(same?previous.streak:0)+1):0;
 // Ataques diretos criam pouca pressão. Ler a ameaça e explorar a guarda aberta
 // têm efeitos maiores, inclusive contra um oponente de patente superior.
 const contact=committed?(hadOpening?2:read||fired?1:pressure<=1&&streak<=2?1:0):0;
 const harm=Math.min(limit,(same?previous.harm:0)+contact);
 const winning=harm>=limit;
 const opening=!winning&&!leaving&&(read||fired>0&&tactics)&&!(committed&&hadOpening);
 let response='', fatigue=0;
 if(winning)response=foe.name+' perde a capacidade de manter a troca. O confronto termina.';
 else if(leaving&&evades)response='A defesa cobre a retirada. O confronto termina sem decidir um vencedor.';
 else if(leaving)response=foe.name+' avança durante a retirada e mantém a pressão. Para se afastar com segurança, é preciso abrir distância ou se defender.';
 else if(intent==='technique'&&foe.technique){
  response=foe.technique==='Sharingan'
   ?foe.name+(round===0?' ativa o Sharingan, lê sua postura e inicia um contra-ataque pelo lado exposto.':' usa o Sharingan para ler sua postura e contra-ataca pelo lado exposto.')
   :foe.name+' usa '+foe.technique+' e força uma resposta antes que a distância volte a aumentar.';
 }else response=foe.name+' '+labels[intent].response+'.';
 const escaped=leaving&&evades;
 if(!winning&&!escaped)fatigue=Math.min(c.energy??100,read||hadOpening?1:3+pressure+(streak>1?2:0));
 const exhausted=!winning&&!escaped&&(c.energy??100)-fatigue<=0;
 if(exhausted)response+=' O cansaço impede que a troca continue.';
 else if(!winning&&!escaped&&(read||hadOpening))response+=' A reação chega atrasada e não anula o que você conseguiu.';
 const finished=winning||escaped||exhausted;
 const nextIntent=foe.technique&&round%3===2?'technique':intent==='press'?'flank':intent==='flank'?'wait':'press';
 const options=finished?'':opening?'A guarda do rival ficou exposta. Essa brecha vale na próxima troca.':labels[nextIntent].hint;
 const result=winning?'O último acerto quebra a defesa.':contact===2?'O golpe entra limpo pela abertura.':contact===1?'A ação acerta de raspão e desgasta a defesa.':opening?'A manobra força uma reação e abre a guarda.':leaving?'Você começa a se afastar.':committed?'A investida não atravessa a guarda.':'A troca não produziu um acerto.';
 const reserve=[fired?fired===1?'Uma técnica consumiu chakra.':'As técnicas executadas consumiram chakra.':'',short?'A reserva não sustentou toda a sequência.':unknown?'Uma técnica solicitada ainda não consta entre as habilidades conhecidas.':''].filter(Boolean).join(' ');
 const narrative=[result+(reserve?' '+reserve:''),response,options].filter(Boolean).join('\n\n');
 return {
  narrative,cost,fatigue,finished,
  state:finished?null:{day:c.day,opponent:foe.name,technique:foe.technique,harm,limit,
   exchange:Math.min(round+1,500),intent:nextIntent,opening,streak,sparring:forecast.sparring||Boolean(same&&previous.sparring)}
 };
}

export function resolveEncounter(plan,r){
  // Resultados do modelo não podem contradizer a troca resolvida pelo servidor.
  const answer=typeof r?.combatSpeech==='string'?r.combatSpeech.trim().slice(0,500):'';
  const narrative=answer?plan.narrative+'\n\n'+answer:plan.narrative;
  return {narrative,encounterResolved:true,encounter:plan.state,combatChakraSpent:plan.cost,
   sceneType:plan.finished?'normal':'combat',energyDelta:-plan.fatigue,
   chakraDelta:0,facts:[],relations:[],development:[],profileUpdates:[],learnedJutsus:[],pendingTasks:[],
   npcKnowledge:[],personalityTraits:[],consequences:[],divergences:[],timeOptions:[],timeChoices:[],
   timeAvailable:false,elapsedDays:0,elapsedHours:0,openingDay:0,moment:null,training:null};
}

export function encounterView(c){
 const e=currentEncounter(c);
 if(!e)return null;
 return {opponent:e.opponent,opening:e.opening,pressure:labels[e.intent].hint,
  advantage:e.harm===0?'Guarda firme':e.harm<e.limit/2?'Defesa desgastada':'Defesa perto de ceder'};
}
