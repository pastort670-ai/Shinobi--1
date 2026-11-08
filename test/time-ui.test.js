import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');

test('modo tempo só apresenta o botão compartilhado Enviar',()=>{
 assert.match(html,/id="timebox"/);
 assert.match(html,/id="send"/);
 assert.doesNotMatch(html,/id="advance"/);
 assert.doesNotMatch(js,/\$\('advance'\)/);
});

test('Enviar usa a duração selecionada no modo tempo e ação normal fora dele',()=>{
 assert.match(js,/days===null\)days=\$\('timebox'\)\.hidden\?0:Number\(\$\('duration'\)\.value\)\*Number\(\$\('unit'\)\.value\)/);
 assert.match(js,/\$\('send'\)\.onclick=\(\)=>send\(\)/);
 assert.match(js,/\$\('timebox'\)\.hidden=true;render\(\)/);
 assert.match(js,/\$\('timebox'\)\.hidden=true;const last/);
 assert.match(js,/\$\('unit'\)\.value='1'/);
});
