import {test} from 'node:test';
import assert from 'node:assert/strict';
import {create,view,validate,apply,input} from '../src/engine.js';
import {timeSuggestions,focusedTimeOpportunity} from '../src/time-engine.js';
import {schema,system} from '../src/gemini.js';
import {readFileSync} from 'node:fs';

const character={name:'Kaien',age:4,village:'Konohagakure',clan:'Sarutobi',affiliation:'Civil'};
const campaign=()=>{const c=create('Teste de sugestões',character);c.introConfirmed=true;c.day=4;return c;};
const ai=(text,day=4)=>({role:'ai',text,day});
const user=(text,day=4)=>({role:'user',text,day});
const response=(narrative,extra={})=>({narrative,facts:[],relations:[],training:null,
 energyDelta:0,chakraDelta:0,timeAvailable:true,timeChoices:[],timeOptions:[],divergences:[],...extra});

test('cenas comuns conservam as sugestões originais da IA sem substituí-las por treino',()=>{
 const c=campaign();
 c.timeAvailable=true;
 c.timeChoices=[
  {hours:3,label:'Esperar o mensageiro',action:'Aguardo o mensageiro por três horas.'},
  {hours:8,label:'Descansar um pouco',action:'Descanso por oito horas.'}
 ];
 const available=view(c);
 assert.equal(available.timeSuggestionMode,'ordinary');
 assert.deepEqual(available.timeChoices,c.timeChoices);
 assert.equal(available.timeMaxHours,8);
});

test('quando Hiruzen acaba de aceitar um mês, aparecem opções de treinamento',()=>{
 const c=campaign();
 c.messages.push(user('Hiruzen, pode me treinar por um mês?'));
 c.messages.push(ai('Hiruzen concorda em treinar Kaien por um mês.'));
 c.timeAvailable=false;
 c.timeChoices=[{hours:3,label:'Esperar três horas',action:'Espero três horas.'}];
 const v=view(c);
 assert.equal(v.timeSuggestionMode,'long');
 assert.equal(v.timeAvailable,true);
 assert.deepEqual(v.timeChoices.map(x=>x.hours),[168,360,720]);
 assert.ok(v.timeChoices.every(x=>x.label.startsWith('Treinar por ')));
 assert.match(v.timeChoices.find(x=>x.hours===720).action,/por 1 mês/);
 assert.equal(v.timeMaxHours,720);
});

test('compromisso de treino antigo continua válido sem dominar sugestões de uma cena diferente',()=>{
 const c=campaign();
 c.messages.push(user('Hiruzen, pode me treinar durante dois anos?'));
 c.messages.push(ai('Hiruzen aceitou treinar Kaien durante dois anos.'));
 c.messages.push(user('Vou até a loja.'));
 c.messages.push(ai('O vendedor da loja oferece pergaminhos para Kaien.'));
 c.timeAvailable=true;
 c.timeChoices=[{hours:2,label:'Esperar atendimento',action:'Aguardo até ser atendido.'}];
 const v=view(c);
 assert.equal(v.timeSuggestionMode,'ordinary');
 assert.equal(focusedTimeOpportunity(c),null);
 assert.deepEqual(v.timeChoices,c.timeChoices);
 assert.equal(v.timeMaxHours,730*24,'o compromisso histórico continua válido para quando houver oportunidade');
});

test('se a cena continua falando do treino, opções de longo prazo seguem contextualizadas',()=>{
 const c=campaign();
 c.messages.push(user('Hiruzen, pode me treinar durante dois anos?'));
 c.messages.push(ai('Hiruzen concordou em treinar Kaien durante dois anos.'));
 c.messages.push(user('Quando começamos?'));
 c.messages.push(ai('O mestre explica as etapas do treinamento e confirma o uso do campo de taijutsu.'));
 c.timeAvailable=true;
 c.timeChoices=[{hours:1,label:'Esperar uma hora'}];
 const v=view(c);
 assert.equal(v.timeSuggestionMode,'long');
 assert.ok(v.timeChoices.some(x=>x.hours===730*24));
 assert.ok(v.timeChoices.every(x=>x.action.includes('treinamento combinado')));
});

