import {test} from 'node:test';
import assert from 'node:assert/strict';
import {create,apply,view,context,input,validate} from '../src/engine.js';
import {system,schema} from '../src/gemini.js';
const character={name:'Akira',age:2,village:'Konohagakure',clan:'Sarutobi'};
const response={narrative:'Após uma semana de treinamento, Akira retorna à vila.',facts:[],relations:[],training:null,energyDelta:0,chakraDelta:0,timeOptions:[],divergences:[],profileUpdates:[{field:'skills',value:'Controle de chakra aprimorado.'},{field:'affiliation',value:'Genin'}],learnedJutsus:[{name:'Bunshin no Jutsu',description:'Técnica básica de clonagem.'}]};
test('ficha original permanece selada, enquanto perfil e jutsus evoluem',()=>{
 const c=create('Teste',character);const n=apply(c,input({days:7}),response);
 assert.equal(c.character.affiliation,'Civil');assert.equal(n.character.affiliation,'Civil');
 assert.equal(view(n).profile.affiliation,'Genin');
 assert.equal(view(n).profile.skills,'Controle de chakra aprimorado.');
 assert.equal(view(n).jutsus.length,1);
 assert.equal(n.day,7);
 const again=apply(n,input({segments:[{type:'AGIR',text:'Pratico a técnica.'}]}),response);
 assert.equal(again.jutsus.length,1);
 assert.equal(again.profile.affiliation,'Genin');
 assert.equal(context(again,input({segments:[{type:'FALAR',text:'Consegui aprender!'}]})).jutsus[0].name,'Bunshin no Jutsu');
});
test('não altera identidade fixa nem aceita registros inválidos',()=>{
 const c=create('Teste',character);
 const n=apply(c,input({segments:[{type:'AGIR',text:'Treino.'}]}),{...response,profileUpdates:[{field:'name',value:'Outro nome'},{field:'skills',value:'Progresso'}],learnedJutsus:[]});
 assert.equal(n.character.name,'Akira');assert.equal(n.profile.name,undefined);
 assert.throws(()=>validate({...response,learnedJutsus:'jutsu'}));
 assert.throws(()=>validate({...response,profileUpdates:'ficha'}));
});
test('o narrador recebe orientação explícita para saltos e esquema de evolução',()=>{
 const c=create('Teste',character);const t=context(c,input({hours:12}));
 assert.equal(t.requestedTimeNarration.hours,12);
 assert.match(t.requestedTimeNarration.instruction,/intervalo/);
 assert.match(system,/RESUMA PRIMEIRO/);
 assert.ok(schema.properties.learnedJutsus);
 assert.ok(schema.properties.profileUpdates);
});
