import {test} from 'node:test';
import assert from 'node:assert/strict';
import {create,view,input,context,apply} from '../src/engine.js';
import {longTermTimeOpportunity,MAX_LONG_SKIP_DAYS} from '../src/long-term-time.js';
import {canUseTime,timeMaxHours,timeSuggestions,timePlan} from '../src/time-engine.js';
import {app} from '../src/server.js';
import {readFileSync} from 'node:fs';

const character={name:'Kaien Sarutobi',age:4,village:'Konohagakure',clan:'Sarutobi'};
const campaign=()=>create('Teste de tempo',character);
const scene=(c,{user='FALAR: Hiruzen, pode me treinar por um mês?',ai='Hiruzen concorda e aceita treinar Kaien por um mês.',day=4}={})=>{
 c.introConfirmed=true;c.day=day;
 c.messages.push({role:'user',text:user,day},{role:'ai',text:ai,day});
 c.timeAvailable=false;c.timeChoices=[];c.timeScene='normal';
 return c;
};
const baseResponse=(narrative,other={})=>({narrative,sceneType:'normal',facts:[],relations:[],training:null,energyDelta:0,chakraDelta:0,timeAvailable:false,timeChoices:[],timeOptions:[],divergences:[],...other});

test('treino de um mês aceito libera tempo por 30 dias mesmo quando Gemini esquece o botão',()=>{
 const c=scene(campaign());
 assert.equal(c.timeAvailable,false,'Gemini esqueceu de oferecer TEMPO');
 assert.equal(view(c).timeAvailable,true);
 assert.equal(canUseTime(c),true);
 assert.equal(timeMaxHours(c),30*24);
 assert.ok(view(c).timeChoices.some(x=>x.hours===30*24&&/mês/i.test(x.label)));
 assert.equal(context(c,input({segments:[{type:'AGIR',text:'Confirmo o início do treinamento.'}]})).timeOpportunity.kind,'treino');
 assert.equal(c.timeAvailable,false,'consultar a ficha não altera o estado salvo');
});

test('aceitação em resposta curta recupera duração da fala anterior do jogador',()=>{
 const c=scene(campaign(),{user:'FALAR: O senhor aceita me ensinar taijutsu durante três meses?',ai:'Hiruzen responde: Está bem, Kaien. Concordo e começaremos amanhã.'});
 assert.equal(view(c).timeAvailable,true);
 assert.equal(view(c).timeMaxHours,90*24);
 assert.ok(view(c).timeChoices.some(x=>x.hours===90*24));
});

test('espera prolongada não é desbloqueada por mera solicitação do protagonista',()=>{
 const c=scene(campaign(),{user:'FALAR: Hiruzen, me treine durante um ano!',ai:'Hiruzen muda de assunto sem aceitar o pedido.'});
 assert.equal(view(c).timeAvailable,false);
 assert.equal(view(c).timeMaxHours,0);
});

test('recusa explícita e acordo hipotético não habilitam saltos longos',()=>{
 for(const line of [
  'Hiruzen não aceitou a proposta de treinar Kaien por um mês.',
  'Hiruzen disse que talvez aceite treinar Kaien durante um ano.',
  'Hiruzen apenas consideraria treinar Kaien por três meses.'
 ]){
  const c=scene(campaign(),{ai:line});
  assert.equal(view(c).timeAvailable,false,line);
 }
});

test('cenário de 1 ano, 3 anos e acordo sem prazo oferece saltos extensos, respeitando 10 anos por escolha',()=>{
 const a=scene(campaign(),{ai:'Hiruzen aceita treinar Kaien durante um ano.'});
 assert.equal(view(a).timeMaxHours,365*24);
 assert.ok(view(a).timeChoices.some(x=>x.hours===365*24));
 const b=scene(campaign(),{user:'Posso estudar com o mestre por três anos?',ai:'Hiruzen confirma que Kaien pode estudar com ele por três anos.'});
 assert.equal(view(b).timeMaxHours,3*365*24);
 assert.equal(view(b).timeOpportunity.kind,'estudo');
 const c=scene(campaign(),{user:'Posso passar muitos anos praticando com o mestre?',ai:'Hiruzen aceita e promete treinar Kaien por quantos anos forem necessários.'});
 assert.equal(view(c).timeMaxHours,MAX_LONG_SKIP_DAYS*24);
 assert.ok(view(c).timeChoices.some(x=>x.hours===MAX_LONG_SKIP_DAYS*24));
});

