import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../public/style.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');

test('cabeçalho e logo são compactos preservando funções da navegação',()=>{
 assert.match(css,/\.topbar\{height:50px;min-height:50px/);
 assert.match(css,/\.brand\{font-size:15px/);
 assert.match(css,/\.welcome-seal\{width:45px;height:45px/);
 for(const id of ['menutoggle','calendar','more','chat','send'])assert.match(html,new RegExp('id="'+id+'"'));
});
test('rajados do chat mudam com tema e o escuro usa roxo',()=>{
 assert.match(css,/html\[data-theme=light\] #chat\{/);
 assert.match(css,/html\[data-theme=dark\] #chat\{/);
 assert.match(css,/--accent:#b292ff;/);
 assert.match(css,/rgba\(220,112,47,/);
 assert.match(css,/rgba\(165,120,247,/);
 assert.match(app,/shinobi-theme/);
 assert.match(app,/dataset\.theme=value/);
});
