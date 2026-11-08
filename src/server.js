import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes,createHash} from 'node:crypto';
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
 const canUndo=(id,owner,c,row)=>c.messages.map((m,index)=>m.role==='user'&&(!!db.prepare('SELECT 1 FROM checkpoints WHERE campaign=? AND owner=? AND message_index=?').get(id,owner,index)||(index===c.messages.length-2&&!!row.previous))?index:null).filter(index=>index!==null);
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
 if(!url.pathname.startsWith('/api/')){if(req.method!=='GET')fail('Método não permitido.',405);const assets={'/':['index.html','text/html'],'/app.js':['app.js','text/javascript'],'/style.css':['style.css','text/css']};const a=assets[url.pathname];if(!a)fail('Não encontrado.',404);res.writeHead(200,{'Content-Type':a[1]+'; charset=utf-8'});res.end(readFileSync(resolve(root,'public',a[0])));return;}
 if(req.headers.origin){const o=new URL(req.headers.origin);if(o.host!==req.headers.host)fail('Origem não permitida.',403);}if(req.headers['sec-fetch-site']==='cross-site')fail('Origem não permitida.',403);
 let token=req.headers.cookie?.match(/(?:^|; )shinobi=([a-f0-9]{64})(?:;|$)/)?.[1];if(!token){token=randomBytes(32).toString('hex');res.setHeader('Set-Cookie',`shinobi=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=31536000${secure?'; Secure':''}`);}const owner=hash(token);
 if(url.pathname==='/api/status'&&req.method==='GET')return json({configured,version:'1.1.0',externalLore:process.env.EXTERNAL_LORE_ENABLED!=='false',admin:!!visitor?.admin,ephemeral:process.env.EPHEMERAL_STORAGE==='true'});
 const read=async()=>{let n=0,chunks=[];for await(const chunk of req){n+=chunk.length;if(n>25000)fail('Requisição muito grande.',413);chunks.push(chunk);}try{return JSON.parse(Buffer.concat(chunks).toString()||'{}');}catch{fail('JSON inválido.');}};
 if(url.pathname==='/api/campaigns'){
 if(req.method==='GET')return json(db.prepare('SELECT state FROM campaigns WHERE owner=?').all(owner).map(r=>{let c=JSON.parse(r.state);return {id:c.id,title:c.title,name:c.character.name,day:c.day};}));
 if(req.method==='POST'){const raw=await read();const c=create(raw.title,raw.character??{});db.prepare('INSERT INTO campaigns VALUES(?,?,?,NULL)').run(c.id,owner,JSON.stringify(c));return json(view(c),201);}}
 const m=url.pathname.match(/^\/api\/campaigns\/([a-f0-9-]+)(?:\/(turn|regenerate|export|rewind))?$/);if(!m)fail('Rota não encontrada.',404);const [,id,action]=m;let row=get(id,owner),c=JSON.parse(row.state);
 if(req.method==='GET'&&!action)return json({...view(c),undoableMessages:canUndo(id,owner,c,row)});
 if(req.method==='GET'&&action==='export'){res.setHeader('Content-Disposition','attachment; filename="shinobi-campanha.json"');return json({format:'shinobi-backup-v1',campaign:c});}
 if(req.method!=='POST'||!['turn','regenerate','rewind'].includes(action))fail('A ficha é imutável. Operação não permitida.',405);
 if(busy.has(id))fail('Já existe um turno em andamento.',409);busy.add(id);lock=id;const raw=await read();if(raw.revision!==c.revision)fail('Campanha atualizada em outra aba. Recarregue antes de enviar.',409);
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
 let i,base;if(action==='regenerate'){const prior=row.previous||((c.messages.length>=3&&c.messages.at(-2)?.role==='user')?db.prepare('SELECT state FROM checkpoints WHERE campaign=? AND owner=? AND message_index=?').get(id,owner,c.messages.length-2)?.state:null);if(!prior||!c.lastInput)fail('Nenhum turno para regenerar.');base=JSON.parse(prior);if(base.id!==c.id||base.messages.length!==c.messages.length-2)fail('Ponto anterior inconsistente; nenhuma alteração foi feita.',409);i=c.lastInput;}else{base=c;i=input(raw);}
 const now=Date.now(),day=new Date().toISOString().slice(0,10);let u=db.prepare('SELECT * FROM usage WHERE owner=?').get(owner);if(u&&now-u.last<rateMs)fail('Aguarde alguns segundos antes de enviar outro turno.',429);if(u?.day===day&&u.count>=Number(process.env.DAILY_LIMIT||100))fail('Limite diário local atingido.',429);db.prepare('INSERT OR REPLACE INTO usage VALUES(?,?,?,?)').run(owner,now,day,u?.day===day?u.count+1:1);
 const r=await generate(base,i);const next=apply(base,i,r);next.revision=c.revision+1;if(Array.isArray(r.sources)){next.messages.at(-1).sources=r.sources.filter(s=>typeof s.title==='string'&&typeof s.url==='string'&&/^https:\/\/(pt\.wikipedia\.org|naruto\.fandom\.com)\/wiki\//.test(s.url)).slice(0,2).map(s=>({title:s.title.slice(0,120),url:s.url.slice(0,500)}));}next.messages.at(-1).lookupStatus=['consulted','filtered','unavailable','not-needed','disabled'].includes(r.lookupStatus)?r.lookupStatus:'not-needed';db.exec('BEGIN IMMEDIATE');try{db.prepare('UPDATE campaigns SET state=?,previous=? WHERE id=? AND owner=?').run(JSON.stringify(next),JSON.stringify(base),id,owner);
  db.prepare('INSERT OR REPLACE INTO checkpoints(campaign,owner,message_index,state) VALUES(?,?,?,?)').run(id,owner,base.messages.length,JSON.stringify(base));
  db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}
 return json({...view(next),undoableMessages:canUndo(id,owner,next,{previous:JSON.stringify(base)})});
 }catch(e){json({error:e.status?e.message:'Erro interno. A campanha foi preservada.'},e.status||500);}finally{if(lock)busy.delete(lock);}});
 server.on('close',()=>db.close());return server;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const arg=process.argv.indexOf('--port');const port=Number(process.env.PORT||(arg>=0?process.argv[arg+1]:3000));const server=app();server.listen(port,'0.0.0.0',()=>console.log('SHINOBI em execução na porta '+port));}
