import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {create,view} from '../src/engine.js';

const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/style.css',import.meta.url),'utf8');
const section=id=>{
 const start=html.indexOf('<section id="'+id+'"');
 assert.ok(start>=0,id+' section missing');
 const end=html.indexOf('<section id="',start+9);
 return html.slice(start,end<0?undefined:end);
};

test('ficha exibe um gráfico com oito atributos; evita a segunda grade visual',()=>{
 const sheet=section('sheet');
 assert.match(sheet,/id="db-graphic"/);
 assert.match(sheet,/id="db-attributes"/);
 assert.match(css,/\.sheet-compact \.db-attributes\{position:absolute!important/);
 assert.match(js,/viewBox="0 0 360 352"/);
 assert.match(js,/class="db-radar-label"/);
 assert.match(js,/class="db-radar-grade"/);
 assert.doesNotMatch(sheet,/Competências ninja existentes/);
 assert.match(sheet,/<details class="db-explanation">/);
});

test('notas e descrições são mostradas no próprio desenho, inclusive desconhecidos',()=>{
 assert.match(js,/const detail=valid\(stat\)\?numbers\?/);
 assert.match(js,/stat\.description:'—'/);
 assert.match(js,/esc\(stat\.label\)/);
 assert.match(js,/esc\(detail\)/);
 assert.match(js,/container\.innerHTML='<svg/);
 assert.match(js,/db-attributes'\)\.textContent=plain/);
});

test('outros dados da ficha continuam consultáveis sem ocupar a primeira dobra da tela',()=>{
 const sheet=section('sheet');
 for(const id of ['sheet-missions','sheet-jutsus','sheet-profile','sheet-training','sheet-history']){
  assert.match(sheet,new RegExp('id="'+id+'"'));
 }
 for(const id of ['db-missions','db-mission-log','db-history','jutsus','sheetcontent','abilities']){
  assert.match(sheet,new RegExp('id="'+id+'"'));
 }
 assert.doesNotMatch(sheet,/<details[^>]+open/,'seções secundárias não devem abrir automaticamente');
});

test('memórias e cronologia exibem resumos, com descrição completa ao toque',()=>{
 const memory=section('memory'),timeline=section('timeline');
 for(const id of ['memorable','relations','pendingTasks','consequences','facts'])assert.match(memory,new RegExp('id="'+id+'"'));
 assert.match(memory,/Memórias Marcantes/);
 assert.match(memory,/<details class="panel-fold">/);
 assert.match(timeline,/id="era-timeline"/);
 assert.match(timeline,/id="events"/);
 assert.match(js,/function compactRecords\(/);
 assert.match(js,/<details class="compact-entry">/);
 assert.match(js,/compact-entry-body/);
 assert.match(js,/Ver mais/);
 assert.match(js,/const events=\(c\.timeline\|\|\[\]\)\.slice\(\)\.reverse\(\)/);
});

test('calendário prioritiza mês e dia, com navegação avançada recolhida',()=>{
 const calendar=section('calendarpage');
 const firstIndex=calendar.indexOf('id="calgrid"'),advancedIndex=calendar.indexOf('class="panel-fold calendar-advanced"');
 assert.ok(firstIndex>=0&&advancedIndex>firstIndex,'meses e anos avançados não devem aparecer antes do calendário');
 assert.match(calendar,/id="calmonth"/);
 for(const id of ['calprev','calnext','caljumpnow','calcurrent','calcurrent-sub','calgrid','caldayinfo','calupcoming','calyearprev','calyearnext','calyears','calmonths'])
  assert.match(calendar,new RegExp('id="'+id+'"'));
 assert.match(calendar,/class="panel-fold calendar-future"/);
 assert.match(js,/\['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'\]/);
 assert.match(js,/class="cal-dot /);
 assert.match(js,/aria-pressed/);
 assert.match(js,/\$\('calbrowsing'\)\.hidden=isHomeMonth/);
});

test('calendário preserva toque, gesto de troca de mês e volta à data atual',()=>{
 assert.match(js,/\$\('calprev'\)\.onclick=\(\)=>calendarGo/);
 assert.match(js,/\$\('calnext'\)\.onclick=\(\)=>calendarGo/);
 assert.match(js,/\$\('caljumpnow'\)\.onclick/);
 assert.match(js,/addEventListener\('touchstart'/);
 assert.match(js,/addEventListener\('touchend'/);
 assert.match(js,/if\(Math\.abs\(dx\)>65/);
 assert.match(css,/\.calendar-simple \.cal-app/);
 assert.match(css,/\.calendar-simple \.month-grid \.cal-cell\.cal-today/);
 assert.match(css,/\.calendar-simple \.month-grid \.cal-cell\.cal-selected/);
});

test('alterações só na apresentação não mudam calendário, ficha, memórias ou progresso do personagem',()=>{
 const c=create('Teste visual',{name:'Kaien',age:4,village:'Konohagakure',affiliation:'Civil',clan:'Sarutobi'});
 c.memories.push({id:'memory',title:'Um marco importante',description:'Kaien concluiu uma missão.',day:1,status:'saved'});
 const before=JSON.stringify(c);
 const sheet=view(c);
 assert.equal(sheet.character.name,'Kaien');
 assert.ok(Array.isArray(sheet.memories));
 assert.ok(sheet.calendar);
 assert.ok(sheet.databook);
 assert.equal(JSON.stringify(c),before);
});
