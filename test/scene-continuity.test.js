import {test} from 'node:test';
import assert from 'node:assert/strict';
import {apply,context,create,input,view} from '../src/engine.js';
import {provider} from '../src/gemini.js';
import {correctKinship,sanitizeDisclosures} from '../src/scene-continuity.js';

const secret='O mapa de cobre está dentro do sino azul';
const sheet={name:'Kaien Sarutobi',age:8,village:'Konohagakure',history:'Kaien foi acolhido e adotado aos seis anos por Hiruzen Sarutobi.'};
const created=()=>create('Continuidade',sheet);
const talk=text=>input({segments:[{type:'FALAR',text}]});
const act=text=>input({segments:[{type:'AGIR',text}]});
const tell=talk('Hiruzen, só você pode saber: '+secret+'.');
const recognized={narrative:'Hiruzen para ao ouvir o sussurro. — Vou verificar quando houver tempo.'};
const known=()=>apply(created(),tell,recognized);
const reply=proposal=>Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(proposal)}]}}]});

test('conversa individual delimita a memória, sem vazar o fato no contexto geral',()=>{
 const base=created();
 const current=context(base,tell);
 assert.deepEqual(current.scopedDisclosures.map(x=>[x.knownOnlyBy,x.awaitingPrivateExchange]),[[['Hiruzen'],true]]);
 assert.doesNotMatch(JSON.stringify(current.input),/mapa de cobre/u);
 const next=known();
 assert.deepEqual(next.disclosures,[{text:secret+'.',day:0,audience:['Hiruzen']}]);
 assert.ok(!Object.hasOwn(view(next),'disclosures'));
 const later={...next,messages:[...next.messages,{role:'ai',text:'Itachi espera com a mão sobre o portão.'}]};
 const irrelevant=context(later,talk('Itachi, viu quem estava perto dos abrigos?'));
 assert.deepEqual(irrelevant.scopedDisclosures,[]);
 assert.doesNotMatch(JSON.stringify(irrelevant),/mapa de cobre/u);
 const recalled=context(later,talk('Hiruzen, lembra da nossa conversa?'));
 assert.deepEqual(recalled.scopedDisclosures[0].knownOnlyBy,['Hiruzen']);
 assert.match(recalled.sceneActors.actors.find(x=>x.name==='Hiruzen').kinship,/Pai adotivo/u);
 assert.match(recalled.sceneActors.actors.find(x=>x.name==='Itachi').voice,/5 anos/u);
});

test('um destinatário que saiu antes de ouvir ainda não sabe o segredo',()=>{
 const n=apply(created(),tell,{narrative:'Hiruzen não ouviu o sussurro. O mensageiro bate no portão.'});
 assert.deepEqual(n.disclosures,[{text:secret+'.',day:0,audience:[]}]);
 const recalled=context(n,talk('Hiruzen, você ouviu o que eu disse?'));
 assert.deepEqual(recalled.scopedDisclosures,[]);
 assert.doesNotMatch(JSON.stringify(recalled),/mapa de cobre/u);
});

test('outro NPC só passa a saber após uma fala ou uma transferência narrada e aceita',()=>{
 const base=known();
 const t=talk('Itachi, você já viu algum mapa por aqui?');
 const denied=apply(base,t,{narrative:'Itachi vai buscar o mapa de cobre dentro do sino azul. Uma janela bate ao longe.',
  npcKnowledge:[{name:'Itachi',fact:secret}]});
 assert.doesNotMatch(denied.messages.at(-1).text,/sino azul/u);
 assert.equal(denied.npcKnowledge.Itachi,undefined);
 assert.deepEqual(denied.disclosures[0].audience,['Hiruzen']);
 const playerTold=apply(denied,talk('Itachi, '+secret+'.'),{narrative:'Itachi ouve a revelação e pergunta quem escondeu o objeto.'});
 assert.deepEqual(playerTold.disclosures[0].audience,['Hiruzen','Itachi']);
 const toldByNpc=apply(base,act('Observo Hiruzen e Itachi perto do pátio.'),{
  narrative:'Hiruzen contou a Itachi onde achar o mapa de cobre, dentro do sino azul.'});
 assert.deepEqual(toldByNpc.disclosures[0].audience,['Hiruzen','Itachi']);
});

