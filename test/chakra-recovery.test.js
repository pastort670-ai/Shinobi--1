import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {create,apply,input,context,view} from '../src/engine.js';
import {chakraBalance,chakraExperience,chakraPolicy} from '../src/chakra-engine.js';
import {actualTime} from '../src/time-engine.js';
import {system} from '../src/gemini.js';

const baseCharacter={name:'Akira Sarutobi',age:6,village:'Konohagakure',clan:'Sarutobi',affiliation:'Civil'};
const result={narrative:'Hiruzen explica as regras do treino.',facts:[],relations:[],training:null,energyDelta:0,chakraDelta:0,timeOptions:[],divergences:[],sceneType:'normal'};
const action=text=>input({segments:[{type:'AGIR',text}]});
const narration=(text,other={})=>({...result,narrative:text,...other});

test('diálogo sem técnica não custa nem recupera chakra artificialmente',()=>{
 const c=create('Diálogo',baseCharacter);c.chakra=47;
 const after=apply(c,input({segments:[{type:'FALAR',text:'Pai, como estão as coisas?'}]}),narration('Hiruzen explica os próximos compromissos.'));
 assert.equal(after.chakra,47);
 assert.equal(after.chakraActivity,'');
 assert.equal(c.chakra,47);
});

test('o narrador não deve gastar chakra por conversa ou movimento sem ninjutsu',()=>{
 const c=create('Proteção',baseCharacter);c.chakra=73;
 const say=input({segments:[{type:'FALAR',text:'Hiruzen, como aprender um jutsu?'}]});
 const n=apply(c,say,narration('Hiruzen explica os fundamentos do chakra.',{chakraDelta:-16}));
 assert.equal(n.chakra,73);
 const ordinary=apply(c,action('Akira caminha até a escola.'),narration('Akira chegou ao portão da Academia.',{chakraDelta:-12}));
 assert.equal(ordinary.chakra,73);
});

test('se um NPC usar ninjutsu diante do jogador, não debita o chakra do protagonista',()=>{
 const c=create('Mestre',baseCharacter);c.chakra=58;
 const n=apply(c,action('Observo Hiruzen.'),narration('Hiruzen utilizou chakra para criar um Bunshin, enquanto Akira apenas assistiu.',{chakraDelta:-13}));
 assert.equal(n.chakra,58);
});

test('ninja experiente e prodígio gasta menos pelo mesmo ninjutsu',()=>{
 const novice=create('Iniciante',baseCharacter),expert=create('Experiente',{...baseCharacter,skills:'Prodígio excepcional com controle de chakra avançado.'});
 expert.progress.ninjutsu=90;
 const move=action('Akira executa o Bunshin no Jutsu.');
 const r=narration('Akira Sarutobi usou uma técnica de clonagem com sucesso.',{chakraDelta:-10});
 const a=apply(novice,move,r),b=apply(expert,move,r);
 assert.ok(a.chakra<100&&b.chakra<100);
 assert.ok(b.chakra>a.chakra);
 assert.ok(chakraExperience(expert).efficiency>chakraExperience(novice).efficiency);
 assert.equal(a.chakraStrain>=0,true);
});

test('técnica intensa continua custosa, e combate não regenera chakra',()=>{
 const c=create('Confronto',baseCharacter);c.chakra=55;
 const r=narration('Akira utilizou um jutsu complexo para defender a equipe.',{chakraDelta:-20,sceneType:'combat',elapsedHours:3});
 const n=apply(c,action('Uso bastante chakra para executar um jutsu.'),r);
 assert.ok(n.chakra<=40,'um uso intenso precisa ter custo significativo');
 assert.equal(n.chakraActivity,'Chakra consumido em técnicas.');
 assert.equal(n.chakraStrain,5);
});

test('jutsus em sequência gastam chakra sem delta do narrador e a reserva já não aparece cheia',()=>{
 const c=create('Confronto',baseCharacter);
 const r=narration('Akira lançou o Rasengan contra o adversário.',{sceneType:'combat'});
 const single=apply(c,action('Uso Rasengan.'),r);
 const multiple=apply(c,action('Uso Rasengan e uso Rasengan novamente.'),r);
 assert.ok(single.chakra<100);
 assert.ok(multiple.chakra<single.chakra);
 assert.notEqual(view(single).conditions.chakra,'reserva completa');
 const interrupted=apply(c,action('Uso Rasengan.'),narration('Akira não conseguiu usar o Rasengan.',{sceneType:'combat'}));
 assert.equal(interrupted.chakra,100);
});

test('descanso efetivamente narrado recupera chakra mesmo quando o Gemini envia delta zero',()=>{
 const c=create('Descanso',baseCharacter);c.chakra=30;
 const i=input({hours:2,segments:[{type:'AGIR',text:'Akira descansa por duas horas.'}]});
 const n=apply(c,i,narration('Akira descansou por duas horas em um quarto tranquilo.'));
 assert.ok(n.chakra>=46);
 assert.equal(n.chakraActivity,'Chakra recuperado com descanso.');
 assert.equal(n.chakraStrain,0);
});

