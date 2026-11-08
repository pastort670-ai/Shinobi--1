import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {app} from '../src/server.js';

const response={narrative:'Hiruzen observa o movimento e pede ao mensageiro que proteja os moradores.',
 facts:['Hiruzen requisitou a ajuda de um mensageiro.'],relations:[{name:'Hiruzen',description:'Confia no jovem ninja.'}],training:null,
 energyDelta:0,chakraDelta:0,timeOptions:[1,7],divergences:[],development:['Ganhou reconhecimento entre os moradores.'],
 sceneType:'combat',moment:{title:'Defesa do portão',description:'A vila testemunhou um gesto decisivo.'},
 pendingTasks:[{description:'Voltar ao portão amanhã.',status:'open',dueDay:4}],
 npcKnowledge:[{name:'Hiruzen',fact:'Akira ajudou no portão.'}],openingDay:3};
const srv=app({dbPath:':memory:',access:{required:false},rateMs:0,configured:true,
 generate:async(_c,i)=>i.opening?{...response,narrative:'Em 13 de outubro do Ano 1, Akira está junto aos portões de Konoha, enquanto a vila se reorganiza após a Kyūbi.',sceneType:'normal',moment:null}:response});
await new Promise(r=>srv.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+srv.address().port,{waitUntil:'networkidle'});
 await page.locator('#start').click();
 await page.locator('input[name="name"]').fill('Akira Sarutobi');
 await page.locator('input[name="age"]').fill('2');
 await page.locator('select[name="clan"]').selectOption('Sarutobi');
 await page.locator('textarea[name="history"]').fill('Adotado por Hiruzen.');
 await page.locator('#confirm').check();
 await page.locator('#createform button[type="submit"]').click();
 await page.locator('#acceptintro').waitFor({timeout:15000});
 assert.match(await page.locator('#calendar').innerText(),/13\/10.*Ano 1/s);
 await page.locator('#acceptintro').click();
 await page.locator('#editor').fill('Akira observa os ninjas no portão. ');
 await page.locator('#talk').click();
 await page.keyboard.type('Hiruzen, posso ajudar?');
 await page.locator('#send').click();
 await page.locator('[data-memory-save]').waitFor({timeout:15000});
 assert.equal(await page.locator('#chat .bubble.user.combat-glow').count(),1);
 assert.equal(await page.locator('#chat .bubble.ai.combat-glow').count(),1);
 assert.match(await page.locator('#chat .bubble.user').last().innerText(),/NARRAR:/);
 assert.match(await page.locator('#chat .bubble.user').last().innerText(),/FALAR:/);
 await page.locator('[data-memory-save]').click();
 await page.locator('#menutoggle').click();
 await page.locator('[data-tab="memory"]').click();
 await page.locator('#memorable').getByText('Defesa do portão').waitFor();
 await page.locator('#pendingTasks').getByText('Voltar ao portão amanhã.').waitFor();
 await page.locator('#menutoggle').click();
 await page.locator('[data-tab="story"]').click();
 await page.locator('#time').click();
 await page.locator('#timeactivity').fill('Descanso por um dia.');
 await page.locator('#timeamount').fill('1');
 await page.locator('#send').click();
 await page.locator('#calendar').getByText(/14\/10.*Ano 1/).waitFor({timeout:15000});
 await page.setViewportSize({width:390,height:530});
 await page.locator('#editor').focus();
 await page.waitForTimeout(150);
 const box=await page.locator('#send').boundingBox();
 assert.ok(box&&box.y+box.height<=530,'O botão Enviar deve permanecer visível na tela móvel');
 // Before ending a campaign, the interface must retain a recoverable local backup.
 page.on('dialog',async dialog=>{if(dialog.type()==='prompt')await dialog.accept('ENCERRAR');else await dialog.accept();});
 await page.locator('#more summary').click();
 await page.locator('#closecampaign').click();
 await page.locator('#start').waitFor({timeout:15000});
 await page.locator('#more summary').click();
 await page.locator('#restorelocal').click();
 await page.locator('#hero').getByText('Akira Sarutobi').waitFor({timeout:15000});
 assert.deepEqual(errors,[],'Nenhum erro JavaScript no navegador');
 console.log('Mobile UI smoke passed: creation, intro, mixed editing, combat, memory and time.');
}finally{await browser.close();await new Promise(r=>srv.close(r));}