test('backup recupera os destinatários e ignora registros inválidos ou do futuro',()=>{
 const c=known();
 const fromBackup=JSON.parse(JSON.stringify(c));
 fromBackup.disclosures.push(null,{text:'Acontecimento futuro',day:999,audience:['Hiruzen']});
 fromBackup.disclosures=sanitizeDisclosures(fromBackup.disclosures,0);
 assert.deepEqual(fromBackup.disclosures,c.disclosures);
 assert.deepEqual(context(fromBackup,talk('Hiruzen, será que já podemos verificar?')).scopedDisclosures[0].knownOnlyBy,['Hiruzen']);
});

test('revisão corrige parentesco comprovado pela ficha sem substituir outros netos',()=>{
 assert.equal(correctKinship(created(),'Hiruzen olha para o neto adotivo.'),'Hiruzen olha para o filho adotivo.');
 assert.equal(correctKinship(created(),'Hiruzen olha para Konohamaru, neto adotivo de um parente.'),'Hiruzen olha para Konohamaru, neto adotivo de um parente.');
});

test('planeja ações e falas na ordem e rejeita uso confirmado de jutsu sem chakra',()=>{
 const c=created();
 c.chakra=0;
 c.jutsus=[{name:'Rasengan',description:'aprendido',day:0}];
 const t=input({segments:[{type:'AGIR',text:'Tento executar o Rasengan.'},{type:'FALAR',text:'Hiruzen, como recupero minhas reservas?'}]});
 const plan=context(c,t).turnDirection;
 assert.deepEqual(plan.sequence,[{order:1,kind:'ação a resolver'},{order:2,kind:'fala a interpretar'}]);
 assert.deepEqual(plan.techniques,[{technique:'Rasengan',result:'reserva esgotada'}]);
 const n=apply(c,t,{narrative:'Kaien lança um Rasengan de grande alcance. Hiruzen mostra o banco de pedra próximo.',chakraDelta:-10});
 assert.doesNotMatch(n.messages.at(-1).text,/Rasengan/u);
 assert.equal(n.chakra,0);
 const learned=apply(c,t,{narrative:'Kaien tenta formar o Rasengan, mas nenhuma esfera de chakra se forma.'});
 assert.match(learned.messages.at(-1).text,/tenta formar/u);
});

test('Gemini faz uma revisão pontual para informação privada e omite o segredo do contexto geral',async()=>{
 const c=known(),i=talk('Itachi, você viu alguém perto dos abrigos?');
 const payloads=[];
 const gen=provider({key:'teste',external:false,fetcher:async(_url,request)=>{
  payloads.push(JSON.parse(request.body));
  return payloads.length===1?reply({narrative:'Itachi vai buscar o mapa de cobre dentro do sino azul. Um guarda se aproxima da entrada.'}):
   reply({narrative:'Itachi aponta para a fila em frente ao abrigo. — Vi dois guardas e uma senhora com uma lanterna.'});
 }});
 const proposal=await gen(c,i);
 assert.equal(payloads.length,2);
 assert.match(payloads[1].systemInstruction.parts[0].text,/informação privada ao NPC errado/u);
 assert.doesNotMatch(payloads[1].contents[0].parts[0].text,/mapa de cobre/u);
 assert.match(apply(c,i,proposal).messages.at(-1).text,/Vi dois guardas/u);
});

