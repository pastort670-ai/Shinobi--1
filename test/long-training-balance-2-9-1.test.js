import {test} from 'node:test';
import assert from 'node:assert/strict';
import {create,view,apply,input} from '../src/engine.js';
import {longTermTimeOpportunity,MAX_TRAINING_SKIP_DAYS} from '../src/long-term-time.js';
import {balancedTrainingProgress,TRAINING_ONLY_MAX,MAX_LONG_TRAINING_GAIN} from '../src/training-balance.js';

const character={name:'Kaien Sarutobi',age:4,village:'Konohagakure',skills:'Prodígio de aprendizado.',history:'Adotado e treinado por Hiruzen.'};
const start=()=>create('Campanha em andamento',character);
const accepted=(response,user='FALAR: O senhor pode ser meu mestre por esse período?',day=4)=>{
 const c=start();c.day=day;c.introConfirmed=true;
 c.messages.push({role:'user',text:user,day},{role:'ai',text:response,day});
 c.timeAvailable=false;c.timeChoices=[];c.timeScene='normal';
 return c;
};
const outcome=(narrative,training=null,rest={})=>({narrative,training,energyDelta:0,chakraDelta:0,timeAvailable:false,timeChoices:[],facts:[],relations:[],timeOptions:[],divergences:[],...rest});
const jump=(days,activity='Continuo o treinamento de taijutsu com Hiruzen.')=>input({hours:days*24,segments:[{type:'AGIR',text:activity}]});
const train=(days,progress=0,gain=8)=>{
 const c=accepted('Hiruzen concorda e aceita treinar Kaien durante dois anos.');c.progress.taijutsu=progress;
 const res=outcome('Kaien treinou taijutsu, repetiu exercícios e aprimorou movimentos sob Hiruzen durante o período.',{skill:'taijutsu',gain});
 return {c,next:apply(c,jump(days),res)};
};

test('limite de treinamento por salto é de dois anos do calendário interno',()=>{
 assert.equal(MAX_TRAINING_SKIP_DAYS,730);
 const c=accepted('Hiruzen aceita treinar Kaien durante dois anos.');
 const visible=view(c);
 assert.equal(visible.timeAvailable,true);
 assert.equal(visible.timeMaxHours,730*24);
 assert.ok(visible.timeChoices.some(x=>x.hours===730*24&&/2 anos/.test(x.label)));
 assert.ok(visible.timeChoices.some(x=>x.hours===365*24));
});

test('aceite de uma formação prolongada sem duração explícita abre até dois anos',()=>{
 const c=accepted('Hiruzen concorda e aceita ser mentor de Kaien, assumindo sua formação prolongada.');
 const offer=longTermTimeOpportunity(c);
 assert.equal(offer.kind,'treino');
 assert.equal(offer.maximumHours,730*24);
 assert.equal(offer.indefinite,true);
});

test('um mês combinado continua limitado a um mês',()=>{
 const c=accepted('Hiruzen aceita treinar Kaien por um mês.','FALAR: Hiruzen, pode me treinar por um mês?');
 assert.equal(view(c).timeMaxHours,30*24);
 assert.ok(view(c).timeChoices.some(x=>x.hours===30*24));
 assert.ok(!view(c).timeChoices.some(x=>x.hours===730*24));
});

test('contrato de três anos libera dois agora e um depois, sem ultrapassar o acordo',()=>{
 const c=accepted('Hiruzen concorda em treinar Kaien durante três anos.');
 assert.equal(view(c).timeMaxHours,730*24);
 c.day+=730;
 assert.equal(view(c).timeMaxHours,365*24);
 c.day+=365;
 assert.equal(view(c).timeAvailable,false);
});

test('outros projetos de três anos conservam limite próprio sem intervenção do teto de treino',()=>{
 const c=accepted('O instituto concorda em construir a oficina com Kaien durante três anos.','FALAR: Quero um projeto de construção de três anos.');
 assert.equal(view(c).timeOpportunity.kind,'projeto');
 assert.equal(view(c).timeMaxHours,3*365*24);
});

test('não oferece dois anos só porque Hiruzen aceitou uma aula ou um treino breve',()=>{
 const c=accepted('Hiruzen aceitou ensinar uma técnica para Kaien nesta tarde.','FALAR: Pode me dar uma aula hoje?');
 assert.equal(view(c).timeAvailable,false);
});

test('nenhum avanço acontece sem envio do próprio jogador',()=>{
 const c=accepted('Hiruzen aceita treinar Kaien durante dois anos.');
 const before=JSON.stringify(c);view(c);
 assert.equal(JSON.stringify(c),before);
});

test('treinar dois anos traz progresso importante, mas nunca o nível máximo',()=>{
 const {c,next}=train(730);
 assert.equal(c.progress.taijutsu,0);
 assert.ok(next.progress.taijutsu>=8&&next.progress.taijutsu<=MAX_LONG_TRAINING_GAIN);
 assert.ok(next.progress.taijutsu<100);
 assert.ok(view(next).databook.ratings.taijutsu<5);
 assert.equal(next.day,734);
 assert.equal(view(next).age,6);
});

test('um treino de dois anos rende mais que um de 30 dias, mas com retorno moderado',()=>{
 const month=train(30).next.progress.taijutsu;
 const years=train(730).next.progress.taijutsu;
 assert.ok(years>month,{month,years});
 assert.ok(years<=MAX_LONG_TRAINING_GAIN);
});

test('perto do topo há retornos decrescentes e treinamentos nunca chegam a 100',()=>{
 const early=train(730,0).next.progress.taijutsu;
 const advanced=train(730,80).next.progress.taijutsu-80;
 const almost=train(730,98).next.progress.taijutsu;
 assert.ok(advanced<early);
 assert.equal(almost,99);
 assert.equal(TRAINING_ONLY_MAX,99);
 assert.equal(view(train(730,98).next).databook.ratings.taijutsu,4.5);
});

