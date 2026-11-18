import {test} from 'node:test';
import assert from 'node:assert/strict';
import {create,apply,view,input,context,validate} from '../src/engine.js';
import {databookView,DATABOOK_ATTRIBUTES,MISSION_RANKS} from '../src/databook.js';
import {readFileSync} from 'node:fs';

const character={name:'Akira Sarutobi',age:2,village:'Konohagakure',clan:'Sarutobi',affiliation:'Civil'};
const i=input({segments:[{type:'AGIR',text:'Treino com um instrutor.'}]});
const response={narrative:'Akira Sarutobi pratica os movimentos aprendidos com atenção.',facts:[],relations:[],training:null,energyDelta:0,chakraDelta:0,timeOptions:[],divergences:[]};

test('oito parâmetros oficiais da estrutura, escala e ordem estáveis',()=>{
 assert.deepEqual(DATABOOK_ATTRIBUTES.map(a=>a.key),['ninjutsu','taijutsu','genjutsu','intelligence','strength','speed','stamina','handSeals']);
 assert.deepEqual(MISSION_RANKS,['D','C','B','A','S']);
 const s=databookView(create('Estreia',character));
 assert.equal(s.attributes.length,8);
 assert.ok(s.attributes.every(a=>a.value===null&&a.description==='Ainda não avaliado'));
 assert.deepEqual(s.missions,{D:0,C:0,B:0,A:0,S:0,unranked:0});
});

test('campanhas antigas abrem sem campos adicionais e preservam estado',()=>{
 const old=create('Antiga',character);
 delete old.databook;
 old.progress.ninjutsu=30;
 const before=JSON.stringify(old);
 const shown=view(old);
 assert.equal(shown.databook.attributes.find(a=>a.key==='ninjutsu').value,2);
 assert.equal(shown.databook.attributes.find(a=>a.key==='intelligence').value,null);
 assert.equal(shown.character.age,2);
 assert.equal(JSON.stringify(old),before);
 const turn=apply(old,i,response);
 assert.ok(turn.databook);
 assert.equal(turn.progress.ninjutsu,30);
});

test('treinamento aceito atualiza só atributo existente e registra histórico',()=>{
 const c=create('Treino',character);
 const r={...response,training:{skill:'taijutsu',gain:2},narrative:'Akira Sarutobi treina taijutsu e completa o exercício.'};
 const next=apply(c,i,r);
 const sheet=view(next).databook;
 assert.equal(next.progress.taijutsu,2);
 assert.ok(sheet.attributes.find(a=>a.key==='taijutsu').value>=.5,'o atributo reflete progresso e evidência narrada');
 assert.equal(sheet.attributes.find(a=>a.key==='strength').value,null);
 assert.equal(sheet.history.length,1);
 assert.equal(c.databook.history.length,0);
});

test('o especialista pode atribuir até uma avaliação inicial moderada com evidência literal',()=>{
 const c=create('Qualidades',character);
 const sentence='Akira Sarutobi demonstrou velocidade maior e completou os exercícios de deslocamento.';
 const r={...response,narrative:sentence,databookUpdates:[{attribute:'speed',rating:4.5,evidence:sentence}]};
 const n=apply(c,i,r);
 assert.equal(view(n).databook.ratings.speed,2.5);
 const n2=apply(n,i,{...r,databookUpdates:[{attribute:'speed',rating:4.5,evidence:sentence}]});
 assert.equal(view(n2).databook.ratings.speed,3);
 assert.equal(view(n2).databook.history.length,2);
});

test('sem evidência, menção à habilidade de NPC não atribui poderes ao protagonista',()=>{
 const c=create('Confiabilidade',character);
 const sentence='Hiruzen demonstrou velocidade maior e completou os exercícios de deslocamento.';
 const proposed={attribute:'speed',rating:5,evidence:sentence};
 assert.equal(view(apply(c,i,{...response,narrative:sentence,databookUpdates:[proposed]})).databook.ratings.speed,null);
 const fake={attribute:'strength',rating:5,evidence:'Akira Sarutobi demonstrou força muito acima do normal no treinamento.'};
 assert.equal(view(apply(c,i,{...response,databookUpdates:[fake]})).databook.ratings.strength,null);
});

test('menção ao protagonista não transforma o feito de Hiruzen em atributo do jogador',()=>{
 const c=create('Agentes distintos',character);
 const sentence='Hiruzen demonstrou grande velocidade enquanto Akira Sarutobi apenas observou.';
 const n=apply(c,i,{...response,narrative:sentence,databookUpdates:[{attribute:'speed',rating:5,evidence:sentence}]});
 assert.equal(view(n).databook.ratings.speed,null);
});

test('missão só entra na contagem se for rankeada e concluída pelo protagonista',()=>{
 const c=create('Missões',character);
 const narrative='Akira Sarutobi concluiu a missão rank C depois de entregar a correspondência na vila.';
 const outcome={rank:'C',summary:'Entrega concluída',evidence:narrative};
 const n=apply(c,i,{...response,narrative,missionCompletion:outcome});
 assert.equal(view(n).databook.missions.C,1);
 assert.equal(view(c).databook.missions.C,0);
 const n2=apply(n,i,{...response,narrative:'Akira Sarutobi aceita uma nova missão rank C.',missionCompletion:outcome});
 assert.equal(view(n2).databook.missions.C,1);
 const npc='Hiruzen concluiu a missão rank S durante a madrugada.';
 const n3=apply(n,i,{...response,narrative:npc,missionCompletion:{rank:'S',summary:'Outra missão',evidence:npc}});
 assert.equal(view(n3).databook.missions.S,0);
});

test('regeneração a partir da versão anterior não duplica missões nem notas',()=>{
 const c=create('Regenerar',character);
 const narrative='Akira Sarutobi concluiu a missão rank D ao devolver o pergaminho perdido.';
 const r={...response,narrative,missionCompletion:{rank:'D',summary:'Pergaminho recuperado',evidence:narrative}};
 const a=apply(c,i,r),b=apply(c,i,r);
 assert.equal(view(a).databook.missions.D,1);
 assert.equal(view(b).databook.missions.D,1);
});

test('atributos e missões não sobrecarregam o narrador com campos inválidos',()=>{
 const v=validate({...response,databookUpdates:[{attribute:'speed',rating:7,evidence:'x'},{attribute:'strength',rating:2,evidence:'a'.repeat(40)}],missionCompletion:{rank:'X',summary:'x',evidence:'a'.repeat(40)}});
 assert.equal(v.databookUpdates.length,1);
 assert.equal(v.missionCompletion,null);
 assert.ok(context(create('Contexto',character),i).databook);
});

test('interface contém gráfico e opções de avaliação legíveis no celular',()=>{
 const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../public/style.css',import.meta.url),'utf8');
 for(const id of ['db-graphic','db-attributes','db-show-numbers','db-missions','db-history'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(js,/function renderDatabook\(/);
 assert.match(js,/renderDatabook\(c\)/);
 assert.match(css,/\.db-layout/);
 assert.match(css,/@media\(max-width:640px\)/);
});
