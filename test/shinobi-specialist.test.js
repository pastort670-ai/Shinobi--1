import {test} from 'node:test';
import assert from 'node:assert/strict';
import {specialistKnowledge} from '../src/specialist-knowledge.js';
import {searchSpecialistKnowledge,buildSpecialistBrief} from '../src/shinobi-specialist.js';
import {create,input,context} from '../src/engine.js';
import {provider} from '../src/gemini.js';

const character={name:'Akira',age:2,village:'Konohagakure',clan:'Sarutobi'};
const turn=text=>input({segments:[{type:'FALAR',text}]});

test('biblioteca especialista é grande, organizada e sem duplicações',()=>{
 assert.ok(specialistKnowledge.length>=180);
 assert.equal(new Set(specialistKnowledge.map(x=>x.id)).size,specialistKnowledge.length);
 assert.equal(new Set(specialistKnowledge.map(x=>x.title)).size,specialistKnowledge.length);
 assert.ok(new Set(specialistKnowledge.map(x=>x.category)).size>=7);
 for(const item of specialistKnowledge){
  assert.ok(item.title&&item.summary&&item.tags);
  assert.ok(Number.isInteger(item.from)&&item.from>=0);
  assert.ok(item.summary.length<=350);
 }
});

test('pesquisa recupera informações pertinentes e não traz spoilers de outra era',()=>{
 const early=searchSpecialistKnowledge('Time 7 Kakashi Naruto Sakura',{day:0,limit:12});
 assert.ok(!early.some(x=>x.title==='Time 7'));
 const classic=searchSpecialistKnowledge('Time 7 Kakashi Naruto Sakura',{day:12*365});
 assert.ok(classic.some(x=>x.title==='Time 7'));
 const birth=searchSpecialistKnowledge('Konohamaru Sarutobi',{day:0});
 assert.ok(!birth.some(x=>x.title==='Konohamaru Sarutobi'));
 const training=searchSpecialistKnowledge('Controle de chakra treino genin',{day:0});
 assert.ok(training.some(x=>/chakra/i.test(x.title)||/chakra/i.test(x.text)));
});

test('briefing não altera a campanha, usa só memórias salvas e preserva ficha',()=>{
 const c=create('Teste',character);
 c.memories=[{status:'saved',title:'Conquista',description:'Akira ganhou reconhecimento.',day:0},{status:'dismissed',title:'Falsa lembrança',description:'Não salvar.',day:0}];
 c.pendingTasks=[{status:'open',description:'Treinar com Hiruzen.',dueDay:3},{status:'done',description:'Fazer a mesma promessa de novo.',dueDay:0}];
 c.relations.Hiruzen='Pai adotivo e mestre.';
 c.jutsus=[{name:'Bunshin no Jutsu',description:'Demonstrado',day:0}];
 const before=JSON.stringify(c);
 const brief=buildSpecialistBrief(c,turn('Hiruzen, vou treinar chakra com você.'));
 assert.equal(brief.role.includes('O Gemini permanece o único narrador.'),true);
 assert.equal(brief.memoryAssistant.savedMoments.length,1);
 assert.equal(brief.memoryAssistant.openPromises.length,1);
 assert.equal(brief.memoryAssistant.relationsInScene[0].name,'Hiruzen');
 assert.ok(brief.sheetAssistant.confirmedJutsus.includes('Bunshin no Jutsu'));
 assert.equal(brief.sheetAssistant.initialSheetLocked,true);
 assert.ok(brief.knowledge.length<=8);
 assert.equal(JSON.stringify(c),before);
});

test('contexto do Gemini inclui o especialista sem remover os mecanismos anteriores',()=>{
 const c=create('Teste',character);
 const ctx=context(c,turn('Hiruzen, qual seria o treino adequado a um genin?'));
 assert.ok(ctx.specialist);
 assert.ok(ctx.specialist.knowledge.some(x=>/Hiruzen|genin|treino|chakra/i.test(x.title+' '+x.text)));
 assert.ok(Array.isArray(ctx.memoryFocus));
 assert.ok(ctx.worldEngine);
 assert.ok(ctx.chronologyRules);
 assert.equal(ctx.specialist.chronology.day,0);
});

test('provedor Gemini permanece narrador e recebe parecer especialista na mesma chamada',async()=>{
 const c=create('Teste',character),i=turn('Hiruzen, me ensine sobre chakra.');
 const out={narrative:'Hiruzen explica os fundamentos do controle de chakra.',facts:[],relations:[],training:null,energyDelta:0,chakraDelta:0,timeOptions:[],divergences:[]};
 let calls=0;
 const generate=provider({key:'mock-key',external:false,fetcher:async(url,req)=>{
  calls++;
  const body=JSON.parse(req.body);
  const ctx=JSON.parse(body.contents[0].parts[0].text);
  assert.ok(ctx.specialist.knowledge.length>0);
  assert.ok(ctx.specialist.sheetAssistant.initialSheetLocked);
  assert.match(body.systemInstruction.parts[0].text,/especialista local/);
  return new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(out)}]}}]}));
 }});
 const r=await generate(c,i);
 assert.equal(calls,1);
 assert.equal(r.narrative,out.narrative);
 assert.equal(r.lookupStatus,'disabled');
});