test('consultar uma campanha antiga recupera acordo anterior sem reescrever mensagens',()=>{
 const c=scene(campaign(),{day:40});
 c.day=55;delete c.timeChoices;
 const original=JSON.stringify(c);
 assert.equal(view(c).timeMaxHours,15*24,'só pode avançar o prazo restante');
 assert.equal(JSON.stringify(c),original,'reconciliação não altera o save');
});

test('o treinamento encerrado ou vencido deixa de abrir a janela de tempo',()=>{
 const c=scene(campaign(),{day:5});
 c.day=35;
 assert.equal(view(c).timeAvailable,false);
 const b=scene(campaign(),{day:5});b.messages.push({role:'ai',text:'O treinamento foi cancelado e o acordo foi encerrado.',day:6});b.day=6;
 assert.equal(view(b).timeAvailable,false);
});

test('um compromisso confirmado por semanas, recuperação ou obra abre durações apropriadas',()=>{
 const cases=[
  ['A médica autoriza Kaien a descansar durante duas semanas de recuperação.','recuperação',14],
  ['O arquiteto concordou com Kaien em construir a oficina por seis meses.','projeto',180],
  ['A equipe aceita partir para uma expedição de três meses com Kaien.','viagem',90],
  ['O professor confirma com Kaien o estudo durante um ano.','estudo',365]
 ];
 for(const [ai,kind,days] of cases){
  const c=scene(campaign(),{user:'Quero organizar essa atividade com sua ajuda.',ai});
  const opportunity=longTermTimeOpportunity(c);
  assert.ok(opportunity,ai);
  assert.equal(opportunity.kind,kind);
  assert.equal(opportunity.maximumHours,days*24);
 }
});

test('durante combate não abre TEMPO mesmo com treinamento combinado no histórico',()=>{
 const c=scene(campaign());
 c.timeScene='combat';
 assert.equal(canUseTime(c),false);
 assert.equal(view(c).timeAvailable,false);
});

test('pular 30 dias não ignora promessa datada e possibilita continuar o período restante',()=>{
 const c=scene(campaign(),{day:4});c.pendingTasks=[{id:'encontro',status:'open',dueDay:14,description:'Avaliação obrigatória com Hiruzen.'}];
 c.clockMinutes=20*60;
 const i=input({hours:30*24,segments:[{type:'AGIR',text:'Sigo o treinamento já combinado por um mês.'}]});
 const plan=timePlan(c,i);
 assert.ok(plan.allowedHours<30*24);
 assert.match(plan.interruption.reason,/Avaliação obrigatória/);
 const n=apply(c,i,baseResponse('Depois de dias de treinamento, Kaien chegou à avaliação obrigatória e interrompeu a prática.'));
 assert.equal(n.day,14);
 assert.equal(view(n).timeAvailable,true);
 assert.equal(view(n).timeMaxHours,20*24);
 assert.equal(c.day,4);
});

test('um salto autorizado termina no final do treinamento e atualiza calendário e idade',()=>{
 const c=scene(campaign(),{day:350});
 const i=input({hours:720,segments:[{type:'AGIR',text:'Treino taijutsu durante o mês combinado.'}]});
 const next=apply(c,i,baseResponse('Depois de trinta dias de prática com Hiruzen, Kaien completa o treinamento e apresenta os resultados.',{training:{skill:'taijutsu',gain:2}}));
 assert.equal(next.day,380);
 assert.equal(view(next).age,5);
 assert.equal(view(next).timeAvailable,false,'o acordo de 30 dias não libera salto infinito');
 assert.ok(next.development.length>0||next.progress.taijutsu>0);
});

