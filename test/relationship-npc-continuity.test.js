import {test} from 'node:test';
import assert from 'node:assert/strict';
import {create,input,apply,view,context} from '../src/engine.js';
import {canonicalNpcName,visibleRelationships,commitRelationships,consolidateNpcRecords,npcContinuity} from '../src/relationship-engine.js';
import {planNpcTurn} from '../src/motor.js';
import {system} from '../src/gemini.js';

const char={name:'Kaien',age:4,village:'Konohagakure',history:'Kaien foi adotado e treinado por Hiruzen Sarutobi.',skills:'Prodígio.'};
const game=()=>create('Campanha atual',char);
const turn=text=>input({segments:[{type:'AGIR',text}]});
const res=(narrative,extra={})=>({narrative,facts:[],relations:[],training:null,energyDelta:0,chakraDelta:0,timeOptions:[],divergences:[],...extra});

test('guarnição, patrulha, oponentes e encontro ocasional não entram na aba Relações',()=>{
 const c=game();
 c.relations={
  'Guarnição da aldeia':'Kaien esteve presente diante da guarnição.',
  'Três inimigos':'Kaien enfrentou os inimigos na estrada.',
  'Patrulha do portão':'Os guardas viram Kaien passar.',
  'Comerciante da loja':'Kaien comprou alguns pergaminhos na loja.',
  Hiruzen:'Pai adotivo e mentor; vínculo duradouro de confiança.',
  'Asuma Sarutobi':'Tornou-se aliado e amigo de Kaien após ajudarem um ao outro.'
 };
 const before=JSON.stringify(c);
 const v=view(c);
 assert.deepEqual(Object.keys(v.relations).sort(),['Asuma Sarutobi','Hiruzen'].sort());
 assert.equal(JSON.stringify(c),before,'apenas visualizar a ficha não apaga relações antigas nem altera a campanha');
});

test('o motor não adiciona relações irrelevantes mesmo que o Gemini devolva entradas',()=>{
 const c=game();
 const n=apply(c,turn('Passeio pela loja de pergaminhos.'),res('Kaien foi atendido por um comerciante e observou uma guarnição.',{
  relations:[
   {name:'Guarnição do bairro',description:'A guarnição observou a passagem de Kaien.'},
   {name:'Um inimigo',description:'Kaien enfrentou um inimigo desconhecido.'},
   {name:'Vendedor da loja',description:'O vendedor atendeu Kaien e vendeu um pergaminho.'}
  ],
  npcKnowledge:[{name:'Vendedor da loja',fact:'Kaien comprou um pergaminho'}]
 }));
 assert.deepEqual(view(n).relations,{});
 assert.deepEqual(n.relations,{});
 assert.ok(n.npcKnowledge['Vendedor da loja']?.length,'o contato do mundo pode continuar lembrado separadamente');
 assert.equal(n.npcAgents['Guarnição do bairro'],undefined);
 assert.equal(n.relationArchive['Guarnição do bairro'],undefined,'contato novo irrelevante não vira relação');
});

test('laços importantes permanecem e atualizações usam o mesmo nome',()=>{
 const c=game();c.relations.Hiruzen='Pai adotivo de Kaien.';
 const n=apply(c,turn('Conversei com meu pai adotivo.'),res('Hiruzen demonstrou preocupação com Kaien.',{
  relations:[{name:'Hiruzen Sarutobi',description:'O mentor e pai adotivo de Kaien aprofundou a confiança.'}]
 }));
 assert.equal(Object.keys(view(n).relations).length,1);
 assert.ok(view(n).relations.Hiruzen);
 assert.equal(n.relations['Hiruzen Sarutobi'],undefined);
 assert.equal(n.relations.Hiruzen.includes('confiança'),true);
 assert.ok(c.relations.Hiruzen==='Pai adotivo de Kaien.','turnos não mutam o estado original');
});

test('apelidos por títulos são reconciliados sem criar várias pessoas',()=>{
 const c=game();
 c.relations={'Senhor Hiruzen':'Pai adotivo e mestre do protagonista.',Hiruzen:'Mentor de Kaien.'};
 const data=visibleRelationships(c);
 assert.equal(Object.keys(data).length,1);
 assert.equal(canonicalNpcName('Hiruzen Sarutobi',['Hiruzen']),'Hiruzen');
});

test('duas pessoas com nomes próprios diferentes não se fundem por trabalhar na mesma loja',()=>{
 assert.equal(canonicalNpcName('Riku',['Takeshi'],{Riku:'Trabalha na loja de pergaminhos',Takeshi:'Trabalha na loja de pergaminhos'}),'Riku');
 const c=game();
 c.npcAgents={Riku:{name:'Riku',relationship:'Vendedor da loja de armas',knowledge:['Conversa com Kaien'],goals:[],lastObservedDay:1},Takeshi:{name:'Takeshi',relationship:'Outro vendedor da loja de armas',knowledge:['Trabalha no balcão'],goals:[],lastObservedDay:2}};
 consolidateNpcRecords(c);
 assert.deepEqual(Object.keys(c.npcAgents).sort(),['Riku','Takeshi']);
});

