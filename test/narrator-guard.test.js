import {test} from 'node:test';
import assert from 'node:assert/strict';
import {create,input,apply,context} from '../src/engine.js';
import {playerDialogue,narrationQuality,stripPlayerEcho} from '../src/narrator-guard.js';
import {system,provider} from '../src/gemini.js';
const ch={name:'Kaien Sarutobi',age:8,village:'Konohagakure',clan:'Sarutobi',skills:'Prodígio excepcional'};
const base={narrative:'Hiruzen concorda.',facts:[],relations:[],training:null,energyDelta:0,chakraDelta:0,timeOptions:[],divergences:[]};
test('narrador não repete uma fala longa do jogador, mas preserva reação do NPC',()=>{
 const c=create('Prosa',ch);
 const i=input({segments:[{type:'FALAR',text:'Quero que me ensine uma técnica nova hoje.'}]});
 const raw='Kaien disse: "Quero que me ensine uma técnica nova hoje."\nHiruzen ergue os olhos. — Podemos começar pelo controle de chakra.';
 const quality=narrationQuality(c,i,raw);
 assert.ok(quality.echoes>=1);assert.ok(quality.removed>=1);
 assert.ok(!quality.narrative.includes('Quero que me ensine'));
 assert.match(quality.narrative,/Hiruzen ergue os olhos/);
 const n=apply(c,i,{...base,narrative:raw});
 assert.equal(n.messages.at(-2).text,'FALAR: Quero que me ensine uma técnica nova hoje.');
 assert.ok(!n.messages.at(-1).text.includes('Quero que me ensine'));
 assert.match(n.messages.at(-1).text,/Podemos começar/);
});
test('fala curta do jogador entre aspas não é reproduzida pelo narrador',()=>{
 const c=create('Prosa',ch);
 const i=input({segments:[{type:'FALAR',text:'Bom dia'}]});
 const out=stripPlayerEcho(c,i,'Kaien disse: "Bom dia"\nHiruzen acena em resposta.');
 assert.ok(!out.narrative.includes('Bom dia'));
 assert.match(out.narrative,/Hiruzen acena/);
});
test('repete fala curta mesmo com exclamação dentro das aspas',()=>{
 const c=create('Prosa',ch);
 const i=input({segments:[{type:'FALAR',text:'Bom dia'}]});
 const outcome=stripPlayerEcho(c,i,'Kaien: "Bom dia!"\nHiruzen responde com um aceno.');
 assert.ok(!outcome.narrative.includes('Bom dia'));
 assert.match(outcome.narrative,/Hiruzen responde/);
});
test('pontuação diferente não permite o narrador copiar uma fala longa',()=>{
 const c=create('Prosa',ch);
 const i=input({segments:[{type:'FALAR',text:'Quero aprender o Bunshin, Hiruzen!'}]});
 const out=stripPlayerEcho(c,i,'Kaien repetiu: "Quero aprender o Bunshin. Hiruzen!"\nO mestre aponta para o campo de treino.');
 assert.doesNotMatch(out.narrative,/Quero aprender o Bunshin/);
 assert.match(out.narrative,/O mestre aponta/);
});
test('fala de turno anterior também não é reencenada',()=>{
 const c=create('Prosa',ch);
 c.messages.push({role:'user',text:'FALAR: Encontre-me na biblioteca depois do treinamento.',day:0});
 const i=input({segments:[{type:'AGIR',text:'Caminho até o pátio.'}]});
 const next=apply(c,i,{...base,narrative:'Kaien repetiu: "Encontre-me na biblioteca depois do treinamento."\nHiruzen segue para o pátio.'});
 assert.doesNotMatch(next.messages.at(-1).text,/Encontre-me na biblioteca/);
 assert.match(next.messages.at(-1).text,/Hiruzen segue/);
});
test('motor mantém falas realmente novas dos NPCs e não modifica citações aleatórias',()=>{
 const c=create('Prosa',ch),i=input({segments:[{type:'FALAR',text:'Você pode me ajudar, Hiruzen?'}]});
 const outcome='Hiruzen abre o livro. — Posso ensinar você depois que terminar as tarefas.';
 assert.equal(narrationQuality(c,i,outcome).narrative,outcome);
 assert.equal(narrationQuality(c,i,outcome).removed,0);
});
test('turno não avança se tudo que o narrador fez foi repetir o jogador',()=>{
 const c=create('Prosa',ch),i=input({segments:[{type:'FALAR',text:'Preciso que você me ensine os fundamentos.'}]});
 assert.throws(()=>apply(c,i,{...base,narrative:'Kaien disse: "Preciso que você me ensine os fundamentos."'}),/narrador repetiu suas falas/);
 assert.equal(c.revision,0);assert.equal(c.messages.length,1);
});
test('Gemini recebe proibição expressa e o motor mantém contexto sem duplicar a fala',async()=>{
 assert.match(system,/ESTRITAMENTE PROIBIDO REPRODUZIR/);
 let ctx;
 const gen=provider({key:'teste',external:false,fetcher:async(_url,opts)=>{
  ctx=JSON.parse(JSON.parse(opts.body).contents[0].parts[0].text);
  return new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(base)}]}}]}));
 }});
 await gen(create('Prosa',ch),input({segments:[{type:'FALAR',text:'Olá, Hiruzen.'}]}));
 assert.match(ctx.narrationRule,/proibido repetir falas/);
});
