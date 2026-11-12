import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {create,apply,input,view,calendar,validate} from '../src/engine.js';

const base={narrative:'A cena avança.',facts:[],relations:[],training:null,energyDelta:0,chakraDelta:0,timeOptions:[],divergences:[]};

test('ficha trava origem e acumula desenvolvimento narrativo sem inventar progressão',()=>{
 const c=create('Akira',{name:'Akira',age:6,personality:'Curioso',skills:'Aprendiz'});
 const first=apply(c,input({segments:[{type:'AGIR',text:'Treino básico'}]}),{...base,development:['Aprendeu a se orientar na mata.','Passou a agir com maior cautela.']});
 assert.equal(first.character.personality,'Curioso');
 assert.equal(first.character.skills,'Aprendiz');
 assert.deepEqual(first.development.map(g=>g.text),['Aprendeu a se orientar na mata.','Passou a agir com maior cautela.']);
 assert.deepEqual(c.development,[]);
 const second=apply(first,input({segments:[{type:'FALAR',text:'Obrigado'}]}),{...base,development:['Passou a agir com maior cautela.']});
 assert.equal(second.development.length,2);
 assert.equal(view(second).development.length,2);
 const noGrowth=apply(second,input({segments:[{type:'FALAR',text:'Olá'}]}),base);
 assert.equal(noGrowth.development.length,2);
});

test('desenvolvimento inválido não é persistido',()=>{
 assert.throws(()=>validate({...base,development:['a'.repeat(301)]}));
 assert.throws(()=>validate({...base,development:5}));
 assert.throws(()=>validate({...base,development:['a','b','c','d','e']}));
});

test('o calendário carrega marcos, aniversários e sinaliza data certa vs aproximada',()=>{
 const c=create('Akira',{name:'Akira',age:6});
 const v=view(c);
 const attack=v.calendarEvents.find(e=>e.id==='kyubi');
 assert.equal(attack.day,10);assert.equal(attack.month,10);assert.equal(attack.year,1);
 assert.equal(attack.dayIndex,0);assert.equal(attack.confirmedDate,true);
 const massacre=v.calendarEvents.find(e=>e.id==='uchiha');
 assert.equal(massacre.confirmedDate,false);
 const birthday=v.calendarEvents.find(e=>e.id==='birthday-12');
 assert.equal(birthday.dayIndex,12*365);
 assert.equal(birthday.day,10);assert.equal(birthday.month,10);assert.equal(birthday.year,13);
 assert.equal(calendar(365).month,10);
 assert.equal(v.calendarEraEvents.length,6);
});

test('ficha e desenvolvimento ficam na mesma aba; calendário separado navega',()=>{
 const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 for(const id of ['jutsus','sheetcontent','conditions','abilities','calendarpage','calgrid','calprev','calnext','calupcoming'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.doesNotMatch(html,/id="development" class="page-view"/);
 assert.match(html,/Ficha do personagem/);
 assert.match(js,/drawCalendar\(\)/);
 assert.match(js,/calendarEvents/);
 assert.match(js,/development\|\|\[\]/);
 const syntax=spawnSync(process.execPath,['--check',new URL('../public/app.js',import.meta.url).pathname],{encoding:'utf8'});
 assert.equal(syntax.status,0,syntax.stderr);
});
