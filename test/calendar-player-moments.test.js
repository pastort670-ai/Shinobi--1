import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {create,apply,input,suggestMoment} from '../src/engine.js';
import {system} from '../src/gemini.js';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const js=read('../public/app.js'),html=read('../public/index.html'),css=read('../public/style.css');
const c=create('Memórias',{name:'Akira',age:2,village:'Konohagakure',clan:'Sarutobi'});
const i=input({segments:[{type:'FALAR',text:'Prometo proteger as crianças.'}]});
const base={narrative:'Hiruzen concorda com Akira.',facts:[],relations:[],training:null,energyDelta:0,chakraDelta:0,timeOptions:[],divergences:[],development:[]};

test('data atual do personagem é independente da navegação do calendário',()=>{
 for(const id of ['calcurrent','calcurrent-sub','caljumpnow','calbrowsing','calselectedheading'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(js,/absolute===c\.day\?'aria-current="date"/);
 assert.match(js,/cal-player-marker/);
 assert.match(js,/year-current/);
 assert.match(js,/calendarSelected=displayedDay\(yr,mo/);
 assert.match(js,/caljumpnow'\)\.onclick/);
 assert.match(css,/\.calendar-now\{/);
 assert.match(css,/\.month-grid \.cal-cell\.cal-today/);
});

test('decisões com consequências sugerem memória mesmo sem moment explícito',()=>{
 const r={...base,consequences:[{description:'Akira decidiu proteger a vila e passou a ser reconhecido pelos guardas.',status:'ongoing'}]};
 const proposed=suggestMoment(c,i,r);
 assert.match(proposed.title,/Decisão/);
 const out=apply(c,i,r);
 assert.match(out.messages.at(-1).memoryCandidate.description,/proteger a vila/);
 assert.equal(out.memories.length,0,'A memória exige confirmação');
 assert.deepEqual(c.memories,[]);
});
test('avanços concretos e compromissos concluídos também podem sugerir memória',()=>{
 assert.match(suggestMoment(c,i,{...base,development:['Akira conquistou a confiança de Hiruzen.']}).description,/confiança/);
 assert.match(suggestMoment(c,i,{...base,pendingTasks:[{id:'one',description:'O acordo com a vila foi cumprido.',status:'done',dueDay:null}]}).title,/cumprido/);
 assert.match(suggestMoment(c,i,{...base,pendingTasks:[{id:null,description:'Akira prometeu proteger os refugiados.',status:'open',dueDay:null}]}).title,/Compromisso/);
});
test('ações comuns não geram memórias automaticamente e memórias salvas não duplicam',()=>{
 assert.equal(suggestMoment(c,input({segments:[{type:'AGIR',text:'Akira espera.'}]}),base),null);
 assert.equal(suggestMoment(c,{days:5,segments:[]},{...base,development:['Ele descansou.']}),null);
 const c2={...c,memories:[{status:'saved',description:'Akira conquistou a confiança de Hiruzen.'}]};
 assert.equal(suggestMoment(c2,i,{...base,development:['Akira conquistou a confiança de Hiruzen.']}),null);
});
test('IA propõe momentos pessoais, confirmações continuam manuais',()=>{
 assert.match(system,/escala PESSOAL/);
 assert.match(system,/Nunca salve automaticamente/);
 assert.match(html,/id="memorable"/);
 assert.match(js,/data-memory-save/);
 assert.match(css,/\.bubble\.ai\.has-memory/);
});
