import {test} from 'node:test';
import assert from 'node:assert/strict';
import {events,eras} from '../src/lore.js';
import {calendarMilestones} from '../src/calendar-milestones.js';
import {create,view,calendar} from '../src/engine.js';
const event=id=>events.find(e=>e.id===id);
const marker=id=>calendarMilestones.find(e=>e.id==='milestone-'+id);
const YEAR=365;
test('Sasuke sai de Konoha e a missão de resgate começa no dia seguinte',()=>{
 assert.ok(event('sasukeDeparture'));
 assert.ok(marker('sasuke-rescue'));
 assert.equal(marker('sasuke-rescue').day-event('sasukeDeparture').day,1);
 assert.match(marker('sasuke-rescue').detail,/manhã seguinte/);
 assert.ok(marker('sasuke-rescue').day<marker('naruto-journey').day);
});
test('finais Chūnin, invasão e confronto com Gaara pertencem à mesma sequência',()=>{
 assert.equal(marker('chunin-finals').day,event('invasion').day);
 assert.equal(marker('gaara').day,event('invasion').day);
 assert.ok(event('exams').day<event('invasion').day);
 assert.ok(event('invasion').day<event('tsunade').day);
});
test('Naruto enfrenta Pain durante o próprio ataque a Konoha',()=>{
 assert.equal(marker('naruto-pain').day,event('pain').day);
 assert.ok(marker('naruto-sage').day<event('pain').day);
 assert.ok(marker('summit').day>event('pain').day);
});
test('Quarta Guerra não é espalhada por meses',()=>{
 const start=event('war').day;
 assert.equal(marker('war-battles').day,start);
 assert.equal(marker('ten-tails').day,start+1);
 assert.equal(marker('kaguya').day,start+2);
 assert.equal(marker('valley-end').day,start+2);
 assert.equal(eras.find(e=>e.id==='pre-boruto').start,start+2);
 assert.ok(marker('peace').day>start+2);
 assert.ok(marker('peace').day<=start+40);
});
test('o calendário da campanha exibe as mesmas datas e as identifica como aproximações',()=>{
 const c=create('Teste',{name:'Akira',age:2,village:'Konohagakure',clan:'Sarutobi'});
 const v=view(c);
 for(const id of ['sasuke-rescue','chunin-finals','gaara','naruto-pain','war-battles','ten-tails','kaguya','valley-end']){
  const m=marker(id),display=v.calendarEvents.find(e=>e.id===m.id);
  assert.ok(display, 'Marcação no calendário: '+id);
  assert.equal(display.dayIndex,m.day);
  assert.equal(display.confirmedDate,false);
  const date=calendar(m.day);
  assert.equal(display.day,date.day);
  assert.equal(display.year,date.year);
 }
});
