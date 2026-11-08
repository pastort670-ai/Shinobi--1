import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {eras,eraAt,temporalLore,retrieveLore} from '../src/lore.js';
import {create,input,context,calendar,view} from '../src/engine.js';

const year=365;
test('seis eras progressivas têm transições e contadores coerentes',()=>{
 assert.deepEqual(eras.map(e=>e.name),['Pré-clássico','Clássico','Pré-Shippuden','Shippuden','Pré-Boruto','Boruto']);
 for(let k=0;k<eras.length;k++){
  const era=eraAt(eras[k].start);
  assert.equal(era.name,eras[k].name);
  if(k+1<eras.length){
   assert.equal(era.next.name,eras[k+1].name);
   assert.equal(era.next.inDays,eras[k+1].start-eras[k].start);
   if(eras[k].start>0)assert.equal(eraAt(eras[k].start-1).next.inDays,1);
  }else assert.equal(era.next,null);
 }
 assert.equal(eraAt(0).next.inDays,12*year);
 assert.equal(eraAt(12*year).name,'Clássico');
 assert.equal(eraAt(13*year).name,'Pré-Shippuden');
 assert.equal(eraAt(15*year).name,'Shippuden');
 assert.equal(eraAt(17*year).name,'Pré-Boruto');
 assert.equal(eraAt(33*year).name,'Boruto');
});

test('contexto do Gemini inclui época, idade de Naruto e restrições de papel',()=>{
 const campaign=create('Akira',{name:'Akira',age:6});
 const c=context(campaign,input({segments:[{type:'FALAR',text:'Iruka, você trabalha na Academia?'}]}));
 assert.equal(c.era.name,'Pré-clássico');
 assert.equal(c.referenceAgeNaruto,0);
 assert.match(c.chronologyRules.join(' '),/Iruka/);
 assert.match(c.lore.join(' '),/NÃO leciona|NÃO é instrutor/);
 assert.equal(view(campaign).calendar.era.next.name,'Clássico');
 campaign.day=12*year;
 const later=context(campaign,input({segments:[{type:'FALAR',text:'Iruka'}]}));
 assert.equal(later.era.name,'Clássico');
 assert.match(later.chronologyRules.join(' '),/professor/);
 assert.ok(retrieveLore(0,'Orochimaru').some(s=>s.includes('Orochimaru')));
});

test('interface expõe era, contagem e painel sem usar dados do futuro na narração',()=>{
 const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 for(const id of ['era-info','era-label','era-countdown','era-progress','era-timeline'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(js,/updateEraUI\(date\)/);
 assert.match(js,/timeUntilEra/);
 const p=spawnSync(process.execPath,['--check',new URL('../public/app.js',import.meta.url).pathname],{encoding:'utf8'});
 assert.equal(p.status,0,p.stderr);
});
