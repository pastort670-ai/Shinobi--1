import {test} from 'node:test';
import assert from 'node:assert/strict';
import {create,input,apply,view,context} from '../src/engine.js';
import {assessHistoricalIntelligence} from '../src/intelligence-evidence.js';
import {combatForecast,enforceCombatOutcome} from '../src/combat-difficulty.js';
import {readFileSync} from 'node:fs';

const ch={name:'Kaien',age:4,village:'Konohagakure',clan:'Sarutobi',affiliation:'Civil'};
const player=text=>({role:'user',text:'AGIR: '+text,day:0});
const ai=(text,day=0)=>({role:'ai',text,day});
const move=text=>input({segments:[{type:'AGIR',text}]});
const narrative=(text,extra={})=>({narrative:text,facts:[],relations:[],training:null,energyDelta:0,chakraDelta:0,timeOptions:[],divergences:[],...extra});
const c=()=>create('Campanha Kaien',ch);

test('estudo teórico comprovado na história existente avalia Inteligência imediatamente',()=>{
 const old=c();
 old.messages.push(player('Vou estudar.'));old.messages.push(ai('Kaien estudou teoria de chakra na biblioteca sob orientação do mestre.',1));
 const before=JSON.stringify(old);
 const d=view(old).databook;
 assert.ok(d.ratings.intelligence>=1);
 assert.ok(d.intelligenceEvidence.studyCount>=1);
 assert.equal(JSON.stringify(old),before,'apenas abrir a ficha não pode modificar ou reiniciar campanha');
});

test('histórico de estudo e planos aprimora a avaliação sem inventar 5 pontos',()=>{
 const old=c();old.day=6;
 old.messages.push(ai('Kaien estudou teoria de ninjutsu em manuais da Academia.',1));
 old.messages.push(ai('Kaien leu um livro sobre a história das vilas e memorizou o conteúdo.',2));
 old.memories.push({id:'a',status:'saved',title:'Estudos',day:3,description:'Kaien pesquisou estratégias de combate em pergaminhos e compreendeu suas aplicações.'});
 old.messages.push(ai('Kaien elaborou uma estratégia de distração e flanco; o plano funcionou e abriu uma brecha.',4));
 const sheet=view(old).databook;
 assert.ok(sheet.ratings.intelligence>=2);
 assert.ok(sheet.ratings.intelligence<=3.5);
 assert.ok(sheet.intelligenceEvidence.studyCount>=2);
 assert.ok(sheet.intelligenceEvidence.tacticCount>=1);
});

test('inteligência não é dada por promessas ou estudos de NPCs',()=>{
 const old=c();old.messages.push(player('Kaien é inteligente; vai estudar muito amanhã.'));
 old.messages.push(ai('Hiruzen estudou técnicas de combate, enquanto Kaien observou em silêncio.',2));
 old.memories.push({id:'b',status:'dismissed',title:'Relato não confirmado',day:2,description:'Kaien estudou teorias avançadas.'});
 assert.equal(view(old).databook.ratings.intelligence,null);
});

test('uma estratégia planejada e executada no passado pode avaliar Inteligência',()=>{
 const old=c();
 old.memories.push({id:'t',status:'saved',day:1,title:'Conflito',description:'Kaien elaborou um plano para separar o grupo inimigo e obteve vantagem graças ao terreno.'});
 assert.ok(view(old).databook.ratings.intelligence>=1);
 assert.ok(view(old).databook.intelligenceEvidence.tacticCount>=1);
});

test('avaliações superiores já conquistadas não são reduzidas por auditoria retrospectiva',()=>{
 const old=c();old.databook.ratings.intelligence=4;
 old.messages.push(ai('Kaien estudou teoria de ninjutsu.',1));
 assert.equal(view(old).databook.ratings.intelligence,4);
});

test('um novo estudo passa a contar ao continuar a mesma campanha, sem recriar personagem',()=>{
 const old=c();old.introConfirmed=true;
 const next=apply(old,move('Abro o livro de teoria ninja.'),narrative('Kaien estudou fundamentos de chakra por várias horas e compreendeu o exercício.'));
 assert.ok(view(next).databook.ratings.intelligence>=1);
 assert.equal(next.id,old.id);
 assert.equal(next.character.name,old.character.name);
 assert.equal(next.character.age,old.character.age);
 assert.equal(old.databook.ratings.intelligence,undefined);
});

