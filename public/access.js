try{document.documentElement.dataset.theme=localStorage.getItem('shinobi-theme')==='dark'?'dark':'light';}catch{}
const button=document.getElementById('enter'),message=document.getElementById('accessmessage'),field=document.getElementById('invitation');
const key='shinobi-pending-invitation';
function extract(value){const text=value.trim();if(/^[a-f0-9]{64}$/.test(text))return text;try{const url=new URL(text);if(url.origin!==location.origin)return '';return new URLSearchParams(url.hash.slice(1)).get('invite')||'';}catch{return '';}}
let token=extract(location.href);
try{if(token)sessionStorage.setItem(key,JSON.stringify({token,until:Date.now()+900000}));else{const saved=JSON.parse(sessionStorage.getItem(key)||'null');if(saved?.until>Date.now())token=saved.token;}}catch{}
// Remove credentials from the address only after retaining them for a reload.
if(location.hash)history.replaceState(null,'',location.pathname);
if(token)message.textContent='Convite reconhecido. Toque em ENTRAR NO SHINOBI para abrir seu acesso.';
button.onclick=async()=>{const selected=field.value.trim()?extract(field.value):token;if(!/^[a-f0-9]{64}$/.test(selected)){message.textContent='Cole o link completo de convite neste campo e toque em entrar.';field.focus();return;}button.disabled=true;message.textContent='Abrindo seu acesso… O servidor gratuito pode levar cerca de um minuto para despertar.';try{const r=await fetch('/api/access/redeem',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:selected})});let data;try{data=await r.json();}catch{throw Error('O servidor está iniciando. Aguarde e toque em entrar novamente.');}if(!r.ok)throw Error(data.error);try{sessionStorage.removeItem(key);}catch{}location.replace('/');}catch(e){message.textContent=e.message||'Não foi possível conectar. Tente novamente.';button.disabled=false;}};
