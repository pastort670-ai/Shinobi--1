import {test} from 'node:test';
import assert from 'node:assert/strict';
import {create,input,apply,calendar,resolveElapsedDays,validate,context} from '../src/engine.js';
import {schema,system} from '../src/gemini.js';

const character={name:'Akira',age:2,village:'Konohagakure',clan:'Sarutobi',affiliation:'Civil'};
const result={narrative:'A manhã seguinte chega à vila.',facts:[],relations:[],training:null,energyDelta:0,chakraDelta:0,timeOptions:[],divergences:[],development:[],elapsedDays:1};
const action=text=>input({segments:[{type:'AGIR',text}]});

test('noite concluída na resposta do Gemini avança data e calendário',()=>{
 const c=create('Noites',character);c.day=1;
 const i=action('Akira se deita e dorme até amanhecer.');
 const next=apply(c,i,result);
 assert.equal(next.day,2);
 assert.equal(calendar(next.day).day,12);
 assert.equal(next.messages.at(-1).day,2);
 assert.equal(next.messages.at(-1).sceneType,'time');
 assert.equal(next.messages.at(-2).day,2);
 assert.equal(c.day,1);
 assert.equal(next.lastInput.days,0,'Regeneração retém pedido original, sem salto duplo');
});
test('narrador pode conduzir a manhã seguinte mesmo sem TEMPO explícito',()=>{
 const c=create('Narrativa',character);
 const i=action('Akira passa a noite pensando no que aconteceu.');
 const next=apply(c,i,{...result,narrative:'Akira passou a noite inteira pensando. Quando amanheceu, Hiruzen voltou ao gabinete.',elapsedDays:0});
 assert.equal(next.day,1,'Fallback para manhã seguinte comprovada');
 assert.equal(next.motorEvents.at(-1).kind,'time');
});
test('falar em dormir, noite ou amanhã não é avanço efetivo',()=>{
 const i=action('Talvez eu durma amanhã.');
 for(const text of ['Akira pensou na noite anterior.', 'Hiruzen avisou: amanhã será outro dia.', 'O quarto ficou silencioso, e Akira adormeceu.']){
  assert.equal(resolveElapsedDays(i,{...result,narrative:text,elapsedDays:0}),0);
 }
 assert.equal(resolveElapsedDays(i,{...result,narrative:'Akira adormeceu.',elapsedDays:1}),0,'O modelo não pode declarar dias sem narrar transição');
});
test('passagem de vários dias exige resultado narrativo explícito e limitado',()=>{
 const i=action('Akira aguarda a conclusão do treino.');
 const r={...result,narrative:'Depois de três dias de treino, o grupo regressa à vila.',elapsedDays:3};
 assert.equal(resolveElapsedDays(i,r),3);
 assert.equal(apply(create('Treino',character),i,r).day,3);
 for(const n of [-1,1.5,31])assert.throws(()=>validate({...r,elapsedDays:n}),/inválida/);
});
test('TEMPO manual prevalece sobre o narrador e não conta duas vezes',()=>{
 const c=create('Tempo livre',character);
 const i=input({segments:[{type:'AGIR',text:'Akira treina.'}],days:7});
 const next=apply(c,i,{...result,narrative:'Depois de sete dias, a equipe retorna.',elapsedDays:7});
 assert.equal(next.day,7);
 assert.equal(next.messages.at(-1).sceneType,'time');
 assert.equal(context(c,i).day,7);
 const regen=apply(c,i,{...result,narrative:'Após uma semana, a vila recebe notícias.',elapsedDays:0});
 assert.equal(regen.day,7);
});
test('eventos importantes atravessados por passagem automática entram na cronologia',()=>{
 const c=create('Marcos',character);c.day=12*365+179;
 const next=apply(c,action('Espera até amanhecer.'),{...result,narrative:'Na manhã seguinte, a invasão começa.',elapsedDays:1});
 assert.equal(next.day,12*365+180);
 assert.ok(next.timeline.some(e=>e.id==='invasion'));
});
test('contrato Gemini expõe elapsedDays e mantém botão de tempo livre',()=>{
 assert.equal(schema.properties.elapsedDays.type,'INTEGER');
 assert.ok(schema.required.includes('elapsedDays'));
 assert.match(system,/calendário/);
 assert.match(system,/input\.days/);
});