test('iniciantes não derrotam 3 inimigos instantaneamente sem estratégia concreta',()=>{
 const old=c();
 old.messages.push(ai('Três ninjas inimigos cercaram Kaien e avançam pelo pátio.',0));
 const attack=move('Ataco os três ninjas inimigos de frente.');
 const risk=combatForecast(old,attack);
 assert.equal(risk.enemyCount,3);
 assert.equal(risk.blockEasyVictory,true);
 const next=apply(old,attack,narrative('Kaien derrotou todos os inimigos com um único golpe. Todos foram neutralizados.',{sceneType:'combat',facts:['Kaien venceu os 3 inimigos.'],development:['Kaien se tornou invencível.'],energyDelta:0,missionCompletion:{rank:'B',summary:'Missão concluída',evidence:'Kaien derrotou os três inimigos.'}}));
 assert.match(next.messages.at(-1).text,/não encerra o confronto/);
 assert.ok(!next.facts.some(f=>f.text.includes('venceu')));
 assert.ok(next.energy<100);
 assert.equal(view(next).databook.missions.B,0);
});

test('estratégia específica pode permitir superar vários adversários comparáveis',()=>{
 const old=c();old.profile={affiliation:'Genin'};
 old.messages.push(ai('Três genin inimigos tentam cercar Kaien perto de um corredor estreito.',0));
 const attack=move('Ataco usando uma isca para distrair o primeiro, depois uso a cobertura do corredor para separar o grupo e preparo uma armadilha.');
 const plan=combatForecast(old,attack);
 assert.ok(plan.tactics.score>=2);
 assert.equal(plan.blockEasyVictory,false);
 const r=enforceCombatOutcome(old,attack,narrative('Kaien derrotou os três adversários depois de executar a armadilha e explorar o terreno.',{sceneType:'combat'}));
 assert.equal(r.combatVetoed,false);
});

test('um oponente jōnin é ameaça severa para um genin mesmo diante de um bom plano',()=>{
 const old=c();old.profile={affiliation:'Genin'};
 old.messages.push(ai('Um inimigo jōnin experiente bloqueou a passagem de Kaien.',0));
 const attack=move('Ataco o inimigo jōnin. Uso uma isca e uma armadilha escondida na cobertura do terreno.');
 const status=combatForecast(old,attack);
 assert.equal(status.opponentRank,3);
 assert.equal(status.blockEasyVictory,true);
 const next=apply(old,attack,narrative('Kaien derrotou o inimigo jōnin sem dificuldade.',{sceneType:'combat'}));
 assert.match(next.messages.at(-1).text,/não encerra o confronto/);
});

test('combate individual equilibrado não bloqueia vitória comprovada',()=>{
 const old=c();old.profile={affiliation:'Genin'};
 old.messages.push(ai('Um genin inimigo desafia Kaien em um duelo.',0));
 const attack=move('Ataco o genin inimigo buscando uma abertura.');
 const b=combatForecast(old,attack);assert.equal(b.blockEasyVictory,false);
 const r=enforceCombatOutcome(old,attack,narrative('Kaien derrotou o genin adversário após um duelo prolongado.',{sceneType:'combat'}));
 assert.equal(r.combatVetoed,false);
});

test('falar com vários inimigos não gasta energia nem altera a vitória de ninguém',()=>{
 const old=c();old.messages.push(ai('Três ninjas inimigos observam de longe.'));
 const speech=input({segments:[{type:'FALAR',text:'Qual é o objetivo de vocês?'}]});
 const next=apply(old,speech,narrative('Hiruzen explica que o grupo não vai atacar por enquanto.',{sceneType:'normal'}));
 assert.equal(next.energy,100);
 assert.equal(combatForecast(old,speech).active,false);
});

test('falha automática não concede aprendizagem, promoção ou missão indevida',()=>{
 const old=c();old.messages.push(ai('Cinco inimigos cercam Kaien na rua.',0));
 const attack=move('Ataco todos os cinco inimigos.');
 const next=apply(old,attack,narrative('Kaien derrotou todos os inimigos e foi nomeado jōnin após a vitória.',{sceneType:'combat',profileUpdates:[{field:'affiliation',value:'Jōnin'}],learnedJutsus:[{name:'Jutsu Supremo',description:'Aprendido'}],development:['Kaien foi promovido após vencer.'],moment:{title:'Vitória',description:'Kaien derrotou todos os inimigos.'}}));
 assert.notEqual(next.profile.affiliation,'Jōnin');
 assert.equal(next.jutsus.some(j=>j.name==='Jutsu Supremo'),false);
 assert.equal(next.messages.at(-1).memoryCandidate,null);
});

test('interface mostra origem da avaliação de Inteligência e Gemini recebe regras de combate',async()=>{
 const js=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 assert.match(js,/db-intelligence-evidence/);
 const s=(await import('../src/gemini.js')).system;
 assert.match(s,/COMBATE MAIS RIGOROSO/);
 assert.ok(context(c(),move('Ataco o inimigo.')).combatDifficulty);
});
