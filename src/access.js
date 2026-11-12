import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
const hash=s=>createHash('sha256').update(s).digest('hex');
const equal=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
export function accessControl(db,{required=false,passwordHash='',secret='',secure=false}={}){
 const configured=/^[a-f0-9]{64}$/.test(passwordHash)&&typeof secret==='string'&&secret.length>=32;
 const sign=s=>createHmac('sha256',secret).update(s).digest('base64url');
 const attempts=new Map();
 function identify(req){
  if(!required)return {id:'local',admin:false};
  if(!configured)return null;
  try{
   const cookie=req.headers.cookie?.match(/(?:^|; )shinobi_access=([A-Za-z0-9_.-]+)(?:;|$)/)?.[1];
   if(!cookie)return null;
   const [body,sig]=cookie.split('.');
   if(!equal(sign(body),sig))return null;
   const data=JSON.parse(Buffer.from(body,'base64url').toString());
   return data.exp>Date.now()&&data.v===2&&data.passwordHash===passwordHash?{id:'player',admin:false}:null;
  }catch{return null;}
 }
 async function route(req,res,url,json){
  if(url.pathname==='/api/access/login'&&req.method==='POST'){
   if(!required||!configured){json({error:'Acesso por senha não configurado no servidor.'},503);return true;}
   if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host||req.headers['sec-fetch-site']==='cross-site'){json({error:'Origem não permitida.'},403);return true;}
   const key=req.socket.remoteAddress||'unknown',now=Date.now();
   const active=(attempts.get(key)||[]).filter(t=>t>now-15*60000);
   if(active.length>=8){json({error:'Muitas tentativas. Tente novamente mais tarde.'},429);return true;}
   let bytes=0,chunks=[];
   try{for await(const chunk of req){bytes+=chunk.length;if(bytes>1024)throw Error('limit');chunks.push(chunk);}
    const data=JSON.parse(Buffer.concat(chunks).toString());const pwd=data?.password;
    if(typeof pwd!=='string'||pwd.length<1||pwd.length>128||!equal(hash(pwd),passwordHash))throw Error('password');
    attempts.delete(key);
    const exp=now+30*86400000;
    const body=Buffer.from(JSON.stringify({v:2,passwordHash,exp})).toString('base64url');
    res.setHeader('Set-Cookie',`shinobi_access=${body}.${sign(body)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000${secure?'; Secure':''}`);
    json({ok:true});
   }catch{active.push(now);attempts.set(key,active);json({error:'Senha incorreta.'},403);}
   return true;
  }
  if(url.pathname.startsWith('/api/invites')||url.pathname==='/api/access/redeem'){json({error:'Convites foram desativados. Entre com a senha.'},410);return true;}
  return false;
 }
 return {identify,route,required};
}
