import {test} from 'node:test';
import assert from 'node:assert/strict';
import {apply,create,input,view} from '../src/engine.js';
import {provider} from '../src/gemini.js';

const campaign=()=>create('Pátio Sarutobi',{name:'Kaien Sarutobi',age:7,village:'Konohagakure'});
const say=text=>input({segments:[{type:'FALAR',text}]});
const act=text=>input({segments:[{type:'AGIR',text}]});
const geminiReply=proposal=>Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(proposal)}]}}]});

test('o motor compõe uma explicação utilizável a partir de um rascunho incompleto',async()=>{
 const c=campaign();
 const i=say('Hiruzen, como funciona o Bunshin?');
 let calls=0;
 const generate=provider({key:'teste',external:false,fetcher:async(_url,request)=>{
  calls++;
  const ctx=JSON.parse(JSON.parse(request.body).contents[0].parts[0].text);
  assert.equal(ctx.sceneDirection.topic,'clones');
  assert.deepEqual(ctx.sceneDirection.possibleParticipants,['Hiruzen']);
  return geminiReply({narrative:'Hiruzen acena.\n\nHiruzen acena.',chakraDelta:-180});
 }});
 const proposal=await generate(c,i);
 assert.equal(calls,1);
 assert.equal(proposal.chakraDelta,0);
 const n=apply(c,i,proposal);
 const text=n.messages.at(-1).text;
 assert.equal(text.match(/Hiruzen acena/g).length,1);
 assert.match(text,/Bunshin comum.*não consegue tocar/u);
 assert.doesNotMatch(text,/como funciona/u);
 assert.equal(n.chakra,c.chakra);
 assert.deepEqual(n.jutsus,c.jutsus);
});

test('uma reação completa ou uma recusa do NPC permanece inteira',()=>{
 const c=campaign();
 const i=say('Hiruzen, como funciona o Bunshin?');
 for(const text of ['Hiruzen escuta em silêncio.','Hiruzen explica que o clone comum não tem corpo físico.',
  'Hiruzen responde. — Hoje vamos falar disso só depois da reunião.']){
  assert.equal(apply(c,i,{narrative:text}).messages.at(-1).text,text);
 }
 const absent='Hiruzen acena para o guarda e permanece junto ao portão.';
 assert.equal(apply(c,say('Como funciona o Bunshin?'),{narrative:absent}).messages.at(-1).text,absent);
});

test('o diretor distingue clones das sombras e respeita a fase e conhecimento da campanha',()=>{
 const c=campaign();
 const i=say('Hiruzen, como funciona o Kage Bunshin?');
 const narrative='Hiruzen acena.';
 assert.equal(apply(c,i,{narrative}).messages.at(-1).text,narrative);
 c.jutsus.push({name:'Kage Bunshin no Jutsu',description:'Confirmado nesta campanha.'});
 assert.match(apply(c,i,{narrative}).messages.at(-1).text,/pode tocar objetos e divide o chakra/u);
});

test('corrige fala inventada e cronologia sem registrar consequências da parte rejeitada',()=>{
 const c=campaign();
 const i=act('Continuo perto do portão.');
 const n=apply(c,i,{narrative:'Kaien Sarutobi: “Vou abandonar a vila. Decidi agora.”\nItachi era um adulto e usou Amaterasu.\nHiruzen dobra o mapa do pátio.',
  facts:['Kaien abandonou a vila.'],relations:[{name:'Itachi',description:'Parceiro adulto.'}],
  profileUpdates:[{field:'history',value:'Kaien abandonou a vila.'}]});
 assert.equal(n.messages.at(-1).text,'Hiruzen dobra o mapa do pátio.');
 assert.ok(n.facts.every(fact=>!fact.text.includes('abandonou')));
 assert.deepEqual(n.relations,c.relations);
 assert.deepEqual(n.profile,c.profile);
});

test('a narrativa indica o gasto real do treino e a ficha confirma o mesmo estado',()=>{
 const c=campaign();
 const i=input({hours:8,segments:[{type:'AGIR',text:'Retomo o treino prático do estilo Raio.'}]});
 const n=apply(c,i,{narrative:'Kaien se dirige ao pátio para retomar os treinos práticos com o estilo Raio. Durante oito horas, Kaien refina o fluxo elétrico na lâmina. O desgaste físico exige pausas para recuperar o fôlego.'});
 assert.match(n.messages.at(-1).text,/O esforço reduziu a reserva de chakra/u);
 assert.deepEqual(view(n).conditions,{energy:'cansado',chakra:'reserva disponível'});
});

test('diálogo de combate mantém a provocação válida e descarta vitória falsa',()=>{
 const c=campaign();
 c.day=972;
 c.messages.push({role:'ai',text:'Itachi entra em guarda para o duelo.',sceneType:'combat',day:c.day});
 const i=input({segments:[{type:'AGIR',text:'Ataco diretamente.'},{type:'FALAR',text:'Ainda estou aqui.'}]});
 const same=apply(c,i,{combatSpeech:'— Você me derrotou. O combate terminou.'});
 assert.doesNotMatch(same.messages.at(-1).text,/derrotou|terminou/u);
 const challenge=apply(c,i,{combatSpeech:'— Você se expôs quando avançou.'});
 assert.match(challenge.messages.at(-1).text,/Itachi Uchiha ativa o Sharingan/u);
 assert.match(challenge.messages.at(-1).text,/Você se expôs/u);
 assert.deepEqual(challenge.encounter,same.encounter);
});
