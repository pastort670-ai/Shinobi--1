import test from 'node:test';
import assert from 'node:assert/strict';
import {combatForecast,enforceCombatOutcome} from '../src/combat-difficulty.js';

const campaign=day=>({day,character:{name:'Akira',affiliation:'Genin'},
 messages:[{role:'ai',text:'Itachi se prepara para o duelo.'}]});
const action={segments:[{type:'AGIR',text:'Ataco.'}]};
const win={narrative:'Akira derrotou Itachi com o primeiro golpe.'};

test('Itachi reage com habilidades compatíveis com a data',()=>{
 const early=combatForecast(campaign(971),action);
 const later=combatForecast(campaign(972),action);
 assert.ok(early.active);
 assert.ok(!early.namedOpponent.techniques.includes('Sharingan'));
 assert.ok(later.namedOpponent.techniques.includes('Sharingan'));
 const response=enforceCombatOutcome(campaign(972),action,win);
 assert.ok(response.combatVetoed);
 assert.match(response.narrative,/ativa o Sharingan/);
 const novice={...campaign(972),character:{name:'Akira'}};
 assert.match(enforceCombatOutcome(novice,action,win).narrative,/ativa o Sharingan/);
});

test('falar sobre Itachi e um duelo futuro não inicia combate',()=>{
 assert.equal(combatForecast(campaign(972),{segments:[{type:'FALAR',text:'Quero lutar com Itachi.'}]}).active,false);
});

test('derrubar o rival não encerra o duelo, e a brecha se mantém no turno seguinte',()=>{
 const c=campaign(972);
 const hit={narrative:'Akira derrubou Itachi. Itachi ficou desequilibrado.'};
 assert.equal(enforceCombatOutcome(c,action,hit).narrative,hit.narrative);
 c.messages.push({role:'ai',sceneType:'combat',day:c.day,text:hit.narrative});
 assert.equal(combatForecast(c,action).openingEstablished,true);
 assert.equal(enforceCombatOutcome(c,action,win).combatVetoed,false);
});
