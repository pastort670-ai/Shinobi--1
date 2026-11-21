import {test} from 'node:test';
import assert from 'node:assert/strict';
import {apply,context,create,input,view} from '../src/engine.js';
import {provider} from '../src/gemini.js';

const campaign=(affiliation='Academia Ninja')=>create('Treino',{name:'Kaien Sarutobi',age:12,village:'Konohagakure',affiliation});
const show=input({segments:[{type:'AGIR',text:'Mostro o jutsu que aprendi ao instrutor.'}]});
const contradiction='O instrutor observa a execução. — Mas como que isso é possível se você nem terminou a academia?';
const oldGenin=()=>{
 const c=campaign();
 c.messages.push({role:'ai',day:5,text:'Kaien tornou-se Genin após a avaliação.'});
 return c;
};
const reply=proposal=>Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(proposal)}]}}]});

test('a patente que aparece na ficha também prevalece no contexto do narrador e do especialista',()=>{
 const c=oldGenin();
 const ctx=context(c,show);
 assert.equal(view(c).profile.affiliation,'Genin');
 assert.equal(ctx.profile.affiliation,'Genin');
 assert.equal(ctx.character.affiliation,'Genin');
 assert.deepEqual(ctx.protagonistStatus,{affiliation:'Genin',academyGraduated:true});
 assert.equal(ctx.specialist.sheetAssistant.rank,'Genin');
 assert.equal(c.character.affiliation,'Academia Ninja');
});

test('retira a premissa falsa da fala do instrutor e preserva os efeitos legítimos',()=>{
 const c=oldGenin();
 const n=apply(c,show,{narrative:contradiction,energyDelta:-5,profileUpdates:[
  {field:'affiliation',value:'Academia Ninja'},
  {field:'skills',value:'Controle de chakra refinado.'}
 ],facts:['Kaien ainda é aluno da Academia Ninja.','O instrutor observou a técnica.'],
  npcKnowledge:[{name:'Instrutor',fact:'Kaien não terminou a Academia.'}]});
 assert.match(n.messages.at(-1).text,/O instrutor observa a execução.*como que isso é possível\?/s);
 assert.doesNotMatch(n.messages.at(-1).text,/nem terminou a academia/i);
 assert.equal(n.profile.affiliation,'Genin');
 assert.equal(n.profile.skills,'Controle de chakra refinado.');
 assert.equal(n.energy,95);
 assert.ok(n.facts.some(f=>f.text==='O instrutor observou a técnica.'));
 assert.ok(n.facts.every(f=>!f.text.includes('ainda é aluno')));
 assert.deepEqual(n.npcKnowledge,{});
});

test('preserva falas e lembranças legítimas sobre a Academia',()=>{
 const c=campaign('Genin');
 for(const narrative of [
  '— Ren ainda é aluno da Academia, por isso vamos treinar juntos.',
  '— Antes da sua graduação, você ainda não tinha concluído a Academia.',
  '— Naquela época, você ainda era aluno da Academia.',
  '— Você não terminou o exercício que eu pedi.',
  '— Você ainda não passou no exame para Chūnin.',
  '— Vamos voltar à Academia para observar a aula.',
  '— Você já terminou a Academia?'
 ]){
  assert.equal(apply(c,show,{narrative}).messages.at(-1).text,narrative);
 }
 assert.equal(apply(campaign(),show,{narrative:contradiction}).messages.at(-1).text,contradiction);
 for(const narrative of [
  'O instrutor diz que Kaien Sarutobi ainda não se formou na Academia.',
  '— Você ainda não passou no exame de graduação.',
  '— Você ainda está cursando a Academia Ninja.',
  '— Você é apenas aluno da Academia.'
 ]){
  assert.match(apply(c,show,{narrative}).messages.at(-1).text,/já concluiu a Academia/u);
 }
});

test('Gemini recebe a graduação desde o primeiro pedido e a revisão mantém a cena se o provedor falhar',async()=>{
 const c=oldGenin();
 let calls=0;
 const generate=provider({key:'teste',external:false,fetcher:async(_url,options)=>{
  calls++;
  const body=JSON.parse(options.body);
  const ctx=JSON.parse(body.contents[0].parts[0].text);
  const prompt=body.systemInstruction.parts[0].text;
  assert.deepEqual(ctx.protagonistStatus,{affiliation:'Genin',academyGraduated:true});
  assert.match(prompt,/o protagonista já se formou na Academia/);
  if(calls===1)return reply({narrative:contradiction});
  assert.match(prompt,/O rascunho contradisse a graduação do protagonista/);
  return new Response('',{status:503});
 }});
 const n=apply(c,show,await generate(c,show));
 assert.equal(calls,2);
 assert.match(n.messages.at(-1).text,/isso é possível\?/);
 assert.doesNotMatch(n.messages.at(-1).text,/nem terminou/);
});

test('a fala do oponente também respeita a graduação mesmo em combate resolvido pelo motor',()=>{
 const c=campaign('Genin');
 c.day=972;
 c.messages.push({role:'ai',text:'O adversário ergue a guarda para o duelo.',sceneType:'combat',day:c.day});
 const i=input({segments:[{type:'AGIR',text:'Ataco pela lateral.'},{type:'FALAR',text:'Não vou recuar.'}]});
 const n=apply(c,i,{combatSpeech:'— Como fez isso se você nem terminou a Academia?'});
 assert.ok(view(n).combat);
 assert.match(n.messages.at(-1).text,/Como fez isso\?/);
 assert.doesNotMatch(n.messages.at(-1).text,/nem terminou/);
});