test('uma pergunta sem resposta provoca revisão, mantendo o trecho seguro se a revisão falhar',async()=>{
 const c=created(),i=talk('Itachi, você viu alguém perto dos abrigos?');
 let calls=0;
 const narrative='Itachi vira a cabeça, surpreso diante da pergunta sussurrada.';
 const gen=provider({key:'teste',external:false,fetcher:async(_url,request)=>{
  if(++calls===1)return reply({narrative});
  assert.match(JSON.parse(request.body).systemInstruction.parts[0].text,/falta responder/u);
  return new Response('{}',{status:503});
 }});
 assert.equal((await gen(c,i)).narrative,narrative);
 assert.equal(calls,2);
});

test('API preserva as testemunhas no backup e ao desfazer uma nova revelação',async()=>{
 const {app}=await import('../src/server.js');
 const server=app({dbPath:':memory:',access:{required:false},rateMs:0,generate:async(_c,i)=>
  i.segments.some(s=>s.text.startsWith('Itachi'))?{narrative:'Itachi ouve a revelação e fica pensativo.'}:recognized});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const root='http://127.0.0.1:'+server.address().port+'/api/';
 function client(){
  let cookie='';
  return async (path,body)=>{
   const response=await fetch(root+path,{method:body?'POST':'GET',headers:{cookie,'Content-Type':'application/json'},body:body&&JSON.stringify(body)});
   cookie=response.headers.get('set-cookie')?.split(';')[0]||cookie;
   const data=await response.json();
   assert.ok(response.ok,JSON.stringify(data));
   return data;
  };
 }
 try{
  const first=client(),second=client();
  const base=await first('campaigns',{title:'Segredo',character:sheet});
  const basePath='campaigns/'+base.id;
  const accepted=await first(basePath+'/intro-confirm',{revision:base.revision});
  await first(basePath+'/turn',{...tell,revision:accepted.revision,requestId:crypto.randomUUID()});
  const backup=await first(basePath+'/export');
  const imported=await second('import',backup);
  assert.ok(!Object.hasOwn(imported,'disclosures'));
  const path='campaigns/'+imported.id;
  const revealed=await second(path+'/turn',{...talk('Itachi, '+secret+'.'),revision:imported.revision,requestId:crypto.randomUUID()});
  assert.deepEqual((await second(path+'/export')).campaign.disclosures[0].audience,['Hiruzen','Itachi']);
  await second(path+'/rewind',{revision:revealed.revision,messageIndex:imported.messages.length});
  assert.deepEqual((await second(path+'/export')).campaign.disclosures[0].audience,['Hiruzen']);
 }finally{
  await new Promise(resolve=>server.close(resolve));
 }
});

test('corrige parentesco implícito por frases vizinhas e remove a atribuição vazia do eco',()=>{
 const c=created();
 const i=talk('Tem alguém que ainda precisa de abrigo?');
 const n=apply(c,i,{narrative:'Kaien olha para o avô. Hiruzen abre espaço junto ao portão. O idoso inclina-se para ouvir o neto.\n\n— Tem alguém que ainda precisa de abrigo? — pergunta Kaien em voz alta.\n\nUma mulher avança e aponta para o abrigo lotado.'});
 const text=n.messages.at(-1).text;
 assert.match(text,/pai adotivo/u);
 assert.match(text,/filho adotivo/u);
 assert.match(text,/Uma mulher avança/u);
 assert.doesNotMatch(text,/pergunta Kaien|precisa de abrigo|\bneto\b/u);
});

test('Gemini trata a fala privada como o trecho já enviado e corrige uma revelação adiada',async()=>{
 const c=created();
 const turn=input({segments:[{type:'AGIR',text:'Vou para perto de Hiruzen.'},{type:'FALAR',text:'Hiruzen, só você pode saber: '+secret+'.'}]});
 const payloads=[];
 const generate=provider({key:'teste',external:false,fetcher:async(_url,request)=>{
  payloads.push(JSON.parse(request.body));
  return payloads.length===1?reply({narrative:'Hiruzen aguarda a revelação.'}):reply(recognized);
 }});
 const n=apply(c,turn,await generate(c,turn));
 assert.equal(payloads.length,2);
 assert.equal(JSON.parse(payloads[0].contents[0].parts[0].text).scopedDisclosures[0].utteranceAt,2);
 assert.match(payloads[1].systemInstruction.parts[0].text,/fala privada já foi enviada/u);
 assert.deepEqual(n.disclosures[0].audience,['Hiruzen']);
});

