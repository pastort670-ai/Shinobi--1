import {test} from 'node:test';
import assert from 'node:assert/strict';
import {apply,create,input,view,context} from '../src/engine.js';
import {app} from '../src/server.js';

const campaign=()=>create('Jutsus originais',{name:'Akira Sarutobi',age:18,village:'Konohagakure',affiliation:'Genin'});
const act=text=>input({segments:[{type:'AGIR',text}]});
const technique='Bruma de Vidro';
const action='Experimento minha técnica original '+technique+', moldando chakra.';
const confirmation='Akira concluiu o treino e executou com sucesso '+technique+', formando uma névoa estável.';

test('o turno confirmado salva o jutsu original mesmo sem o campo learnedJutsus',()=>{
 const n=apply(campaign(),act(action),{narrative:confirmation});
 assert.deepEqual(n.jutsus,[{name:technique,description:confirmation,day:0}]);
 assert.deepEqual(view(n).jutsus,n.jutsus);
 assert.deepEqual(context(n,act('Uso '+technique+'.')).jutsus,n.jutsus);
 const later=apply(n,act('Treino a técnica.'),{narrative:confirmation,learnedJutsus:[{name:'bruma-de-vidro',description:'Uma névoa que oculta o campo de visão.'}]});
 assert.equal(later.jutsus.length,1);
 assert.equal(later.jutsus[0].name,technique);
 assert.match(later.jutsus[0].description,/oculta/);
});

test('recupera o nome dado pelo jogador e técnicas nomeadas pelo narrador',()=>{
 const implicit=apply(campaign(),act('Chamo a técnica de luar líquido.'),{narrative:'Você consegue executar a técnica com sucesso.'});
 assert.deepEqual(implicit.jutsus.map(j=>j.name),['luar líquido']);
 const namedByNarrator=apply(campaign(),act('Concluo os experimentos.'),{narrative:'Após o treino, Akira criou uma técnica chamada Cúpula da Névoa.'});
 assert.deepEqual(namedByNarrator.jutsus.map(j=>j.name),['Cúpula da Névoa']);
 const prepared=apply(campaign(),act('Começo a desenvolver o jutsu «Fio de Aço».'),{narrative:'A primeira tentativa falhou.'});
 const finished=apply(prepared,act('Retomo o treino que eu tinha iniciado.'),{narrative:'Finalmente, Akira dominou o Fio de Aço.'});
 assert.deepEqual(finished.jutsus.map(j=>j.name),['Fio de Aço']);
});

test('tentativas, hipóteses, fala pendente e conquistas alheias não são registradas',()=>{
 const drafts=[
  'Akira tentou executar Bruma de Vidro, mas falhou.',
  'Você ainda não domina Bruma de Vidro.',
  'Você poderia dominar Bruma de Vidro com mais treino.',
  'Akira criou um protótipo de Bruma de Vidro.',
  'Hiruzen dominou Bruma de Vidro, e você apenas assistiu.'
 ];
 for(const narrative of drafts){
  assert.deepEqual(apply(campaign(),act(action),{narrative}).jutsus,[],narrative);
 }
 const pending=campaign();
 pending.messages.push({role:'user',day:0,text:action},{role:'ai',day:0,text:confirmation,awaitingNarrator:true});
 assert.deepEqual(view(pending).jutsus,[]);
 const unrelated=apply(campaign(),act('Crio Bolinho de Arroz.'),{narrative:'Akira criou Bolinho de Arroz na cozinha.'});
 assert.deepEqual(unrelated.jutsus,[]);
});

test('backup antigo recupera o jutsu na ficha e permite usá-lo no primeiro turno de combate',async()=>{
 const server=app({dbPath:':memory:',access:{required:false},rateMs:0,
  generate:async()=>{throw new Error('o combate deve ser resolvido pelo motor');}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const root='http://127.0.0.1:'+server.address().port+'/api/';
 let cookie='';
 async function request(path,body){
  const response=await fetch(root+path,{method:body?'POST':'GET',headers:{cookie,'Content-Type':'application/json'},body:body&&JSON.stringify(body)});
  cookie=response.headers.get('set-cookie')?.split(';')[0]||cookie;
  const json=await response.json();
  assert.ok(response.ok,JSON.stringify(json));
  return json;
 }
 try{
  const c=campaign();
  c.messages.push({role:'user',day:0,text:'AGIR: '+action},{role:'ai',day:0,text:confirmation},
   {role:'ai',day:0,text:'Um rival entra em guarda para o duelo.',sceneType:'combat'});
  assert.deepEqual(c.jutsus,[]);
  const saved=await request('import',{format:'shinobi-backup-v1',campaign:c});
  assert.deepEqual(saved.jutsus.map(j=>j.name),[technique]);
  const result=await request('campaigns/'+saved.id+'/turn',{revision:saved.revision,...act('Uso '+technique+'.'),requestId:crypto.randomUUID()});
  assert.ok(result.combat);
  const restored=await request('campaigns/'+saved.id+'/export');
  assert.ok(restored.campaign.chakra<100);
  assert.deepEqual(restored.campaign.jutsus.map(j=>j.name),[technique]);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