test('treino de outro personagem não libera saltos do protagonista',()=>{
 const c=scene(campaign(),{user:'Vou treinar hoje sozinho?',ai:'Kakashi concorda em treinar Naruto por um mês, enquanto Kaien observa a conversa.'});
 assert.equal(view(c).timeAvailable,false);
});

test('interface móvel conserva botão contextual e presets de meses e anos',()=>{
 const js=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 assert.match(js,/current\?\.timeOpportunity/);
 assert.match(js,/offer\.label/);
 assert.match(js,/<option value="720">meses/);
 assert.match(js,/<option value="8760">anos/);
 assert.match(js,/Continuo o treinamento combinado durante o período escolhido/);
});

test('API permite 30 dias quando compromisso foi aceito, mesmo com timeAvailable:false do narrador',async()=>{
 const server=app({dbPath:':memory:',rateMs:0,access:{required:false},configured:true,generate:async(_c,i)=>({
  ...baseResponse(i.hours>0?'Depois de trinta dias de treinamento com Kaien, Hiruzen encerra o programa.':'Hiruzen aceita treinar Kaien durante um mês.'),
  timeAvailable:false,timeChoices:[]
 })});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let cookie='';
 async function req(path,data){const r=await fetch('http://127.0.0.1:'+server.address().port+'/api/'+path,{
  method:data?'POST':'GET',headers:{cookie,'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});
  if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];
  return {status:r.status,body:await r.json()};}
 try{
  const start=await req('campaigns',{title:'Tempo longo',character});
  const id=start.body.id;assert.equal(start.status,201);
  const confirm=await req('campaigns/'+id+'/intro-confirm',{revision:0});
  assert.equal(confirm.status,200);
  const accepted=await req('campaigns/'+id+'/turn',{revision:confirm.body.revision,segments:[{type:'FALAR',text:'Hiruzen, quero que você me treine por um mês.'}]});
  assert.equal(accepted.status,200,JSON.stringify(accepted.body));
  assert.equal(accepted.body.timeAvailable,true);
  assert.equal(accepted.body.timeMaxHours,720);
  const jumped=await req('campaigns/'+id+'/turn',{revision:accepted.body.revision,hours:720,segments:[{type:'AGIR',text:'Sigo o treinamento combinado por 30 dias.'}]});
  assert.equal(jumped.status,200,JSON.stringify(jumped.body));
  assert.equal(jumped.body.day,30);
  assert.equal(jumped.body.timeAvailable,false);
 }finally{await new Promise(resolve=>server.close(resolve));}
});

test('acordo de vinte anos permite séries de saltos de até dez anos sem estourar limite por turno',()=>{
 const c=scene(campaign(),{user:'Quero trabalhar em pesquisa por vinte anos.',ai:'O instituto concorda que Kaien pode estudar por vinte anos.'});
 assert.equal(view(c).timeMaxHours,10*365*24);
 c.day+=3650;
 assert.equal(view(c).timeMaxHours,10*365*24);
 c.day+=3650;
 assert.equal(view(c).timeAvailable,false,'o contrato não deve liberar tempo depois de completado');
});

test('janela de tempo não toma controle da campanha: só o clique TEMPO avança dias inteiros',()=>{
 const c=scene(campaign(),{day:12});
 assert.equal(view(c).timeMaxHours,720);
 const before=JSON.stringify(c);
 const n=apply(c,input({segments:[{type:'FALAR',text:'Pergunto sobre a rotina do treino.'}]}),
  baseResponse('Hiruzen explica que a prática acontecerá diariamente no campo de treinamento.'));
 assert.equal(n.day,12);
 assert.equal(c.day,12);
 assert.equal(JSON.stringify(c),before);
});
