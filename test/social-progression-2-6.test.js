import {test} from 'node:test';
import assert from 'node:assert/strict';
import {create,view,apply,input,context} from '../src/engine.js';
import {assessAttributeEvidence} from '../src/attribute-evidence.js';
import {buildSocialDynamics} from '../src/social-dynamics.js';
import {curateMoment} from '../src/memory-curation.js';
import {system} from '../src/gemini.js';
import {readFileSync} from 'node:fs';
const ch={name:'Kaien',age:4,village:'Konohagakure',clan:'Sarutobi',affiliation:'Civil',skills:'Prodígio excepcional em aprendizagem, reflexos e raciocínio.',history:'Adotado e treinado por Hiruzen.'};
const c=()=>create('Campanha em andamento',ch);
const ai=(text,day=0)=>({role:'ai',text,day});
const user=text=>({role:'user',text:'AGIR: '+text,day:0});
const act=text=>input({segments:[{type:'AGIR',text}]});
const talk=text=>input({segments:[{type:'FALAR',text}]});
const r=(narrative,extra={})=>({narrative,facts:[],relations:[],training:null,energyDelta:0,chakraDelta:0,timeOptions:[],divergences:[],...extra});

test('treino físico de vários dias reconhece Taijutsu, Força, Velocidade e Resistência',()=>{
 const old=c();old.messages.push(ai('Kaien treinou taijutsu por cinco dias, com exercícios físicos, movimentos rápidos e aprimoramento de força.',5));
 const before=JSON.stringify(old);
 const d=view(old).databook;
 for(const key of ['taijutsu','strength','speed','stamina'])assert.ok(d.ratings[key]>=.5,key+' deveria ter evidência de prática');
 assert.equal(d.ratings.genjutsu,null,'não recompensar uma especialidade sem evidência');
 assert.equal(JSON.stringify(old),before,'não reescrever a campanha ao avaliar o histórico');
});

test('Ninjutsu, Genjutsu e Selos de mão são reconhecidos por prática documentada',()=>{
 const old=c();
 old.messages.push(ai('Kaien praticou ninjutsu e moldou chakra sob supervisão.',1));
 old.messages.push(ai('Kaien treinou genjutsu usando ilusões ninja durante horas.',2));
 old.messages.push(ai('Kaien repetiu sequências de selos de mão durante três dias.',5));
 const d=view(old).databook;
 for(const key of ['ninjutsu','genjutsu','handSeals'])assert.ok(d.ratings[key]>=.5,key);
 assert.ok(d.attributeEvidence.handSeals.records>=1);
});

test('exercícios indiretos contam no atributo relevante mesmo sem um training do Gemini',()=>{
 const old=c();old.messages.push(ai('Kaien correu por várias horas e treinou resistência em uma longa corrida.',2));
 const d=view(old).databook;
 assert.ok(d.ratings.speed>=.5);
 assert.ok(d.ratings.stamina>=.5);
 assert.equal(d.ratings.genjutsu,null);
});

test('aprimoramento por estudo, prática física e estratégias não concedem todas as oito notas de graça',()=>{
 const old=c();old.messages.push(ai('Kaien estudou ninjutsu na biblioteca e compreendeu um fundamento.',2));
 const d=view(old).databook;
 assert.ok(d.ratings.ninjutsu>=.5);
 assert.ok(d.ratings.intelligence>=.5);
 assert.equal(d.ratings.strength,null);
 assert.equal(d.ratings.stamina,null);
 assert.equal(d.ratings.speed,null);
});

test('intenções do jogador e feitos de Hiruzen não geram atributos físicos para Kaien',()=>{
 const old=c();
 old.messages.push(user('Vou ficar forte e rápido estudando amanhã.'));
 old.messages.push(ai('Hiruzen treinou força e velocidade durante três dias; Kaien apenas observou.',3));
 const d=view(old).databook;
 assert.equal(d.ratings.strength,null);
 assert.equal(d.ratings.speed,null);
 assert.equal(d.ratings.stamina,null);
});

test('memória salva com treinamento confirmado é recuperável, descartada não',()=>{
 const old=c();
 old.memories.push({id:'good',status:'saved',day:2,title:'Treino longo',description:'Kaien treinou força física durante vários dias.'});
 old.memories.push({id:'bad',status:'dismissed',day:3,title:'Treino não confirmado',description:'Kaien treinou genjutsu por três dias.'});
 const d=view(old).databook;
 assert.ok(d.ratings.strength>=.5);
 assert.equal(d.ratings.genjutsu,null);
});

test('novo treino aceito beneficia a campanha em andamento sem modificar ficha inicial',()=>{
 const old=c();old.introConfirmed=true;old.day=2;
 const n=apply(old,act('Pratico os movimentos que aprendi.'),r('Kaien treinou taijutsu durante duas horas com exercícios de força.'));
 assert.equal(n.id,old.id);
 assert.equal(n.character.age,old.character.age);
 assert.ok(view(n).databook.ratings.taijutsu>=.5);
 assert.ok(view(n).databook.ratings.strength>=.5);
 assert.equal(view(old).databook.ratings.strength,null);
});

