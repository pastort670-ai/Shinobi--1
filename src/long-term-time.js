// Oportunidades de passagem de tempo confirmadas pela própria história.
// O narrador não precisa lembrar de abrir o botão: as cenas ACEITAS bastam.
// Consultar esta função não modifica a campanha e funciona em saves antigos.
export const MAX_LONG_SKIP_DAYS=3650; // até dez anos por escolha, repetível se o acordo permanecer.
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const numbers={um:1,uma:1,dois:2,duas:2,tres:3,quatro:4,cinco:5,seis:6,sete:7,oito:8,nove:9,dez:10,onze:11,doze:12,quinze:15,vinte:20,trinta:30,quarenta:40,cinquenta:50,cento:100};
const activity=/\b(?:trein\w*|estud\w*|pesquis\w*|investig\w*|aprend\w*|aprendiz\w*|pratic\w*|prepar\w*|aperfeico\w*|recuper\w*|reabilit\w*|tratament\w*|repous\w*|descans\w*|constru\w*|fabric\w*|produ\w*|projet\w*|trabalh\w*|expedic\w*|viaj\w*|travess\w*|jornad\w*|aguard\w*|esper\w*|servic\w*|disciplin\w*|formac\w*)\b/u;
const acceptance=/\b(?:aceit\w*|concord\w*|confirm\w*|compromet\w*|promet\w*|combinad\w*|acertad\w*|permit\w*|autoriz\w*|aprov\w*|ficou combinado|esta combinado|esta decidido|esta bem|fechado|certamente|de acordo|dispost\w* a|inici\w*|comec\w*|parti\w*|treinaremos|treinarei|treinarao|estudaremos|prepararemos|vamos treinar|vamos estudar|sera seu mestre|sera seu instrutor|sera sua instrutora)\b/u;
const declined=/\b(?:sem (?:aceitar|concordar|confirmar|autorizar)|recus\w*|rejeit\w*|negou|adiou indefinidamente|cancel\w*|desist\w*|nao aceitou|nao concordou|nao autorizou|nao permitiu|nao podera|nao vai aceitar|sem acordo|ainda nao aceitou|talvez aceite|considerara|se aceitar)\b/u;
const ended=/\b(?:treinamento|treino|estudo|pesquisa|projeto|expedicao|viagem|tratamento|obra|contrato|aprendizado|aprendizagem|compromisso)\b.{0,62}\b(?:foi cancelad\w*|foi encerrad\w*|terminou|acabou|concluiu-se|foi concluid\w*|foi interrompid\w* definitivamente|foi suspens\w*)\b|\b(?:cancelou|encerrou|abandonou|desistiu)\b.{0,40}\b(?:treinamento|treino|estudo|projeto|expedicao|viagem|tratamento|obra|contrato)\b/u;
const durationRe=/(?:\b(?:por|durante|pelos?|pelas?|ao longo de|nos proximos|nas proximas|pelos proximos|pelas proximas|cerca de|aproximadamente|ate completar)\s+)?(?:(?:os|as|proximos|proximas)\s+)?(\d{1,4}|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|quinze|vinte|trinta|quarenta|cinquenta)\s+(anos?|mes(?:es)?|semanas?|dias?)\b/gu;
const indefinite=/\b(?:por anos|durante anos|varios anos|muitos anos|quantos anos|tempo indeterminado|tempo indefinido|tempo que for necessario|pelo tempo que precisar|pelo tempo que quiser|ate quando quiser)\b/u;
const kindOf=text=>{
 if(/\b(?:trein\w*|pratic\w*|taijutsu|ninjutsu|genjutsu|sensei|instrutor|mestre|disciplina)\b/u.test(text))return 'treino';
 if(/\b(?:estud\w*|pesquis\w*|investig\w*|aprend\w*|formac\w*)\b/u.test(text))return 'estudo';
 if(/\b(?:viag\w*|expedic\w*|travess\w*|jornad\w*)\b/u.test(text))return 'viagem';
 if(/\b(?:recuper\w*|tratament\w*|reabilit\w*|repous\w*|descans\w*)\b/u.test(text))return 'recuperação';
 if(/\b(?:constru\w*|fabric\w*|projet\w*|produ\w*)\b/u.test(text))return 'projeto';
 return 'espera';
};
function period(text){
 const s=normalize(text);
 let candidates=[];
 for(const m of s.matchAll(durationRe)){
  let amount=/^\d+$/.test(m[1])?Number(m[1]):numbers[m[1]];
  if(!Number.isInteger(amount)||amount<=0)continue;
  const unit=m[2];
  const factor=unit.startsWith('ano')?365:unit.startsWith('mes')?30:unit.startsWith('semana')?7:1;
  const days=amount*factor;
  if(days<=36500)candidates.push({days,indefinite:false});
 }
 if(candidates.length)return candidates[0]; // primeira duração acordada no trecho de cena
 if(indefinite.test(s))return {days:MAX_LONG_SKIP_DAYS,indefinite:true};
 if(/\b(?:mes inteiro|mes completo)\b/u.test(s))return {days:30,indefinite:false};
 if(/\b(?:ano inteiro|ano completo)\b/u.test(s))return {days:365,indefinite:false};
 return null;
}
function referenceText(scene,index,all,protagonist=''){
 const prev=all[index-1]?.role==='user'?normalize(all[index-1].text):'';
 const current=normalize(scene.text),confirmed=acceptance.test(current)&&!declined.test(current);
 if(!confirmed)return null;
 const combined=current+' '+prev;
 if(!activity.test(combined))return null;
 const first=normalize(protagonist).split(/\s+/)[0];
 const protagonistInScene=first&&new RegExp('\\b'+first+'\\b','u').test(current);
 const addressed=/\b(?:voce|seu personagem|sua equipe|seu grupo|te treinar|treinar voce|instruir voce)\b/u.test(current);
 const firstPersonRequest=/\b(?:me|mim|eu|quero|posso|poderia me|gostaria|preciso|queria|vou|meu|minha|aceito)\b/u.test(prev);
 if(!protagonistInScene&&!addressed&&!firstPersonRequest)return null;
 // Evita liberar o treinamento de Naruto ou de outro NPC porque Kaien estava perto.
 const otherTrainee=current.match(/\b(?:treinar|instruir|ensinar|orientar)\s+(?:o\s+|a\s+)?([a-z]{3,})\b/u)?.[1];
 if(otherTrainee&&!['kaien',first,'voce','me','mim','com','por','durante'].includes(otherTrainee))return null;
 const promise=period(current)||period(prev);
 if(!promise)return null;
 // "Se" e outras possibilidades não constituem aceitação confirmada.
 if(/\b(?:talvez|poderia|hipotese|consideraria|caso aceite|se ele aceitar|se ela aceitar|ainda depende)\b/u.test(current))return null;
 const kind=kindOf(activity.test(current)?current:prev);
 return {kind,days:promise.days,indefinite:promise.indefinite,description:String(scene.text).replace(/\s+/g,' ').slice(0,220),
  sourceMessageIndex:index,startDay:Number.isInteger(scene.day)?scene.day:0};
}
function sortedSuggestions(remainingDays,kind){
 const choices=remainingDays<=7?[1,Math.min(3,remainingDays),remainingDays]:
  remainingDays<=30?[7,Math.min(15,remainingDays),remainingDays]:
  remainingDays<=90?[7,30,remainingDays]:
  remainingDays<=365?[30,Math.min(180,remainingDays),remainingDays]:
  [30,365,remainingDays];
 const verb={treino:'Treinar',estudo:'Estudar',viagem:'Viajar',recuperação:'Recuperar-se',projeto:'Trabalhar',espera:'Avançar'}[kind]||'Avançar';
 const label=days=>days%365===0?days/365+' ano'+(days===365?'':'s'):
   days%30===0?days/30+' mês'+(days===30?'':'es'):
   days%7===0?days/7+' semana'+(days===7?'':'s'):
   days+' dia'+(days===1?'':'s');
 return [...new Set(choices.filter(x=>Number.isInteger(x)&&x>0&&x<=remainingDays))]
  .slice(0,3).map(days=>({hours:days*24,label:verb+' por '+label(days)}));
}
export function longTermTimeOpportunity(c){
 if(!c||(c.introConfirmed===false&&(c.messages||[]).length<=1)||c.timeScene==='combat')return null;
 const messages=Array.isArray(c.messages)?c.messages:[];
 const today=Number.isInteger(c.day)?c.day:0;
 // Retroativo para campanhas que já tinham um mês de treino aceito antes do update.
 const from=Math.max(0,messages.length-450);
 for(let index=messages.length-1;index>=from;index--){
  const m=messages[index];
  if(m?.role!=='ai'||typeof m.text!=='string')continue;
  const offer=referenceText(m,index,messages,c.character?.name);
  if(!offer)continue;
  const later=messages.slice(index+1).filter(x=>x?.role==='ai'&&typeof x.text==='string');
  // Encerramento explícito em uma cena aceita cancela a janela antiga.
  if(later.some(x=>ended.test(normalize(x.text))))return null;
  const remainingDays=offer.startDay+offer.days-today;
  if(remainingDays<=0)return null;
  const limit=Math.min(remainingDays,MAX_LONG_SKIP_DAYS,Math.max(0,36500-today));
  if(limit<=0)return null;
  return {...offer,remainingDays,maximumHours:limit*24,choices:sortedSuggestions(limit,offer.kind),
   label:offer.kind==='treino'?'Treinamento combinado':offer.kind==='estudo'?'Estudos combinados':offer.kind==='viagem'?'Viagem programada':offer.kind==='recuperação'?'Recuperação autorizada':offer.kind==='projeto'?'Projeto em andamento':'Período combinado'};
 }
 return null;
}
