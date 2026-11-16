import {test} from 'node:test';
import assert from 'node:assert/strict';
import {create,context,view} from '../src/engine.js';
import {milestoneSources,needsMilestoneAudit,verifiedMilestones} from '../src/milestone-audit.js';
import {app} from '../src/server.js';
import {milestoneAuditor} from '../src/gemini.js';
const ch={name:'Akira Sarutobi',age:2,village:'Konohagakure',clan:'Sarutobi'};
function campaign(){const c=create('Teste',ch);c.memories=[
 {id:'a',status:'saved',title:'Conquista do exame',description:'Akira recebeu sua graduação de Genin e o protetor de testa.',day:20},
 {id:'b',status:'saved',title:'Aprendizado de clones',description:'Akira concluiu o aprendizado do Bunshin no Jutsu depois de vários dias de treino.',day:22},
 {id:'c',status:'dismissed',title:'Rejeitada',description:'Akira dominou o Kage Bunshin no Jutsu.',day:23}
 ];return c;}
test('fontes preferem memórias verdes salvas e não usam memórias rejeitadas',()=>{
 const c=campaign();const src=milestoneSources(c);
 assert.equal(src.filter(s=>s.kind==='saved-memory').length,2);
 assert.ok(!src.some(s=>s.text.includes('Kage Bunshin')));
 assert.equal(needsMilestoneAudit(c),true);
 const ctx=context(c,{segments:[],days:0,hours:0});
 assert.equal(ctx.importantAchievements.length,2);
 assert.match(ctx.importantAchievements[0].text,/Genin/);
});
test('somente evidências literais de registros aceitos atualizam a ficha',()=>{
 const c=campaign();const src=milestoneSources(c);
 const awards=[
  {kind:'rank',value:'Genin',sourceId:'memory-0',evidence:'recebeu sua graduação de Genin'},
  {kind:'jutsu',value:'Bunshin no Jutsu',sourceId:'memory-1',evidence:'concluiu o aprendizado do Bunshin no Jutsu'},
  {kind:'jutsu',value:'Kage Bunshin no Jutsu',sourceId:'memory-2',evidence:'dominou o Kage Bunshin no Jutsu'},
  {kind:'rank',value:'Genin',sourceId:'memory-0',evidence:'Uma frase inventada pelo Gemini e ausente da memória'}
 ];
 const got=verifiedMilestones(c,awards,src);
 assert.equal(got.profile.affiliation,'Genin');
 assert.equal(got.jutsus[0].name,'Bunshin no Jutsu');
 assert.equal(got.jutsus.length,1);
 assert.equal(got.accepted.length,2);
 assert.equal(c.profile.affiliation,undefined);
 assert.equal(c.character.affiliation,'Civil');
});
test('auditoria não interpreta tentativa ou negação como sucesso',()=>{
 const c=create('Teste',ch);c.memories=[{status:'saved',title:'Treino interrompido',description:'Akira tentou o Bunshin no Jutsu, mas não conseguiu aprendê-lo.',day:5}];
 const proposals=[{kind:'jutsu',value:'Bunshin no Jutsu',sourceId:'memory-0',evidence:'Akira tentou o Bunshin no Jutsu, mas não conseguiu aprendê-lo'}];
 assert.equal(verifiedMilestones(c,proposals).jutsus.length,0);
});
test('modelo consulta fontes e retorna evidências estruturadas',async()=>{
 const c=campaign(),src=milestoneSources(c);
 const auditor=milestoneAuditor({key:'teste',fetcher:async(_url,opts)=>{
  const request=JSON.parse(opts.body);const values=JSON.parse(request.contents[0].parts[0].text);
  assert.equal(values.sources.filter(s=>s.kind==='saved-memory').length,2);
  return new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({awards:[{kind:'rank',value:'Genin',sourceId:'memory-0',evidence:'recebeu sua graduação de Genin'}]})}]}}]}));
 }});
 assert.equal((await auditor(c.character,src))[0].value,'Genin');
});
test('HTTP: revisar automaticamente e salvar conquistas apenas uma vez',async()=>{
 let called=0;
 const s=app({dbPath:':memory:',access:{required:false},auditMilestones:async()=>{called++;return [
  {kind:'rank',value:'Genin',sourceId:'memory-0',evidence:'recebeu sua graduação de Genin'},
  {kind:'jutsu',value:'Bunshin no Jutsu',sourceId:'memory-1',evidence:'concluiu o aprendizado do Bunshin no Jutsu'}];},rateMs:0});
 await new Promise(resolve=>s.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+s.address().port;
 try{
  const start=await fetch(base+'/api/status'),cookie=start.headers.get('set-cookie')?.split(';')[0];
  assert.ok(cookie);
  const raw={format:'shinobi-backup-v1',campaign:campaign()};
  const imported=await fetch(base+'/api/import',{method:'POST',headers:{cookie,'Content-Type':'application/json'},body:JSON.stringify(raw)});
  assert.equal(imported.status,201);
  const c=await imported.json();assert.equal(c.needsMilestoneAudit,true);
  const audit=await fetch(base+'/api/campaigns/'+c.id+'/audit',{method:'POST',headers:{cookie,'Content-Type':'application/json'},body:JSON.stringify({revision:c.revision})});
  assert.equal(audit.status,200);
  const after=await audit.json();assert.equal(after.profile.affiliation,'Genin');
  assert.equal(after.jutsus.length,1);assert.equal(after.needsMilestoneAudit,false);
  assert.equal(after.character.affiliation,'Civil');
  const again=await fetch(base+'/api/campaigns/'+c.id+'/audit',{method:'POST',headers:{cookie,'Content-Type':'application/json'},body:JSON.stringify({revision:after.revision})});
  assert.equal(again.status,200);assert.equal(called,1);
 }finally{await new Promise(resolve=>s.close(resolve));}
});
