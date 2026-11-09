import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {create,view,calendar} from '../src/engine.js';
import {calendarMilestones} from '../src/calendar-milestones.js';
import {app} from '../src/server.js';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const js=read('../public/app.js');
const html=read('../public/index.html');
const css=read('../public/style.css');
const svg=read('../public/village-icons.svg');
const c=create('Teste',{name:'Akira',age:2,village:'Konohagakure',clan:'Sarutobi'});
test('calendário indexa mais marcos históricos de Naruto ao longo dos anos',()=>{
 const v=view(c),ids=new Set(v.calendarEvents.map(e=>e.id));
 assert.ok(calendarMilestones.length>=30);
 assert.ok(ids.has('milestone-waves')&&ids.has('milestone-kaguya')&&ids.has('milestone-momoshiki'));
 for(const m of calendarMilestones){assert.equal(m.confirmedDate,false);assert.equal(ids.has(m.id),true);}
 assert.equal(calendar(15*365).year,16);
});
test('eventos próximos limitados aos dois anos seguintes e cronologia total acessível',()=>{
 assert.match(js,/const horizon=c.day\+730/);
 assert.match(js,/e.dayIndex>=c.day&&e.dayIndex<=horizon/);
 assert.match(js,/length:100/);
 assert.doesNotMatch(html,/id="calmonthselect"/);
 assert.doesNotMatch(html,/id="calyearinput"/);
 assert.match(html,/id="calmonths"/);
 assert.match(html,/id="calyears"/);
 assert.match(html,/id="calyearprev"/);
 assert.match(html,/id="calyearnext"/);
 assert.match(html,/id="caljumpnow"/);
 assert.match(js,/touchstart/);
 assert.match(js,/touchend/);
 assert.equal(view(c).calendarEvents.some(e=>e.dayIndex>730),true);
});
test('todos os símbolos das vilas selecionáveis têm correspondência',()=>{
 const list=view(c).characterOptions.villages;
 for(const [name] of list){
  if(name==='Sem vila')continue;
  const id=name.toLowerCase();
  assert.match(svg,new RegExp('id="'+id+'"'));
  assert.ok(js.includes(name+":'"+id+"'"),'Mapeamento de '+name);
 }
 assert.match(html,/class="shinobi-leaf village-symbol"/);
 assert.match(svg,/id="independent"/);
 assert.match(html,/village-icons\.svg#konohagakure/);
 assert.match(html,/village-icons.svg#independent/);
});
test('modo noturno usa roxo nos acentos, sem apagar sinais de combate ou memória',()=>{
 assert.match(css,/html\[data-theme=dark\]\{[\s\S]*?--accent:#ad85ff/);
 assert.match(css,/html\[data-theme=dark\] \.primary\{/);
 assert.match(css,/html\[data-theme=dark\] \.topbar\{/);
 assert.match(css,/memory-proposal/);
 assert.match(css,/review-warning/);
});
test('servidor serve ícones SVG como mídia local sem exibir arquivos arbitrários',async()=>{
 const server=app({dbPath:':memory:',rateMs:0,access:{required:false}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
  const root='http://127.0.0.1:'+server.address().port;
  const response=await fetch(root+'/village-icons.svg');
  assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/image\/svg\+xml/);
  assert.match(await response.text(),/id="sunagakure"/);
  const rejected=await fetch(root+'/src/engine.js');assert.equal(rejected.status,404);
 }finally{await new Promise(r=>server.close(r));}
});