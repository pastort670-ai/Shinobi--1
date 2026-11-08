import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes,createHash,randomUUID} from 'node:crypto';
import {mkdirSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {create,input,apply,view,fail} from './engine.js';
import {provider} from './gemini.js';
import {accessControl} from './access.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export function app({dbPath=process.env.DB_PATH||resolve(root,'data/shinobi.sqlite'),generate=provider(),configured=!!process.env.GEMINI_API_KEY,secure=process.env.COOKIE_SECURE==='true',rateMs=15000,access={required:process.env.REQUIRE_INVITE==='true',ownerHash:process.env.OWNER_INVITE_HASH,secret:process.env.ACCESS_SESSION_SECRET}}={}){
 if(dbPath!==':memory:')mkdirSync(dirname(dbPath),{recursive:true});const db=new DatabaseSync(dbPath);db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS campaigns(id TEXT PRIMARY KEY, owner TEXT NOT NULL, state TEXT NOT NULL, previous TEXT); CREATE TABLE IF NOT EXISTS usage(owner TEXT PRIMARY KEY, last INTEGER, day TEXT, count INTEGER); CREATE TABLE IF NOT EXISTS checkpoints(campaign TEXT NOT NULL, owner TEXT NOT NULL, message_index INTEGER NOT NULL, state TEXT NOT NULL, PRIMARY KEY(campaign,owner,message_index));');
 const gate=accessControl(db,{...access,secure});
 const busy=new Set();const hash=t=>createHash('sha256').update(t).digest('hex');
 const get=(id,owner)=>{const r=db.prepare('SELECT * FROM campaigns WHERE id=? AND owner=?').get(id,owner);if(!r)fail('Campanha não encontrada.',404);return r;};
 const canUndo=(id,owner,c,row)=>{
  const checkpoints=new Set(db.prepare('SELECT message_index FROM checkpoints WHERE campaign=? AND owner=?').all(id,owner).map(p=>p.message_index));
  return c.messages.flatMap((m,index)=>m.role==='user'&&(checkpoints.has(index)||(index===c.messages.length-2&&!!row.previous))?[index]:[]);
 };
 const server=http.createServer(async(req,res)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");res.setHeader('Cache-Control','no-store');
 const json=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));};let lock;
 try{const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/healthz'&&req.method==='GET')return json({ok:true});
 if(await gate.route(req,res,url,json))return;
 if(req.method==='GET'&&['/entrar','/access.js'].includes(url.pathname)){const name=url.pathname==='/entrar'?'access.html':'access.js';res.writeHead(200,{'Content-Type':name.endsWith('.js')?'text/javascript; charset=utf-8':'text/html; charset=utf-8'});res.end(readFileSync(resolve(root,'public',name)));return;}
 const visitor=gate.identify(req);
 if(gate.required&&!visitor){
  if(req.method==='GET'&&['/','/access.js','/style.css'].includes(url.pathname)){const name=url.pathname==='/'?'access.html':url.pathname.slice(1);res.writeHead(200,{'Content-Type':name.endsWith('.js')?'text/javascript; charset=utf-8':name.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8'});res.end(readFileSync(resolve(root,'public',name)));return;}
  return json({error:'Acesso restrito. Abra seu convite para entrar.'},401);
 }
 if(!url.pathname.startsWith('/api/')){if(req.method!=='GET')fail('Método não permitido.',405);const assets={'/':['index.html','text/html'],'/app.js':['app.js','text/javascript'],'/style.css':['style.css','text/css'],'/village-icons.svg':['village-icons.svg','image/svg+xml']};const a=assets[url.pathname];if(!a)fail('Não encontrado.',404);res.writeHead(200,{'Content-Type':a[1]+'; charset=utf-8'});res.end(readFileSync(resolve(root,'public',a[0])));return;}
 if(req.headers.origin){const o=new URL(req.headers.origin);if(o.host!==req.headers.host)fail('Origem não permitida.',403);}if(req.headers['sec-fetch-site']==='cross-site')fail('Origem não permitida.',403);
 let token=req.headers.cookie?.match(/(?:^|; )shinobi=([a-f0-9]{64})(?:;|$)/)?.[1];if(!token){token=randomBytes(32).toString('hex');res.setHeader('Set-Cookie',`shinobi=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=31536000${secure?'; Secure':''}`);}const owner=hash(token);
 if(url.pathname==='/api/status'&&req.method==='GET')return json({configured,version:'1.2.3',externalLore:process.env.EXTERNAL_LORE_ENABLED!=='false',admin:!!visitor?.admin,ephemeral:process.env.EPHEMERAL_STORAGE==='true'});
 const read=async(maxBytes=25000)=>{let n=0,chunks=[];for await(const chunk of req){n+=chunk.length;if(n>maxBytes)fail('Requisição muito grande.',413);chunks.push(chunk);}try{return JSON.parse(Buffer.concat(chunks).toString()||'{}');}catch{fail('JSON inválido.');}};
 if(url.pathname==='/api/import'){
  if(req.method!=='POST')fail('Método não permitido.',405);
  const existing=db.prepare('SELECT COUNT(*) AS n FROM campaigns WHERE owner=?').get(owner).n;
  if(existing)fail('Já existe uma campanha neste navegador. Exporte ou finalize sua história antes de restaurar outro backup.',409);
  const raw=await read(4000000),data=raw?.campaign;
  if(!['shinobi-backup-v1','shinobi-backup-v2'].includes(raw?.format)||!data||typeof data!=='object')fail('Arquivo de campanha inválido.');
  if(!data.character||typeof data.character.name!=='string'||!data.character.name.trim()||data.character.name.length>100||!Number.isInteger(data.character.age)||data.character.age<0||data.character.age>100)fail('Ficha inválida no backup.');
  if(!Number.isInteger(data.day)||data.day<0||data.day>36500||!Array.isArray(data.messages)||!data.messages.length||data.messages.length>3500||data.messages.some(m=>!m||!['ai','user'].includes(m.role)||typeof m.text!=='string'||m.text.length>12000))fail('Histórico inválido no backup.');
  if(!Array.isArray(data.facts)||!Array.isArray(data.timeline)||!Array.isArray(data.development)||data.facts.length>20000||data.timeline.length>1000||data.development.length>10000)fail('Registros inválidos no backup.');
  if(!['village','clan','appearance','personality','skills','history','affiliation'].every(k=>data.character[k]===undefined||typeof data.character[k]==='string'&&data.character[k].length<=2000))fail('Campos de personagem inválidos no backup.');
  if(data.title!==undefined&&(typeof data.title!=='string'||data.title.length>100))fail('Título inválido no backup.');
  if(data.facts.some(x=>!x||typeof x.text!=='string'||x.text.length>1000)||data.development.some(x=>!x||typeof x.text!=='string'||x.text.length>500))fail('Dados narrativos inválidos no backup.');

  const safeNum=x=>Number.isInteger(x)&&x>=0&&x<=100;
  if(!safeNum(data.energy)||!safeNum(data.chakra)||!data.progress||!['taijutsu','ninjutsu','genjutsu'].every(k=>safeNum(data.progress[k])))fail('Condições inválidas no backup.');
  const c={...data,id:randomUUID(),locked:true,revision:0,lastInput:null,regenerationHistory:[],
   introConfirmed:data.messages.length>1?true:data.introConfirmed===true,
   memories:Array.isArray(data.memories)?data.memories.slice(-1000):[],
   pendingTasks:Array.isArray(data.pendingTasks)?data.pendingTasks.slice(-200):[],
   personalityTraits:Array.isArray(data.personalityTraits)?data.personalityTraits.slice(-30):[],
   consequences:Array.isArray(data.consequences)?data.consequences.slice(-200):[],
   npcKnowledge:data.npcKnowledge&&typeof data.npcKnowledge==='object'&&!Array.isArray(data.npcKnowledge)?data.npcKnowledge:{},
   relations:data.relations&&typeof data.relations==='object'&&!Array.isArray(data.relations)?data.relations:{},
   overrides:data.overrides&&typeof data.overrides==='object'&&!Array.isArray(data.overrides)?data.overrides:{},
   timeOptions:Array.isArray(data.timeOptions)?data.timeOptions.filter(n=>Number.isInteger(n)&&n>0&&n<=3650).slice(0,3):[]};
  db.prepare('INSERT INTO campaigns VALUES(?,?,?,NULL)').run(c.id,owner,JSON.stringify(c));
  return json(view(c),201);
 }
 if(url.pathname==='/api/campaigns'){
 if(req.method==='GET')return json(db.prepare('SELECT state FROM campaigns WHERE owner=?').all(owner).map(r=>{let c=JSON.parse(r.state);return {id:c.id,title:c.title,name:c.character.name,day:c.day};}));
 if(req.method==='POST'){const raw=await read();if(db.prepare('SELECT 1 FROM campaigns WHERE owner=? LIMIT 1').get(owner))fail('Já existe uma campanha neste navegador. Exporte sua campanha antes de começar outra.',409);const c=create(raw.title,raw.character??{});db.prepare('INSERT INTO campaigns VALUES(?,?,?,NULL)').run(c.id,owner,JSON.stringify(c));return json(view(c),201);}}
 const m=url.pathname.match(/^\/api\/campaigns\/([a-f0-9-]+)(?:\/(turn|regenerate|export|rewind|intro|intro-confirm|memory|close))?$/);if(!m)fail('Rota não encontrada.',404);const [,id,action]=m;let row=get(id,owner),c=JSON.parse(row.state);
 if(req.method==='GET'&&!action)return json({...view(c),undoableMessages:canUndo(id,owner,c,row)});
 if(req.method==='GET'&&action==='export'){res.setHeader('Content-Disposition','attachment; filename="shinobi-campanha.json"');return json({format:'shinobi-backup-v1',campaign:c});}
 if(req.method!=='POST'||!['turn','regenerate','rewind','intro','intro-confirm','memory','close'].includes(action))fail('A ficha é imutável. Operação não permitida.',405);
 if(busy.has(id))fail('Já existe um turno em andamento.',409);busy.add(id);lock=id;const raw=await read();if(raw.revision!==c.revision)fail('Campanha atualizada em outra aba. Recarregue antes de enviar.',409);
 if(action==='close'){
  if(raw.confirm!=='ENCERRAR')fail('Confirme o encerramento para proteger sua campanha.');
  db.exec('BEGIN IMMEDIATE');
  try{db.prepare('DELETE FROM checkpoints WHERE campaign=? AND owner=?').run(id,owner);
      db.prepare('DELETE FROM campaigns WHERE id=? AND owner=?').run(id,owner);
      db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}
  return json({ok:true});
 }
 if(action==='intro-confirm'){if(c.messages.length>1)fail('A campanha já foi iniciada.',409);c.introConfirmed=true;c.revision++;db.prepare('UPDATE campaigns SET state=? WHERE id=? AND owner=?').run(JSON.stringify(c),id,owner);return json({...view(c),undoableMessages:canUndo(id,owner,c,row)});}
 if(action==='memory'){
  const candidateId=String(raw.candidateId||'');
  const message=c.messages.find(m=>m.role==='ai'&&m.memoryCandidate?.id===candidateId);
  if(!message)fail('Memória sugerida não encontrada.',404);
  if(!['saved','dismissed'].includes(raw.decision))fail('Escolha salvar ou ignorar a memória.');
  if(!c.memories)c.memories=[];
  if(!c.memories.some(m=>m.id===candidateId)){
   if(raw.decision==='saved'){const moment={...message.memoryCandidate,status:'saved',day:message.day,id:candidateId};c.memories.push(moment);c.development??=[];c.development.push({day:message.day,text:'Memória marcante: '+moment.title+' — '+moment.description});}
  }
  message.memoryCandidate=null;c.revision++;
  db.prepare('UPDATE campaigns SET state=? WHERE id=? AND owner=?').run(JSON.stringify(c),id,owner);
  return json({...view(c),undoableMessages:canUndo(id,owner,c,row)});
 }
 if(action==='intro'){
  if(c.messages.length!==1||c.introConfirmed)fail('A introdução já foi confirmada ou a campanha começou.',409);
  const oldIntros=(c.introHistory||[]).concat(c.messages[0]?.text||'').filter(Boolean).slice(-4);const introInput={segments:[],days:0,opening:true,regeneration:{rejected:oldIntros,attempt:oldIntros.length,requireDifferentApproach:oldIntros.length>=2}};
  const now=Date.now(),today=new Date().toISOString().slice(0,10);const usage=db.prepare('SELECT * FROM usage WHERE owner=?').get(owner);if(usage&&now-usage.last<rateMs)fail('Aguarde alguns segundos antes de gerar outra introdução.',429);if(usage?.day===today&&usage.count>=Number(process.env.DAILY_LIMIT||100))fail('Limite diário local atingido.',429);db.prepare('INSERT OR REPLACE INTO usage VALUES(?,?,?,?)').run(owner,now,today,usage?.day===today?usage.count+1:1);
  const result=await generate(c,introInput);
  if(!result?.narrative||typeof result.narrative!=='string')fail('Introdução inválida. Tente novamente.',502);
  c.introHistory=oldIntros;c.day=Number.isInteger(result.openingDay)&&result.openingDay>=0&&result.openingDay<=6?result.openingDay:0;c.messages[0]={role:'ai',text:result.narrative.slice(0,12000),day:c.day,sceneType:'normal'};
  c.revision++;
  db.prepare('UPDATE campaigns SET state=? WHERE id=? AND owner=?').run(JSON.stringify(c),id,owner);
  return json({...view(c),undoableMessages:canUndo(id,owner,c,row)});
 }
 if(action==='rewind'){
  const index=raw.messageIndex;
  if(!Number.isInteger(index)||index<1||index>=c.messages.length||c.messages[index]?.role!=='user')fail('Selecione uma mensagem sua para retornar.',400);
  const saved=db.prepare('SELECT state FROM checkpoints WHERE campaign=? AND owner=? AND message_index=?').get(id,owner,index)?.state||(index===c.messages.length-2?row.previous:null);
  if(!saved)fail('Esse trecho da campanha não tem um ponto de retorno salvo. Só é possível excluir mensagens com histórico de retorno disponível.',409);
  const restored=JSON.parse(saved);
  if(restored.id!==c.id||restored.messages.length!==index)fail('Ponto de retorno inconsistente; nenhuma mensagem foi apagada.',409);
  restored.revision=c.revision+1;
  db.exec('BEGIN IMMEDIATE');
  try{db.prepare('UPDATE campaigns SET state=?,previous=NULL WHERE id=? AND owner=?').run(JSON.stringify(restored),id,owner);
      db.prepare('DELETE FROM checkpoints WHERE campaign=? AND owner=? AND message_index>=?').run(id,owner,index);
      db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}
  return json({...view(restored),undoableMessages:canUndo(id,owner,restored,{previous:null})});
 }
 let i,base;if(action==='regenerate'){const prior=row.previous||((c.messages.length>=3&&c.messages.at(-2)?.role==='user')?db.prepare('SELECT state FROM checkpoints WHERE campaign=? AND owner=? AND message_index=?').get(id,owner,c.messages.length-2)?.state:null);if(!prior||!c.lastInput)fail('Nenhum turno para regenerar.');base=JSON.parse(prior);if(base.id!==c.id||base.messages.length!==c.messages.length-2)fail('Ponto anterior inconsistente; nenhuma alteração foi feita.',409);i=c.lastInput;
 const rejected=[...(Array.isArray(c.regenerationHistory)?c.regenerationHistory.slice(-4):[]),c.messages.at(-1)?.text].filter(x=>typeof x==='string'&&x.trim()).slice(-5);
 const words=t=>new Set(t.toLowerCase().match(/[\p{L}\p{N}]+/gu)||[]);
 const a=words(rejected.at(-1)||''),b=words(rejected.at(-2)||'');
 const similarity=a.size&&b.size?[...a].filter(w=>b.has(w)).length/new Set([...a,...b]).size:0;
 i={...i,regeneration:{rejected:rejected.slice(-2).map(v=>v.slice(0,1000)),attempt:rejected.length,requireDifferentApproach:rejected.length>=2&&(similarity>=0.4||rejected.length>=3),constraint:'Mudar a narração dentro da mesma cena, sem adicionar acontecimentos aleatórios nem transformar respostas descartadas em fatos.'}};
 }else{base=c;i=input(raw);}
 const now=Date.now(),day=new Date().toISOString().slice(0,10);let u=db.prepare('SELECT * FROM usage WHERE owner=?').get(owner);if(u&&now-u.last<rateMs)fail('Aguarde alguns segundos antes de enviar outro turno.',429);if(u?.day===day&&u.count>=Number(process.env.DAILY_LIMIT||100))fail('Limite diário local atingido.',429);db.prepare('INSERT OR REPLACE INTO usage VALUES(?,?,?,?)').run(owner,now,day,u?.day===day?u.count+1:1);
 const r=await generate(base,i);const next=apply(base,i,r);next.revision=c.revision+1;next.regenerationHistory=action==='regenerate'?i.regeneration.rejected:[];if(Array.isArray(r.sources)){next.messages.at(-1).sources=r.sources.filter(s=>typeof s.title==='string'&&typeof s.url==='string'&&/^https:\/\/(pt\.wikipedia\.org|naruto\.fandom\.com)\/wiki\//.test(s.url)).slice(0,2).map(s=>({title:s.title.slice(0,120),url:s.url.slice(0,500)}));}next.messages.at(-1).lookupStatus=['consulted','filtered','unavailable','not-needed','disabled'].includes(r.lookupStatus)?r.lookupStatus:'not-needed';db.exec('BEGIN IMMEDIATE');try{db.prepare('UPDATE campaigns SET state=?,previous=? WHERE id=? AND owner=?').run(JSON.stringify(next),JSON.stringify(base),id,owner);
  db.prepare('INSERT OR REPLACE INTO checkpoints(campaign,owner,message_index,state) VALUES(?,?,?,?)').run(id,owner,base.messages.length,JSON.stringify(base));
  db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}
 return json({...view(next),undoableMessages:canUndo(id,owner,next,{previous:JSON.stringify(base)})});
 }catch(e){json({error:e.status?e.message:'Erro interno. A campanha foi preservada.'},e.status||500);}finally{if(lock)busy.delete(lock);}});
 server.on('close',()=>db.close());return server;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const arg=process.argv.indexOf('--port');const port=Number(process.env.PORT||(arg>=0?process.argv[arg+1]:3000));const server=app();server.listen(port,'0.0.0.0',()=>console.log('SHINOBI em execução na porta '+port));}