test('dois títulos para a mesma função na mesma loja reutilizam o NPC existente',()=>{
 const c=game();
 c.npcAgents={
  'Comerciante da loja de pergaminhos':{name:'Comerciante da loja de pergaminhos',relationship:'Atendeu Kaien no primeiro dia.',knowledge:['Vendia pergaminhos'],goals:[],lastObservedDay:2},
  'Lojista da loja de pergaminhos':{name:'Lojista da loja de pergaminhos',relationship:'Reconheceu Kaien no retorno.',knowledge:['A loja fica na rua principal'],goals:[],lastObservedDay:5}
 };
 c.npcKnowledge={'Comerciante da loja de pergaminhos':['Guardou um pergaminho'],'Lojista da loja de pergaminhos':['Lembrou de Kaien']};
 consolidateNpcRecords(c);
 assert.equal(Object.keys(c.npcAgents).length,1);
 assert.equal(Object.keys(c.npcKnowledge).length,1);
 const person=Object.values(c.npcAgents)[0];
 assert.ok(person.knowledge.includes('Vendia pergaminhos'));
 assert.ok(person.knowledge.includes('A loja fica na rua principal'));
});

test('comerciantes de estabelecimentos distintos não são tratados como uma única pessoa',()=>{
 const c=game();
 c.npcAgents={
  'Comerciante da loja de armas':{name:'Comerciante da loja de armas',knowledge:[],lastObservedDay:1},
  'Comerciante da loja de livros':{name:'Comerciante da loja de livros',knowledge:[],lastObservedDay:2}
 };
 consolidateNpcRecords(c);
 assert.equal(Object.keys(c.npcAgents).length,2);
});

test('ao revisitar a loja, o Gemini recebe descrições anteriores para manter nome e identidade',()=>{
 const c=game();
 c.messages.push({role:'ai',text:'Kaien entrou na loja de pergaminhos. O comerciante Daisuke, de cabelos grisalhos, mostrou os produtos e prometeu guardar um pergaminho para seu retorno.',day:2});
 c.messages.push({role:'user',text:'AGIR: Saio da loja.',day:2});
 c.messages.push({role:'ai',text:'A rua de Konoha estava tranquila.',day:2});
 const i=turn('Volto à loja de pergaminhos para conversar com o comerciante.');
 const hint=npcContinuity(c,i);
 assert.ok(hint);
 assert.match(hint.priorScenes[0].text,/Daisuke/);
 assert.match(hint.rule,/mesmo comerciante|mesmo funcionário|mesmo.*nome/i);
 const ctx=context(c,i);
 assert.equal(ctx.npcContinuity.visitedPreviously,true);
 assert.ok(ctx.npcContinuity.priorScenes.some(x=>x.text.includes('Daisuke')));
 assert.match(system,/PRESERVE SUA IDENTIDADE/);
});

test('não injeta comerciantes antigos em cenas sem lojas',()=>{
 const c=game();
 c.messages.push({role:'ai',text:'Na loja de pergaminhos, Daisuke vendeu um pergaminho.',day:2});
 assert.equal(npcContinuity(c,turn('Vou treinar na Academia Ninja.')),null);
});

test('campanha anterior com relações irrelevantes se limpa no próximo turno sem perder vínculos e fatos',()=>{
 const c=game();c.relations={'Guarnição da vila':'Presença ocasional no portão.',Hiruzen:'Pai adotivo e mentor.',Comerciante:'Atendeu na loja.'};
 c.facts.push({text:'Kaien entrou numa loja de pergaminhos.',day:2});
 const original=JSON.stringify(c);
 const n=apply(c,turn('Volto para casa.'),res('Kaien retornou à sua casa após a caminhada.'));
 assert.deepEqual(Object.keys(view(n).relations),['Hiruzen']);
 assert.equal(n.relationArchive['Guarnição da vila'],'Presença ocasional no portão.');
 assert.equal(n.relationArchive.Comerciante,'Atendeu na loja.');
 assert.equal(n.facts.length,c.facts.length+1);
 assert.equal(JSON.stringify(c),original);
 assert.equal(n.character.age,c.character.age);
});

test('listas narrativas só incluem relacionamentos visíveis, sem inflar prompts',()=>{
 const c=game();
 for(let i=0;i<35;i++)c.relations['Guarnição '+i]='Este grupo estava patrulhando os portões.';
 c.relations.Hiruzen='O mestre e pai adotivo confia em Kaien.';
 const ctx=context(c,turn('Hiruzen, podemos conversar?'));
 assert.deepEqual(Object.keys(ctx.relations),['Hiruzen']);
 assert.equal(planNpcTurn({...c,relations:visibleRelationships(c)},turn('Hiruzen, podemos conversar?')).intentions.filter(x=>x.name==='Hiruzen').length,1);
});

test('a relação pode se tornar importante mais tarde sem apagar contatos incidentais do mundo',()=>{
 const c=game();
 commitRelationships(c,[{name:'Kenji',description:'Kenji vendeu algumas frutas para Kaien.'}]);
 assert.equal(c.relations.Kenji,undefined);
 commitRelationships(c,[{name:'Kenji',description:'Kenji tornou-se amigo íntimo e aliado duradouro de Kaien.'}]);
 assert.match(c.relations.Kenji,/amigo/);
});
