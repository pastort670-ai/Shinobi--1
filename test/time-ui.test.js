import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');

test('TEMPO usa bloco de atividade no compositor, sem aba nem botão próprio',()=>{
 assert.match(html,/id="drafts"/);
 assert.match(html,/id="send"/);
 assert.doesNotMatch(html,/id="timebox"/);
 assert.doesNotMatch(html,/id="advance"/);
 assert.match(js,/choose\('TEMPO'\)/);
 assert.match(js,/ATIVIDADE DURANTE O TEMPO/);
 assert.match(js,/class="time-inline-controls"/);
 assert.doesNotMatch(js,/\$\('timebox'\)/);
});

test('envia a atividade de TEMPO como AGIR e usa os dias escolhidos',()=>{
 assert.match(js,/if\(timeActive\)/);
 assert.match(js,/days=timeActive\?Number\(timeAmount\)\*Number\(timeUnit\):0/);
 assert.match(js,/segments.push\(\{type:'AGIR',text:timeText.trim\(\)\}\)/);
 assert.match(js,/timeActive&&!timeText.trim\(\)/);
 assert.match(js,/\$\('send'\)\.onclick=\(\)=>send\(\)/);
 assert.match(js,/id="timeamount"/);
});

test('o JavaScript do compositor tem sintaxe válida',()=>{
 const p=spawnSync(process.execPath,['--check',new URL('../public/app.js',import.meta.url).pathname],{encoding:'utf8'});
 assert.equal(p.status,0,p.stderr);
});
