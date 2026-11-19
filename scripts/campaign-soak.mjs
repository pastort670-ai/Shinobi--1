// Runs only against a disposable local SQLite database and a scripted narrator.
// SOAK_MINUTES=90 node scripts/campaign-soak.mjs
import assert from 'node:assert/strict';
import { setTimeout as pause } from 'node:timers/promises';
import { app } from '../src/server.js';

const minutes = Number(process.env.SOAK_MINUTES || 1);
assert.ok(Number.isFinite(minutes) && minutes > 0);
const started = Date.now(), deadline = started + minutes * 60_000;
let completed = 0, turns = 0, imported = 0;
const server = app({dbPath:':memory:', access:{required:false}, rateMs:0, generate:async (campaign, input) => ({
  narrative:input.hours ? 'A espera termina. O mensageiro deixa um envelope sobre a mesa.' :
    'O mensageiro confere o selo, guarda o pergaminho e oferece um lugar para aguardar a resposta.',
  facts:['O mensageiro recebeu o pergaminho.'], timeAvailable:true,
  timeChoices:[{hours:8,label:'Aguardar o mensageiro',action:'Aguardo perto da mesa.'}]
})});
await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
const origin = 'http://127.0.0.1:' + server.address().port + '/api/';
function actor() {
 let cookie = '';
 return async (path, body, expected = 200) => {
  const res = await fetch(origin + path, {method:body ? 'POST' : 'GET',
    headers:{cookie,'Content-Type':'application/json'}, body:body ? JSON.stringify(body) : undefined});
  cookie = res.headers.get('set-cookie')?.split(';')[0] || cookie;
  const data = await res.json();
  assert.equal(res.status, expected, path + ' ' + (data.error || ''));
  return data;
 };
}
async function cycle(index) {
 const active = actor(), other = actor();
 const rank = ['Genin','Civil','Academia Ninja','Jōnin'][index % 4];
 const name = ['Ren Takeda','Akira Hayama','Kaien Sarutobi'][index % 3];
 const ch = {name,age:6+index%20,affiliation:rank,village:['Konohagakure','Sunagakure','Iwagakure'][index%3]};
 let c = await active('campaigns',{title:'Ensaio '+index,character:ch},201);
 const path = 'campaigns/'+c.id;
 await other(path,undefined,404);
 c = await active(path+'/intro-confirm',{revision:c.revision});
 const roster = c.team;
 for(let n=0; n<3+index%12; n++) {
  const segments = [{type:'AGIR',text:'Entrego o documento '+n+'.'},{type:'FALAR',text:'Posso aguardar a resposta?'}];
  const before = c;
  const hours = n%3===1 && before.timeAvailable ? Math.min(8,before.timeMaxHours) : 0;
  c = await active(path+'/turn',{revision:before.revision,segments,hours});
  turns++;
  assert.equal(c.revision,before.revision+1);
  assert.ok(c.day>=before.day);
  assert.deepEqual(c.team,roster);
  if(n===1) await active(path+'/turn',{revision:before.revision,segments},409);
 }
 const backup = await active(path+'/export');
 const copy = await other('import',backup,201);
 assert.notEqual(copy.id,c.id);
 for(const field of ['character','team','messages','calendar','conditions','timeChoices','facts'])
  assert.deepEqual(copy[field],c[field],field);
 imported++;
 await other('campaigns/'+copy.id+'/close',{revision:copy.revision,confirm:'ENCERRAR'});
 await active(path+'/close',{revision:c.revision,confirm:'ENCERRAR'});
 assert.equal((await active('campaigns')).length,0);
}
let reportAt = 0;
try {
 do {
  await cycle(completed);
  completed++;
  if(Date.now() >= reportAt) {
   console.log(JSON.stringify({minutes:(Date.now()-started)/60000,completed,turns,imported}));
   reportAt = Date.now()+60_000;
  }
  await pause(Math.min(5000,Math.max(0,deadline-Date.now())));
 } while(Date.now()<deadline);
 console.log(JSON.stringify({result:'passed',seconds:(Date.now()-started)/1000,completed,turns,imported}));
} finally { await new Promise(resolve=>server.close(resolve)); }