test('nível excepcional antigo já conquistado permanece sem redução',()=>{
 const {next}=train(730,100);
 assert.equal(next.progress.taijutsu,100);
 assert.equal(view(next).databook.ratings.taijutsu,5);
});

test('treino sem resultado comprovado pela narração não gera pontos gratuitos',()=>{
 const c=accepted('Hiruzen aceita treinar Kaien durante dois anos.');
 const n=apply(c,jump(730),outcome('Hiruzen explicou como funcionará a instrução, mas a prática ainda não começou.',{skill:'taijutsu',gain:8}));
 assert.equal(n.progress.taijutsu,0);
});

test('treino rejeitado, condição pendente e treino de outro ninja não liberam o período',()=>{
 for(const ai of [
  'Hiruzen recusou treinar Kaien por dois anos.',
  'Hiruzen aceitaria ser mentor de Kaien somente se ele passasse em um teste.',
  'Hiruzen concordou em treinar Naruto por dois anos enquanto Kaien permaneceu na aldeia.'
 ]){
  const c=accepted(ai,'FALAR: Hiruzen, pode me treinar por dois anos?');
  assert.equal(view(c).timeAvailable,false,ai);
 }
});

test('o databook não concede a nota máxima por um salto longo com proposta rating 5',()=>{
 const c=accepted('Hiruzen aceitou treinar Kaien durante dois anos.');
 c.databook.ratings.speed=4.5;
 const sentence='Kaien demonstrou velocidade aprimorada e concluiu os exercícios de deslocamento.';
 const n=apply(c,jump(730,'Treino velocidade e deslocamento.'),outcome(sentence,{skill:'taijutsu',gain:8},{
  databookUpdates:[{attribute:'speed',rating:5,evidence:sentence}]
 }));
 assert.equal(n.databook.ratings.speed,4.5);
 assert.equal(view(n).databook.ratings.speed,4.5);
});

test('num treino longo técnicas só entram se citadas na cena, com no máximo duas novas',()=>{
 const c=accepted('Hiruzen concordou em treinar Kaien durante dois anos.');
 const n=apply(c,jump(730),outcome('Kaien treinou ninjutsu e aprendeu Rasengan e Chidori com supervisão.',{skill:'ninjutsu',gain:8},{
  learnedJutsus:[
   {name:'Rasengan',description:'Técnica dominada após estudo'},
   {name:'Chidori',description:'Técnica aprendida após treino'},
   {name:'Hiraishin',description:'Não citada'},
   {name:'Kirin',description:'Não citada'},
   {name:'Amaterasu',description:'Não citada'}
  ]
 }));
 assert.deepEqual(n.jutsus.map(j=>j.name).sort(),['Chidori','Rasengan']);
});

test('repetir treinos de vários anos não eleva automaticamente nenhuma das três artes a 100',()=>{
 let c=accepted('Hiruzen aceita treinar Kaien durante dois anos.');
 c.progress={taijutsu:85,ninjutsu:90,genjutsu:96};
 for(const skill of ['taijutsu','ninjutsu','genjutsu']){
  const n=apply(c,jump(730,'Continuo treino de '+skill+'.'),outcome('Kaien treinou '+skill+' de forma consistente e refinou fundamentos.',{skill,gain:8}));
  assert.ok(n.progress[skill]<100,skill);
  assert.ok(view(n).databook.ratings[skill]<5,skill);
 }
});

test('o motor só conta o tempo efetivamente transcorrido quando há interrupção',()=>{
 const c=accepted('Hiruzen concordou em treinar Kaien durante dois anos.');
 c.pendingTasks=[{id:'review',status:'open',dueDay:34,description:'Exame marcado com o instrutor.'}];
 const n=apply(c,jump(730),outcome('Kaien treinou taijutsu por trinta dias até o exame agendado.',{skill:'taijutsu',gain:8}));
 assert.equal(n.day,34);
 assert.ok(n.progress.taijutsu<20);
 assert.equal(view(n).timeMaxHours,700*24);
});

test('TEMPO salva um desfecho para treino inconclusivo sem alterar a perícia',()=>{
 const c=accepted('Hiruzen aceitou treinar Kaien por um mês.');
 const next=apply(c,jump(30),outcome('O movimento continuou instável.'));
 const summary=view(next).messages.at(-1).trainingSummary;
 assert.match(summary,/30 dias.*Nenhum avanço/);
 assert.equal(next.progress.taijutsu,0);
 assert.ok(next.facts.some(f=>f.text===summary));
});

test('TEMPO registra a perícia e a técnica confirmadas na ficha',()=>{
 const c=accepted('Hiruzen aceitou treinar Kaien por um mês.');
 const next=apply(c,jump(30,'Treino a técnica Rasengan.'),outcome(
  'Kaien praticou ninjutsu sob supervisão. Kaien aprendeu o Rasengan.',
  {skill:'ninjutsu',gain:4},
  {learnedJutsus:[{name:'Rasengan',description:'Aprendizado confirmado.'}]}
 ));
 assert.match(view(next).messages.at(-1).trainingSummary,/Rasengan.*avanço em ninjutsu/);
 assert.ok(next.progress.ninjutsu>0);
 assert.ok(view(next).jutsus.some(j=>j.name==='Rasengan'));
});

test('TEMPO sem treino dispensa registro de treinamento',()=>{
 const c=start();
 const next=apply(c,jump(1,'Aguardo o mensageiro.'),outcome('O portão amanhece fechado.'));
 assert.equal(view(next).messages.at(-1).trainingSummary,undefined);
});