test('avaliações anteriores altas permanecem preservadas',()=>{
 const old=c();old.databook.ratings.strength=4.5;
 old.messages.push(ai('Kaien treinou força e musculatura uma tarde.',3));
 assert.equal(view(old).databook.ratings.strength,4.5);
});

test('a dinâmica social reconhece jovem prodígio e relação positiva com o mestre',()=>{
 const old=c();old.relations.Hiruzen='Pai adotivo, mestre e pessoa que respeita muito Kaien.';
 old.npcKnowledge.Hiruzen=['Kaien demonstrou reflexos extraordinários no treinamento.'];
 old.messages.push(ai('Kaien treinou taijutsu e agilidade durante várias horas.',4));
 const social=buildSocialDynamics(old,talk('Hiruzen, poderia me ensinar uma técnica? Eu estudei os fundamentos.'));
 assert.equal(social.talentConfirmed,true);
 assert.equal(social.request.isRequest,true);
 assert.ok(social.namedNPCs.some(p=>p.name==='Hiruzen'&&p.hasPositive));
 assert.ok(social.documentedPractice>0);
 const gameCtx=context(old,talk('Hiruzen, posso treinar com você?'));
 assert.equal(gameCtx.socialDynamics.talentConfirmed,true);
 assert.match(system,/FORA DE COMBATE/);
 assert.match(system,/n[aã]o seja hostil/iu);
});

test('um desconhecido não recebe poderes para ler a ficha privada',()=>{
 const old=c();
 const info=buildSocialDynamics(old,talk('Jiraiya, gostaria de aprender com você.'));
 assert.equal(info.talentConfirmed,true);
 assert.ok(info.namedNPCs.find(p=>p.name==='Jiraiya'));
 assert.equal(info.namedNPCs.find(p=>p.name==='Jiraiya').witnessedFacts.length,0);
 assert.match(info.instructions,/não podem ler a ficha privada/);
});

test('rotina, treino comum e entrega de relatório não viram Memórias Marcantes',()=>{
 const old=c();const i=act('Vou estudar.');
 assert.equal(curateMoment(old,i,r('Kaien estudou teoria por duas horas.',{moment:{title:'Rotina de estudos',description:'Kaien estudou um livro de ninjutsu por duas horas.'}})),null);
 assert.equal(curateMoment(old,i,r('Kaien voltou ao escritório.',{development:['Kaien treinou na Academia durante uma hora.'],consequences:[{status:'ongoing',description:'Kaien retornou ao escritório para conversar com o Hokage.'}]})),null);
});

test('missão concluída, promoção e mudança de vínculo são marcos sugeríveis',()=>{
 const old=c();
 const a=curateMoment(old,act('Apresento o relatório.'),r('Kaien concluiu a missão rank D na vila.',{moment:{title:'Missão Cumprida',description:'Kaien concluiu a missão rank D e recebeu reconhecimento do Hokage.'}}));
 assert.ok(a&&a.title.includes('Missão'));
 const b=curateMoment(old,act('Falo com Hiruzen.'),r('Hiruzen reconheceu a conquista de Kaien.',{relations:[{name:'Hiruzen',description:'O vínculo duradouro de confiança entre Hiruzen e Kaien se aprofundou.'}]}));
 assert.ok(b);
});

test('memórias não devem repetir a mesma realização já salva',()=>{
 const old=c();
 old.memories=[{id:'s',status:'saved',day:2,title:'Missão D',description:'Kaien concluiu a missão rank D e recebeu reconhecimento do Hokage.'}];
 assert.equal(curateMoment(old,act('Reporto ao Hokage.'),r('Kaien retornou.',{moment:{title:'Missão Cumprida',description:'Kaien concluiu a missão rank D e recebeu reconhecimento do Hokage.'}})),null);
});

test('apenas eventos sugeridos mudam: as memórias já salvas não são apagadas',()=>{
 const old=c();old.memories=[{id:'existing',status:'saved',title:'Missão Cumprida',description:'Kaien concluiu uma missão rank D.',day:1}];
 const n=apply(old,act('Vou à biblioteca.'),r('Kaien estudou ninjutsu por três horas.'));
 assert.equal(n.memories.length,1);
 assert.equal(n.messages.at(-1).memoryCandidate,null);
});

test('estrutura da interface expõe as evidências em lugar de exibir não avaliado indiscriminadamente',()=>{
 const js=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 assert.match(js,/db-intelligence-evidence/);
 assert.match(js,/attributeEvidence/);
});

test('o mentor adotivo da história inicial reconhece a ligação familiar mesmo sem relação duplicada em c.relations',()=>{
 const old=c();delete old.relations.Hiruzen;
 const social=buildSocialDynamics(old,talk('Hiruzen, pode me ajudar a praticar?'));
 const mentor=social.namedNPCs.find(p=>p.name==='Hiruzen');
 assert.ok(mentor);
 assert.equal(mentor.knownFromOrigin,true);
 assert.equal(mentor.hasPositive,true);
 assert.match(mentor.principle,/relação estabelecida na origem/i);
});