test('uma confidência já dita é ouvida quando a cena confirma que o destinatário se aproximou',async()=>{
 const c=created();
 const turn=input({segments:[{type:'AGIR',text:'Procuro um canto onde apenas Hiruzen possa me ouvir.'},{type:'FALAR',text:'Hiruzen, só você pode saber: '+secret+'.'}]});
 const flawed='Kaien acha um canto reservado. Hiruzen percebe a aproximação discreta e se aproxima com passos firmes.\n\n— Fale, Kaien. O que pesa em sua mente? — pergunta o Terceiro Hokage, inclinando-se para ouvir com atenção a confidência.';
 let calls=0;
 const generate=provider({key:'teste',external:false,fetcher:async()=>{calls++;return reply({narrative:flawed});}});
 const n=apply(c,turn,await generate(c,turn));
 assert.equal(calls,1);
 assert.match(n.messages.at(-1).text,/Hiruzen ouve a confidência de perto/u);
 assert.doesNotMatch(n.messages.at(-1).text,/Fale, Kaien|mapa de cobre|O que pesa/u);
 assert.deepEqual(n.disclosures[0].audience,['Hiruzen']);
 assert.deepEqual(context(n,talk('Hiruzen, onde escondi o mapa?')).scopedDisclosures[0].knownOnlyBy,['Hiruzen']);
 assert.deepEqual(context(n,talk('Itachi, você viu alguém?')).scopedDisclosures,[]);
 const blocked=apply(c,turn,{narrative:'Hiruzen se aproxima perto da parede. Um estrondo abafou o sussurro. — Fale, Kaien.'});
 assert.deepEqual(blocked.disclosures[0].audience,[]);
 assert.doesNotMatch(blocked.messages.at(-1).text,/ouve a confidência/u);
});

test('o destinatário pode ser identificado pelo cargo específico na frase que confirma que ouviu',()=>{
 const n=apply(created(),tell,{narrative:'O Terceiro Hokage ouve o sussurro e fecha a porta.'});
 assert.deepEqual(n.disclosures[0].audience,['Hiruzen']);
});

test('registra a escuta explícita que o Gemini narrou antes de citar o nome do ouvinte',()=>{
 const n=apply(created(),tell,{narrative:[
  'Hiruzen acompanha o movimento com o canto do olho.',
  'O Terceiro inclina levemente o tronco para a frente, ouvindo com atenção o que o garoto traz em sussurro.',
  'Ao captar as palavras, as rugas ao redor dos olhos de Hiruzen se aprofundam, e ele responde em tom baixo.'
 ].join('\n\n')});
 const restored=JSON.parse(JSON.stringify(n));
 assert.deepEqual(restored.disclosures,[{text:secret+'.',day:0,audience:['Hiruzen']}]);
 assert.equal(context(restored,talk('Hiruzen, você lembra do que eu disse?')).scopedDisclosures.length,1);
 assert.deepEqual(context(restored,talk('Itachi, você lembra do que eu disse?')).scopedDisclosures,[]);
 const ambiguous=apply(created(),tell,{narrative:'Ao captar as palavras, Itachi vira o rosto na direção de Hiruzen.'});
 assert.deepEqual(ambiguous.disclosures[0].audience,[]);
});

test('perguntar sobre uma conversa anterior em particular não cria um segredo novo',()=>{
 const n=known();
 const next=apply(n,talk('Itachi, você ouviu o que contei em particular ao Hiruzen?'),{narrative:'Itachi balança a cabeça. — Eu estava do outro lado do pátio.'});
 assert.deepEqual(next.disclosures,n.disclosures);
});
