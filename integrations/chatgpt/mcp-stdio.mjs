// Protótipo local de ferramentas MCP (stdio). NÃO publicar como endpoint HTTP.
// Uso: SHINOBI_OWNER_HASH=<sha256-do-cookie> DB_PATH=... node integrations/chatgpt/mcp-stdio.mjs
import {DatabaseSync} from 'node:sqlite';
import {resolve} from 'node:path';
import {createInterface} from 'node:readline';
import {view} from '../../src/engine.js';

const owner=process.env.SHINOBI_OWNER_HASH;
if(!owner || !/^[a-f0-9]{64}$/.test(owner)){
  process.stderr.write('Configure SHINOBI_OWNER_HASH (hash SHA-256 do identificador autorizado).\\n');
  process.exit(1);
}
const db=new DatabaseSync(resolve(process.env.DB_PATH||'data/shinobi.sqlite'),{readOnly:true});
const tools=[
 {name:'listar_campanhas',description:'Lista campanhas do proprietário autorizado, sem modificar dados.',inputSchema:{type:'object',properties:{},additionalProperties:false}},
 {name:'consultar_campanha',description:'Lê ficha, calendário, condições e progressão de uma campanha.',inputSchema:{type:'object',properties:{id:{type:'string'}},required:['id'],additionalProperties:false}},
 {name:'consultar_memorias',description:'Lê as últimas memórias e mensagens da campanha.',inputSchema:{type:'object',properties:{id:{type:'string'},limite:{type:'integer',minimum:1,maximum:30}},required:['id'],additionalProperties:false}}
];
function campaign(id){
 if(typeof id!=='string'||!/^[a-f0-9-]{36}$/.test(id))throw Error('Identificador inválido.');
 const row=db.prepare('SELECT state FROM campaigns WHERE id=? AND owner=?').get(id,owner);
 if(!row)throw Error('Campanha não encontrada ou acesso negado.');
 return JSON.parse(row.state);
}
function call(name,args={}){
 if(name==='listar_campanhas')return db.prepare('SELECT state FROM campaigns WHERE owner=?').all(owner).map(({state})=>{const c=JSON.parse(state);return {id:c.id,titulo:c.title,personagem:c.character.name};});
 if(name==='consultar_campanha'){const v=view(campaign(args.id));return {id:v.id,titulo:v.title,personagem:v.character,idade:v.age,calendario:v.calendar,condicoes:v.conditions,habilidades:v.abilities,relacoes:v.relations};}
 if(name==='consultar_memorias'){const c=campaign(args.id),n=Math.max(1,Math.min(30,Number.isInteger(args.limite)?args.limite:10));return {memorias:c.facts.slice(-n),mensagens:c.messages.slice(-n)};}
 throw Error('Ferramenta desconhecida.');
}
function reply(x){process.stdout.write(JSON.stringify(x)+'\\n');}
const rl=createInterface({input:process.stdin,crlfDelay:Infinity});
for await(const line of rl){
 let m;try{m=JSON.parse(line);}catch{reply({jsonrpc:'2.0',id:null,error:{code:-32700,message:'JSON inválido'}});continue;}
 if(!m||m.jsonrpc!=='2.0'){reply({jsonrpc:'2.0',id:m?.id??null,error:{code:-32600,message:'Requisição inválida'}});continue;}
 if(m.id===undefined)continue;
 try{
  let result;
  if(m.method==='initialize')result={protocolVersion:'2025-03-26',capabilities:{tools:{}},serverInfo:{name:'shinobi-readonly',version:'0.1.0'}};
  else if(m.method==='ping')result={};
  else if(m.method==='tools/list')result={tools};
  else if(m.method==='tools/call'){const value=call(m.params?.name,m.params?.arguments);result={content:[{type:'text',text:JSON.stringify(value)}]};}
  else {reply({jsonrpc:'2.0',id:m.id,error:{code:-32601,message:'Método desconhecido'}});continue;}
  reply({jsonrpc:'2.0',id:m.id,result});
 }catch(e){reply({jsonrpc:'2.0',id:m.id,result:{isError:true,content:[{type:'text',text:e.message}]}});}
}
db.close();
