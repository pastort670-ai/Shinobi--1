import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {app} from '../src/server.js';
const response={narrative:'O mundo responde e a cena avança.',facts:['Uma pista foi encontrada.'],relations:[{name:'Hiruzen',description:'Confiou em Akira.'}],training:{skill:'ninjutsu',gain:2},energyDelta:-7,chakraDelta:-9,timeOptions:[1],divergences:[]};
async function launch(dbPath){const server=app({dbPath,rateMs:0,access:{required:false},generate:async()=>response,configured:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));return {server,url:'http://127.0.0.1:'+server.address().port};}
async function request(s,path,{cookie='',body,method}={}){const r=await fetch(s.url+'/api/'+path,{method:method||(body?'POST':'GET'),headers:{cookie,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,cookie:r.headers.get('set-cookie')?.split(';')[0],data:await r.json()};}
test('excluir mensagem antiga reverte também respostas seguintes, dias, memórias, relações e progressão',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'shinobi-rewind-'));let s=await launch(join(dir,'db'));try{
    const created=await request(s,'campaigns',{body:{title:'Akira',character:{name:'Akira',age:6}}});
    const cookie=created.cookie,id=created.data.id,path='campaigns/'+id;
    const before=await request(s,path,{cookie});
    assert.deepEqual(before.data.undoableMessages,[]);
    let t=await request(s,path+'/turn',{cookie,body:{revision:0,days:3,segments:[{type:'FALAR',text:'Primeiro turno'}]}});
    assert.equal(t.status,200);assert.deepEqual(t.data.undoableMessages,[1]);
    t=await request(s,path+'/turn',{cookie,body:{revision:1,days:5,segments:[{type:'AGIR',text:'Segundo turno'}]}});
    assert.equal(t.status,200);assert.deepEqual(t.data.undoableMessages,[1,3]);
    t=await request(s,path+'/turn',{cookie,body:{revision:2,days:8,segments:[{type:'FALAR',text:'Terceiro turno'}]}});
    assert.equal(t.status,200);assert.deepEqual(t.data.undoableMessages,[1,3,5]);
    assert.equal(t.data.day,16);assert.equal(t.data.messages.length,7);assert.equal(t.data.facts.length,6);
    assert.equal((await request(s,path+'/rewind',{cookie,body:{revision:2,messageIndex:3}})).status,409);
    assert.equal((await request(s,path+'/rewind',{cookie:'',body:{revision:3,messageIndex:3}})).status,404);
    assert.equal((await request(s,path+'/rewind',{cookie,body:{revision:3,messageIndex:4}})).status,400);
    const restored=await request(s,path+'/rewind',{cookie,body:{revision:3,messageIndex:3}});
    assert.equal(restored.status,200);
    assert.equal(restored.data.day,3);
    assert.equal(restored.data.messages.length,3);
    assert.equal(restored.data.facts.length,2);
    assert.equal(restored.data.revision,4);
    assert.deepEqual(restored.data.undoableMessages,[1]);
    assert.equal(restored.data.relations.Hiruzen,'Confiou em Akira.');
    assert.equal(restored.data.abilities.ninjutsu,'iniciante');
    assert.equal((await request(s,path+'/rewind',{cookie,body:{revision:4,messageIndex:3}})).status,400);
    await new Promise(r=>s.server.close(r));s=await launch(join(dir,'db'));
    let persisted=await request(s,path,{cookie});
    assert.equal(persisted.data.day,3);assert.deepEqual(persisted.data.undoableMessages,[1]);
    const restart=await request(s,path+'/turn',{cookie,body:{revision:4,segments:[{type:'FALAR',text:'Outra escolha'}]}});
    assert.equal(restart.status,200);assert.equal(restart.data.messages.length,5);
    const original=await request(s,path+'/rewind',{cookie,body:{revision:5,messageIndex:1}});
    assert.equal(original.status,200);assert.equal(original.data.day,0);
    assert.equal(original.data.messages.length,1);assert.deepEqual(original.data.facts,[]);
    assert.deepEqual(original.data.relations,{});assert.equal(original.data.revision,6);
  }finally{await new Promise(r=>s.server.close(r));rmSync(dir,{recursive:true,force:true});}
});
test('regenerar mantém checkpoint do turno e permite desfazer',async()=>{
  const s=await launch(':memory:');try{
    const created=await request(s,'campaigns',{body:{title:'X',character:{name:'Akira',age:6}}});
    const id=created.data.id,cookie=created.cookie,path='campaigns/'+id;
    let t=await request(s,path+'/turn',{cookie,body:{revision:0,days:10}});assert.equal(t.status,200);
    t=await request(s,path+'/regenerate',{cookie,body:{revision:1}});assert.equal(t.status,200);
    assert.equal(t.data.day,10);
    t=await request(s,path+'/rewind',{cookie,body:{revision:2,messageIndex:1}});
    assert.equal(t.status,200);assert.equal(t.data.day,0);assert.equal(t.data.messages.length,1);
  }finally{await new Promise(r=>s.server.close(r));}
});