test('quando Gemini esquece sugestões numa pausa cotidiana, oferece opções naturais',()=>{
 const c=campaign();
 c.timeAvailable=true;c.timeChoices=[];c.timeOptions=[];
 const v=view(c);
 assert.equal(v.timeSuggestionMode,'ordinary');
 assert.deepEqual(v.timeChoices.map(x=>x.hours),[3,8,24]);
 assert.deepEqual(v.timeChoices.map(x=>x.label),['Passar algumas horas','Descansar algumas horas','Avançar um dia']);
 assert.ok(v.timeChoices.every(x=>x.action&&x.action.length>10));
});

test('uma hora disponível nunca recebe sugestões maiores do que o limite',()=>{
 const c=campaign();c.timeAvailable=true;c.timeChoices=[{hours:1,label:'Pausa breve'}];
 const v=view(c);
 assert.equal(v.timeMaxHours,1);
 assert.equal(v.timeChoices.length,1);
 assert.equal(v.timeChoices[0].action,'Pausa breve');
});

test('fora de janela temporal ou durante combate, sugestões continuam ocultas',()=>{
 const c=campaign();
 assert.equal(view(c).timeAvailable,false);
 assert.deepEqual(view(c).timeChoices,[]);
 c.timeAvailable=true;c.timeChoices=[{hours:3,label:'Esperar'}];c.timeScene='combat';
 assert.equal(view(c).timeAvailable,false);
 assert.deepEqual(timeSuggestions(c),[]);
});

test('resposta Gemini aceita rascunho de ação opcional e mantém compatibilidade com escolhas antigas',()=>{
 const r=validate(response('O comerciante concede a Kaien três horas para esperar.',{
  timeChoices:[
   {hours:3,label:'Esperar na loja',action:'Aguardo o comerciante por três horas.'},
   {hours:8,label:'Descansar sem pressa'}
  ]
 }));
 assert.deepEqual(r.timeChoices,[
  {hours:3,label:'Esperar na loja',action:'Aguardo o comerciante por três horas.'},
  {hours:8,label:'Descansar sem pressa'}
 ]);
 const c=campaign();
 const next=apply(c,input({segments:[{type:'FALAR',text:'Quando posso voltar?'}]}),r);
 assert.equal(view(next).timeChoices[0].action,'Aguardo o comerciante por três horas.');
 assert.equal(view(next).timeChoices[1].action,'Descansar sem pressa');
});

test('texto sugerido é um rascunho editável, não autorização de avanço automático',()=>{
 const js=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 assert.match(js,/data-time-choice/);
 assert.match(js,/timeText=String\(opt\.action\|\|opt\.label/);
 assert.match(js,/\$\('timeactivity'\)\.value=timeText/);
 assert.match(js,/saveDraft\(\);/);
 assert.match(js,/if\(timeActive\)segments\.push\(\{type:'AGIR',text:timeText\.trim\(\)\}\)/);
 assert.match(js,/\$\('send'\)\.onclick=\(\)=>send\(\)/);
 assert.doesNotMatch(js,/Continuo o treinamento combinado durante o período escolhido/);
});

test('prompt e esquema permitem sugestões da IA com texto de ação sem impor a escolha',()=>{
 assert.match(system,/SUGESTÕES DE TEMPO CONTEXTUAIS/);
 assert.match(system,/NÃO substitua todas por Treinar/);
 const properties=schema.properties.timeChoices.items.properties;
 assert.ok(properties.action);
 assert.deepEqual(schema.properties.timeChoices.items.required,['hours','label']);
});

test('sugestões antigas de vários dias não somem por causa do limite padrão de 24 horas',()=>{
 const c=campaign();
 c.timeAvailable=true;c.timeChoices=[];c.timeOptions=[1,7];
 const v=view(c);
 assert.equal(v.timeMaxHours,7*24);
 assert.deepEqual(v.timeChoices.map(x=>x.hours),[24,7*24]);
 assert.equal(v.timeChoices[1].action,'Passo 7 dias seguindo minha rotina.');
});