test('sono longo recupera mais do que pausa breve, sem ultrapassar a reserva total',()=>{
 const c=create('Sono',baseCharacter);c.chakra=14;
 const one=apply(c,input({hours:1,segments:[{type:'AGIR',text:'Akira dorme.'}]}),narration('Akira dormiu durante uma hora.'));
 const eight=apply(c,input({hours:8,segments:[{type:'AGIR',text:'Akira dorme.'}]}),narration('Akira dormiu por oito horas e despertou descansado.'));
 assert.ok(eight.chakra>one.chakra);
 assert.ok(eight.chakra<=100);
 const full=create('Cheia',baseCharacter);
 assert.equal(apply(full,input({hours:8}),narration('Akira dormiu por oito horas.')).chakra,100);
});

test('chakra fica mais lento de recuperar depois de esgotamento pesado, mas ainda se recupera',()=>{
 const fresh=create('Leve',baseCharacter),exhausted=create('Pesado',baseCharacter);
 fresh.chakra=exhausted.chakra=15;exhausted.chakraStrain=16;
 const i=input({hours:8,segments:[{type:'AGIR',text:'Akira repousa após a missão.'}]});
 const r=narration('Akira descansou durante oito horas e acordou cedo.');
 const a=apply(fresh,i,r),b=apply(exhausted,i,r);
 assert.ok(b.chakra>15);
 assert.ok(a.chakra>b.chakra);
 assert.ok(b.chakraStrain<16);
});

test('horas de passagem segura permitem recuperação lenta mesmo sem ordem explícita do modelo',()=>{
 const c=create('Viagem',baseCharacter);c.chakra=40;
 const i=input({hours:12,segments:[{type:'AGIR',text:'Espero as notícias na vila.'}]});
 const n=apply(c,i,narration('Akira aguardou as notícias durante a tarde, sem contratempos.'));
 assert.ok(n.chakra>40);
 assert.ok(n.chakra<80);
 assert.match(n.chakraActivity,/tempo/);
});

test('treinar durante o intervalo regenera menos que permanecer em repouso',()=>{
 const idle=create('Pausa',baseCharacter),train=create('Treino',baseCharacter);
 idle.chakra=train.chakra=35;
 const r=narration('Akira permaneceu na vila enquanto as horas passaram.');
 const a=apply(idle,input({hours:12}),r);
 const b=apply(train,input({hours:12,segments:[{type:'AGIR',text:'Akira treina ninjutsu por doze horas.'}]}),r);
 assert.ok(a.chakra>b.chakra);
});

test('NPC dormir não recupera o chakra do jogador',()=>{
 const c=create('Outros',baseCharacter);c.chakra=32;
 const n=apply(c,action('Hiruzen dorme enquanto eu observo.'),narration('Hiruzen dormiu, enquanto Akira Sarutobi continuou vigiando.'));
 assert.equal(n.chakra,32);
});

test('pedido de descanso e delta positivo sem confirmação não gera recuperação',()=>{
 const c=create('Plano',baseCharacter);c.chakra=34;
 const i=action('Quero dormir em breve.');
 const n=apply(c,i,narration('Hiruzen aconselhou Akira a repousar amanhã.',{chakraDelta:20}));
 assert.equal(n.chakra,34);
});

test('reposição de chakra narrada permite bônus curto, sem reabastecer tudo de uma vez',()=>{
 const c=create('Ajuda',baseCharacter);c.chakra=24;
 const n=apply(c,action('Peço ajuda para recuperar chakra.'),narration('Hiruzen transferiu chakra para Akira Sarutobi, e a energia dele começou a se recompor.',{chakraDelta:20}));
 assert.ok(n.chakra>=24);
 assert.ok(n.chakra<=30);
});

test('interrupção de salto temporal limita corretamente o período de recuperação',()=>{
 const c=create('Compromisso',baseCharacter);c.clockMinutes=20*60;c.chakra=20;c.chakraStrain=16;
 c.pendingTasks=[{id:'p',description:'Visita marcada com Hiruzen',status:'open',dueDay:1}];
 const i=input({hours:72,segments:[{type:'AGIR',text:'Akira dorme e descansa durante o intervalo.'}]});
 const r=narration('Akira dormiu e descansou até o início da visita.');
 const tick=actualTime(c,i,r,0);
 assert.equal(tick.hours,12);
 const n=apply(c,i,r);
 assert.equal(n.chakra,68);
 assert.ok(n.lastTimeInterruption);
});

test('campanha antiga sem strain funciona e regeneração produz o mesmo resultado',()=>{
 const old=create('Legado',baseCharacter);old.chakra=70;delete old.chakraStrain;delete old.chakraActivity;
 const i=input({hours:4,segments:[{type:'AGIR',text:'Akira repousa.'}]});
 const r=narration('Akira repousou quatro horas.');
 const x=apply(old,i,r),y=apply(old,i,r);
 assert.equal(x.chakra,y.chakra);
 assert.equal(x.chakraStrain,y.chakraStrain);
 assert.equal(old.chakraStrain,undefined);
 assert.equal(view(x).conditions.chakra,'reserva completa');
});

test('Gemini recebe instruções e ficha apresenta a recuperação de forma descritiva',()=>{
 const c=create('Contexto',baseCharacter);
 assert.match(context(c,action('Uso um jutsu.')).chakraGuidance,/descansar|dormir/i);
 assert.match(chakraPolicy,/descritiva/);
 assert.match(system,/GESTÃO DE CHAKRA/);
 const js=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 assert.match(js,/chakraActivity/);
 const css=readFileSync(new URL('../public/style.css',import.meta.url),'utf8');
 assert.match(css,/\.chakra-feedback/);
});
