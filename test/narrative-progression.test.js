import {test} from 'node:test';
import assert from 'node:assert/strict';
import {system, provider} from '../src/gemini.js';
import {create,input,apply} from '../src/engine.js';

test('instruções exigem progressão causal e iniciativa dos NPCs sem controlar jogador',()=>{
  assert.match(system,/MOTOR DE PROGRESSÃO NARRATIVA/);
  assert.match(system,/desenvolvimento novo e verificável/);
  assert.match(system,/NPCs devem agir por iniciativa própria/);
  assert.match(system,/Não controle falas, pensamentos ou decisões do jogador/);
  assert.match(system,/Não introduza crises artificiais/);
});

test('turnos mistos preservam ações e falas na sequência original',async()=>{
  const c=create('Progressão',{name:'Akira',age:6});
  const segments=[
    {type:'AGIR',text:'Aproximo-me do Hokage.'},
    {type:'FALAR',text:'O que aconteceu?'},
    {type:'AGIR',text:'Observo os mensageiros.'},
    {type:'FALAR',text:'Existe algum abrigo?'}
  ];
  const i=input({segments});
  const result={narrative:'Hiruzen responde e ordena que um mensageiro indique o abrigo. Um novo grupo de moradores chega.',facts:['O mensageiro indicou um abrigo.'],relations:[],training:null,energyDelta:0,chakraDelta:0,timeOptions:[],divergences:[]};
  let sent;
  const generate=provider({key:'chave-de-teste',external:false,fetcher:async(_url,request)=>{
    sent=JSON.parse(request.body);
    return new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(result)}]}}]}));
  }});
  const out=await generate(c,i);
  const next=apply(c,i,out);
  assert.deepEqual(sent.contents[0].parts[0].text&&JSON.parse(sent.contents[0].parts[0].text).input.segments,segments);
  assert.equal(next.messages.at(-1).text,result.narrative);
  assert.equal(next.messages.at(-2).text,segments.map(s=>s.type+': '+s.text).join('\\n'));
  assert.equal(next.revision,1);
  assert.equal(c.revision,0);
});
