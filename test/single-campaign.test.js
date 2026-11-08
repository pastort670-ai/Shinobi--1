import {test} from 'node:test';
import assert from 'node:assert/strict';
import {app} from '../src/server.js';

test('one campaign per browser: second creation rejected, original save remains',async()=>{
 const server=app({dbPath:':memory:',access:{required:false},rateMs:0,generate:async()=>({narrative:'ok'})});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port+'/api/';
 let cookie='';
 const api=async(path,body)=>{
  const response=await fetch(base+path,{method:body?'POST':'GET',headers:{cookie,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  if(!cookie)cookie=response.headers.get('set-cookie')?.split(';')[0]||'';
  return {status:response.status,data:await response.json()};
 };
 try{
  const character={name:'Akira',age:2,village:'Konohagakure',clan:'Sarutobi',affiliation:'Civil'};
  const first=await api('campaigns',{title:'Original',character});
  assert.equal(first.status,201);
  const second=await api('campaigns',{title:'Duplicada',character});
  assert.equal(second.status,409);
  const campaigns=await api('campaigns');
  assert.equal(campaigns.data.length,1);
  assert.equal(campaigns.data[0].id,first.data.id);
  assert.equal((await api('campaigns/'+first.data.id)).status,200);
  assert.equal((await api('campaigns/'+first.data.id+'/close',{revision:0,confirm:'ERRADO'})).status,400);
  const closed=await api('campaigns/'+first.data.id+'/close',{revision:0,confirm:'ENCERRAR'});
  assert.equal(closed.status,200);
  assert.equal((await api('campaigns/'+first.data.id)).status,404);
  const fresh=await api('campaigns',{title:'Nova',character});assert.equal(fresh.status,201);
  assert.notEqual(fresh.data.id,first.data.id);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
