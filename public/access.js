const token=new URLSearchParams(location.hash.slice(1)).get('invite');
// Remove the invitation from the address before any authenticated navigation.
if(token)history.replaceState(null,'',location.pathname);
const button=document.getElementById('enter'),message=document.getElementById('accessmessage');
if(token){button.hidden=false;message.textContent='Convite recebido. Toque em entrar para autorizar este navegador.';button.onclick=async()=>{button.disabled=true;try{const r=await fetch('/api/access/redeem',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});const data=await r.json();if(!r.ok)throw Error(data.error);location.replace('/');}catch(e){message.textContent=e.message;button.disabled=false;}};}
