import {test} from 'node:test';
import assert from 'node:assert/strict';
import {create,input} from '../src/engine.js';
import {verifiedMilestones} from '../src/milestone-audit.js';
import {narrationQuality} from '../src/narrator-guard.js';
const character={name:'Akira Sarutobi',age:6,village:'Konohagakure',clan:'Sarutobi'};
test('memória marcante de Hiruzen não concede a Akira o Bunshin',()=>{
 const c=create('Campanha',character);
 c.memories=[{status:'saved',title:'Treino com Hiruzen',description:'Hiruzen usou Bunshin no Jutsu diante de Akira.',day:2}];
 const p=[{kind:'jutsu',value:'Bunshin no Jutsu',sourceId:'memory-0',evidence:'Hiruzen usou Bunshin no Jutsu diante de Akira'}];
 assert.equal(verifiedMilestones(c,p).jutsus.length,0);
});
test('memória de promoção de Konohamaru não torna Akira genin',()=>{
 const c=create('Campanha',character);
 c.memories=[{status:'saved',title:'Notícia da academia',description:'Akira soube que Konohamaru foi promovido a genin.',day:2}];
 const p=[{kind:'rank',value:'Genin',sourceId:'memory-0',evidence:'Akira soube que Konohamaru foi promovido a genin'}];
 assert.equal(verifiedMilestones(c,p).profile.affiliation,undefined);
});
test('conquistas explicitamente atribuídas ao protagonista continuam válidas',()=>{
 const c=create('Campanha',character);
 c.memories=[
  {status:'saved',title:'Exame concluído',description:'Akira recebeu sua graduação de Genin após o exame.',day:4},
  {status:'saved',title:'Treino concluído',description:'Akira concluiu o aprendizado do Bunshin no Jutsu.',day:5}
 ];
 const p=[
  {kind:'rank',value:'Genin',sourceId:'memory-0',evidence:'recebeu sua graduação de Genin'},
  {kind:'jutsu',value:'Bunshin no Jutsu',sourceId:'memory-1',evidence:'concluiu o aprendizado do Bunshin no Jutsu'}
 ];
 const r=verifiedMilestones(c,p);
 assert.equal(r.profile.affiliation,'Genin');
 assert.equal(r.jutsus[0]?.name,'Bunshin no Jutsu');
 assert.equal(r.accepted.length,2);
});
test('eco de Sim do jogador é retirado; resposta idêntica de Hiruzen não é',()=>{
 const c=create('Diálogo',character);
 const i=input({segments:[{type:'FALAR',text:'Sim.'}]});
 const echo=narrationQuality(c,i,'Akira respondeu: "Sim."\nHiruzen abriu o livro.');
 assert.doesNotMatch(echo.narrative,/Sim/);
 assert.match(echo.narrative,/Hiruzen abriu/);
 const npc=narrationQuality(c,i,'Hiruzen respondeu: "Sim."');
 assert.match(npc.narrative,/Sim/);
});
