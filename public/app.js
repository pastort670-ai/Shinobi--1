const $=id=>document.getElementById(id);let autoRestoreAttempted=false;let current=null,busy=false,parts=[{type:'AGIR',text:''}],timeAmount=1,timeUnit=24,calendarCursor=null,calendarSelected=0,editorMode='AGIR',timeActive=false,timeText='',savedCaret=null,lastAction='inicialização';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const saved=(key,fallback)=>{try{return localStorage.getItem(key)||fallback;}catch{return fallback;}};
const remember=(key,value)=>{try{localStorage.setItem(key,value);}catch{}};
// Rascunhos por campanha ficam no próprio aparelho. Não são enviados ao narrador até o usuário clicar em Enviar.
const draftKey=id=>'shinobi-draft-'+id;
let pendingDelivery = null, serverVersion = '';
function saveDraft(delivery=null){
 pendingDelivery=delivery;
 if(!current?.id)return;
 try{
  const draft={parts:editorParts(),editorMode,timeActive,timeText,timeAmount,timeUnit,delivery};
  localStorage.setItem(draftKey(current.id),JSON.stringify(draft));
 }catch{}
}
function loadDraft(){
 pendingDelivery=null;
 try{
  const state=JSON.parse(localStorage.getItem(draftKey(current.id))||'null');
  if(!state||!Array.isArray(state.parts)||state.parts.length>8)return;
  const valid=state.parts.every(p=>p&&['AGIR','FALAR'].includes(p.type)&&typeof p.text==='string'&&p.text.length<=2000);
  if(!valid)return;
  if(state.delivery?.id && current.messages.some(m=>m.role==='user'&&m.delivery?.id===state.delivery.id)){
   clearDraft(current.id);
   return;
  }
  pendingDelivery=state.delivery||null;
  parts=state.parts.length?state.parts:[{type:'AGIR',text:''}];
  editorMode=['AGIR','FALAR'].includes(state.editorMode)?state.editorMode:'AGIR';
  timeActive=Boolean(state.timeActive)&&current.timeAvailable===true;
  timeText=typeof state.timeText==='string'?state.timeText.slice(0,2000):'';
  timeAmount=Number.isFinite(Number(state.timeAmount))?Number(state.timeAmount):1;
  timeUnit=[1,24,168,720,8760].includes(Number(state.timeUnit))?Number(state.timeUnit):24;
 }catch{}
}
function clearDraft(id){try{localStorage.removeItem(draftKey(id));}catch{}}
function theme(value){document.documentElement.dataset.theme=value;remember('shinobi-theme',value);$('lighttheme').classList.toggle('selected',value==='light');$('darktheme').classList.toggle('selected',value==='dark');$('lighttheme').setAttribute('aria-pressed',String(value==='light'));$('darktheme').setAttribute('aria-pressed',String(value==='dark'));document.querySelector('meta[name="theme-color"]').content=value==='dark'?'#14121c':'#f4ecd9';}
theme(saved('shinobi-theme','light')==='dark'?'dark':'light');
const villageSymbols={Konohagakure:'konohagakure',Sunagakure:'sunagakure',Kirigakure:'kirigakure',Kumogakure:'kumogakure',Iwagakure:'iwagakure',Amegakure:'amegakure',Takigakure:'takigakure',Kusagakure:'kusagakure',Otogakure:'otogakure',Hoshigakure:'hoshigakure'};
function updateVillageSymbol(village){
 const symbol=villageSymbols[village]||'konohagakure',label=village||'Konohagakure (padrão)';
 document.querySelectorAll('.village-symbol use').forEach(use=>use.setAttribute('href','/village-icons.svg#'+symbol));
 document.querySelectorAll('.village-symbol').forEach(el=>el.setAttribute('aria-label','Símbolo da vila: '+label));
 document.documentElement.dataset.village=symbol;
}
function fitMobileViewport(){const h=window.visualViewport?.height||window.innerHeight;if(h>200)document.documentElement.style.setProperty('--visible-height',Math.round(h)+'px');}
window.visualViewport?.addEventListener('resize',fitMobileViewport);window.addEventListener('orientationchange',fitMobileViewport);fitMobileViewport();$('lighttheme').onclick=()=>theme('light');$('darktheme').onclick=()=>theme('dark');
function drawer(open){document.body.classList.toggle('sidebar-open',open);$('menutoggle').setAttribute('aria-expanded',String(open));$('backdrop').hidden=!(open&&matchMedia('(max-width:800px)').matches);}
$('menutoggle').onclick=()=>drawer(!document.body.classList.contains('sidebar-open'));$('closemenu').onclick=() =>drawer(false);$('backdrop').onclick=()=>drawer(false);window.addEventListener('resize',()=>drawer(document.body.classList.contains('sidebar-open')));document.addEventListener('keydown',e=>{if(e.key==='Escape'){drawer(false);$('more').open=false;}});
if(matchMedia('(min-width:1000px)').matches)drawer(true);
function notice(s=''){for(const id of ['notice','turnnotice']){const el=$(id);if(el){el.textContent=s;el.hidden=!s;}}}
async function api(path,body,{startup=false}={}){let r;try{r=await fetch('/api/'+path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',signal:startup?AbortSignal.timeout(20000):undefined,headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});}catch(e){if(e?.name==='TimeoutError'||e?.name==='AbortError')throw Error('O servidor demorou para responder. Tente conectar novamente.');throw Object.assign(Error('Sem comunicação com o servidor. Verifique a conexão e tente novamente.'),{code:'TRANSPORT'});}let data;try{data=await r.json();}catch{throw Object.assign(Error('O servidor devolveu uma resposta inesperada. Aguarde e tente novamente.'),{code:'TRANSPORT'});}if(r.status===401)throw Object.assign(Error('A sessão expirou ou o navegador bloqueou os cookies. Entre com a senha novamente.'),{code:'AUTH'});if(!r.ok)throw Error(data.error||'Falha na comunicação (HTTP '+r.status+').');return data;}
async function backupCurrent(){if(!current?.id)return;const id=current.id,revision=current.revision;try{const r=await fetch('/api/campaigns/'+id+'/export');if(!r.ok)return;const t=await r.text();if(current?.id!==id||current.revision!==revision)return;try{await storeBackup(t);}catch{if(t.length<2500000)remember('shinobi-autobackup',t);}}catch{}}
// Cópia local maior e transacional no IndexedDB (isolada por navegador).
const backupDb=()=>new Promise((resolve,reject)=>{
 if(!('indexedDB' in window)){reject(Error('IndexedDB indisponível'));return;}
 const req=indexedDB.open('shinobi-saves',1);
 req.onupgradeneeded=()=>req.result.createObjectStore('campaigns');
 req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
});
async function storeBackup(raw){
 const db=await backupDb();try{await new Promise((resolve,reject)=>{
  const tx=db.transaction('campaigns','readwrite');tx.objectStore('campaigns').put(raw,'latest');
  tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
 });}finally{db.close();}
}
async function recoverBackup(){
 try{const db=await backupDb();try{
  const raw=await new Promise((resolve,reject)=>{const request=db.transaction('campaigns','readonly').objectStore('campaigns').get('latest');request.onsuccess=()=>resolve(request.result||'');request.onerror=()=>reject(request.error);});
  if(raw)return raw;
 }finally{db.close();}}catch{}
 return saved('shinobi-autobackup','');
}
function freeze(){if($('editor')){$('editor').contentEditable=busy?'false':'true';$('editor').setAttribute('aria-disabled',String(busy));}document.querySelectorAll('button,input,select,textarea').forEach(b=>{if(!b.hasAttribute('data-keep-enabled')&&!['menutoggle','closemenu','backdrop'].includes(b.id))b.disabled=busy||(b.id==='regen'&&(!current||current.messages.length<3||current.introConfirmed===false));});$('chat').setAttribute('aria-busy',String(busy));}
async function run(fn,narrating=false){if(busy)return false;busy=true;notice();$('processing').hidden=!narrating;$('savehint').textContent=narrating?'Aguarde a resposta para iniciar o próximo turno.':'Ações e falas seguem juntas em um turno.';freeze();let ok=false;try{await fn();ok=true;}catch(e){notice(e.message||'Falha no envio. Seu texto foi mantido.');}finally{busy=false;$('processing').hidden=true;$('savehint').textContent='Ações e falas seguem juntas em um turno.';freeze();}return ok;}
function tab(name){['story','sheet','calendarpage','memory','timeline','library'].forEach(t=>$(t).hidden=t!==name);document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));if(matchMedia('(max-width:800px)').matches)drawer(false);$('more').open=false;}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>tab(b.dataset.tab));
async function list(select){const cs=await api('campaigns');$('campaigns').innerHTML=cs.map(c=>`<option value="${c.id}">${esc(c.title)} · ${esc(c.name)}</option>`).join('');if(cs.length){const id=select||saved('shinobi-active','');$('campaigns').value=cs.some(c=>c.id===id)?id:cs[0].id;await load($('campaigns').value);}else{$('campaigns').innerHTML='<option>Crie sua primeira campanha</option>';current=null;updateVillageSymbol(null);const backup=await Promise.race([recoverBackup(),new Promise(resolve=>setTimeout(()=>resolve(''),4000))]);
 if(backup&&!autoRestoreAttempted&&saved('shinobi-active','')){
  autoRestoreAttempted=true;
  try{
   const data=JSON.parse(backup);
   if(data?.campaign?.id===saved('shinobi-active','')&&Array.isArray(data.campaign.messages)&&data.campaign.messages.length>1){
    const restored=await api('import',data);
    notice('A campanha anterior foi recuperada do backup deste aparelho após a atualização.');
    return list(restored.id);
   }
  }catch(error){notice('Não foi possível recuperar automaticamente a campanha: '+error.message);}
 }
 if(backup)notice('Há um backup neste aparelho. Abra Mais opções → Recuperar backup deste aparelho para recuperar sua campanha.');}}
async function auditCurrentMemories(){
 if(!current?.needsMilestoneAudit)return;
 const id=current.id,revision=current.revision;
 const loading=$('processing');loading.hidden=false;
 $('connection').textContent='Revisando Memórias Marcantes…';
 try{
  const updated=await api('campaigns/'+id+'/audit',{revision});
  if(current?.id===id&&current.revision===revision){current=updated;render();}
  $('connection').textContent='● Memórias verificadas';
  if(updated.verifiedAchievements?.length)notice('A ficha foi atualizada com '+updated.verifiedAchievements.length+' conquista(s) confirmada(s) nas Memórias Marcantes.');
 }catch(error){$('connection').textContent='● Memórias aguardam revisão';notice('A campanha está disponível, mas a revisão automática das memórias falhou: '+error.message);}
 finally{loading.hidden=true;}
}
async function load(id){current=await api('campaigns/'+id);remember('shinobi-active',id);parts=[{type:'AGIR',text:''}];timeActive=false;timeText='';editorMode='AGIR';calendarCursor=null;calendarSelected=current.day;loadDraft();render();await auditCurrentMemories();}
$('campaigns').onchange=()=>run(()=>load($('campaigns').value));
function openCreation(){if(busy)return;if(current){notice('Uma campanha por vez. Exporte e encerre a campanha atual antes de começar outra.');return;}$('createform').reset();fillBaseCharacter();$('creation').showModal();drawer(false);}
$('new').onclick=openCreation;$('start').onclick=openCreation;$('close').onclick=()=>$('creation').close();
const BASE_CHARACTER={
 title:'Kaien · O caminho de Sarutobi',
 name:'Kaien Sarutobi',
 age:8,
 village:'Konohagakure',
 clan:'Sarutobi',
 affiliation:'Academia Ninja',
 appearance:'Cabelos castanhos, olhos castanhos e expressão confiante. Postura disciplinada e observadora, fruto da educação recebida de Hiruzen.',
 personality:'Inteligente, independente, ambicioso e extremamente curioso. Orgulha-se das próprias capacidades e não gosta de receber ordens sem compreender seus motivos. Respeita Hiruzen, mas prefere formar seus próprios julgamentos e convicções.',
 skills:'Prodígio excepcional: inteligência, memória, reflexos e aprendizado muito acima da média. Talento natural para ninjutsu, taijutsu, genjutsu e estratégia. Assimila fundamentos rapidamente, surpreende instrutores experientes e pode superar colegas mais velhos com treino e dedicação. Ainda precisa de experiência e dominar técnicas progressivamente; não começa com jutsus aprendidos automaticamente.',
 history:'Órfão desde pequeno, Kaien foi acolhido e adotado aos seis anos por Hiruzen Sarutobi, o Terceiro Hokage. Recebeu o sobrenome e reconhecimento como membro legítimo da família Sarutobi. Hiruzen percebeu seu talento extraordinário e assumiu pessoalmente parte de sua educação e treinamento. Dois anos depois, quando Naruto nasce, Kaien já é uma das jovens promessas de Konoha. Sua adoção o aproxima de Asuma e do clã Sarutobi; ao longo da vida poderá criar vínculos com Jiraiya, Tsunade e outros antigos alunos de Hiruzen. Teve pouco contato com Orochimaru, cujo caminho poderá gerar rivalidade. Kaien deseja construir seu próprio caminho ninja, aceitar missões e tomar decisões segundo o que considera correto. Seu futuro depende das experiências e escolhas da campanha.'
};
function fillBaseCharacter(){const form=$('createform');for(const [key,value] of Object.entries(BASE_CHARACTER)){const field=form.elements.namedItem(key);if(field)field.value=String(value);}const warning=$('character-warning');warning.hidden=true;warning.textContent='';}
$('akira').onclick=fillBaseCharacter;
$('createform').onsubmit=e=>{e.preventDefault();const raw=Object.fromEntries(new FormData(e.target));const age=Number(raw.age),problem=['Genin','Chūnin','Jōnin','ANBU'].includes(raw.affiliation)&&age<5?'Afiliação incompatível com a idade inicial.':raw.affiliation==='Academia Ninja'&&age<4?'A Academia exige idade adequada.':raw.clan==='Uchiha'&&raw.village==='Sem vila'&&!/ex[ií]l|fug|viag|fora|refugi/i.test(raw.history)?'Explique na história como um Uchiha vive fora de sua vila.':'';const warning=$('character-warning');warning.textContent=problem;warning.hidden=!problem;if(problem)return;run(async()=>{const c=await api('campaigns',{title:raw.title,character:raw});$('creation').close();await list(c.id);tab('story');try{current=await api('campaigns/'+c.id+'/intro',{revision:current.revision});calendarSelected=current.day;render();}catch(error){notice('Ficha criada. Introdução personalizada indisponível: '+error.message+' Use “Gerar outra introdução” para tentar novamente.');}},true);};
function focusPart(){ $('editor')?.focus(); }
function editorParts(){
 const root=$('editor');if(!root)return parts;
 const segments=[];
 const add=(kind,text)=>{const clean=String(text||'').replace(/\u200b/g,'');if(!clean)return;const type=kind==='FALAR'?'FALAR':'AGIR';const prev=segments.at(-1);if(prev&&prev.type===type)prev.text+=clean;else segments.push({type,text:clean});};
 for(const node of root.childNodes){
  if(node.nodeType===3){add(editorMode,node.textContent);continue;}
  if(node.nodeType!==1)continue;
  if(node.matches('span[data-kind]'))add(node.dataset.kind,node.textContent);
  else if(node.tagName==='BR')add(editorMode,'\n');
  else add(editorMode,(node.innerText||node.textContent||'')+(node.tagName==='DIV'?'\n':''));
 }
 return segments;
}
function checkReview(){const el=$('reviewwarning'),editor=$('editor');const length=editor?.textContent?.replace(/\u200b/g,'').length||0;el.hidden=length<1200;editor?.classList.toggle('empty-editor',length===0);}
function saveCaret(){const root=$('editor'),sel=window.getSelection();if(root&&sel?.rangeCount&&root.contains(sel.anchorNode))savedCaret=sel.getRangeAt(0).cloneRange();}
document.addEventListener('selectionchange',saveCaret);
function placeCaret(node,position){const range=document.createRange(),sel=window.getSelection();range.setStart(node,position);range.collapse(true);sel.removeAllRanges();sel.addRange(range);saveCaret();}
function choose(type){
 if(busy)return;
 if(type==='TEMPO'){
  if(!timeActive&&current?.timeAvailable!==true)return;
  timeActive=!timeActive;
  // Abrir TEMPO não impõe treino nem escreve uma ação pelo jogador.
  // O rascunho só é preenchido ao tocar numa sugestão.
  renderTime();saveDraft();return;
 }
 const root=$('editor'),previousMode=editorMode;editorMode=type;
 if(!root){renderDrafts();return;}
 const sel=window.getSelection();
 if(savedCaret&&root.contains(savedCaret.startContainer)){sel.removeAllRanges();sel.addRange(savedCaret);}
 let range=sel.rangeCount?sel.getRangeAt(0):null;
 let node=range?.startContainer;
 if(node?.nodeType===3&&node.parentNode===root){
  const previous=document.createElement('span');previous.dataset.kind=previousMode;previous.className=previousMode==='FALAR'?'inline-talk':'inline-narrate';
  const at=range.startOffset;previous.textContent=node.textContent||'\u200b';node.replaceWith(previous);placeCaret(previous.firstChild,Math.min(at,previous.firstChild.length));
  range=sel.getRangeAt(0);node=range.startContainer;
 }
 const el=node?.nodeType===3?node.parentElement:node;
 const span=el?.closest?.('span[data-kind]');
 if(span&&root.contains(span)&&range&&node?.nodeType===3){
  const at=range.startOffset,text=node.textContent||'',left=text.slice(0,at),right=text.slice(at);
  span.textContent=left;
  const next=document.createElement('span');next.dataset.kind=type;next.className=type==='FALAR'?'inline-talk':'inline-narrate';next.textContent='\u200b';
  span.after(next);
  if(right){const later=document.createElement('span');later.dataset.kind=span.dataset.kind;later.className=span.className;later.textContent=right;next.after(later);}
  placeCaret(next.firstChild,1);
 }else{
  const next=document.createElement('span');next.dataset.kind=type;next.className=type==='FALAR'?'inline-talk':'inline-narrate';next.textContent='\u200b';root.appendChild(next);placeCaret(next.firstChild,1);
 }
 root.focus();updateMode();saveDraft();
}
function updateMode(){
 if(timeActive&&current?.timeAvailable!==true){timeActive=false;timeText='';if($('timearea'))$('timearea').hidden=true;}
 $('act').classList.toggle('active',editorMode==='AGIR');
 $('talk').classList.toggle('active',editorMode==='FALAR');
 $('time').classList.toggle('active',timeActive);
 $('time').hidden=!timeActive&&!(current?.timeAvailable===true&&current?.introConfirmed!==false); // Só aparece em janelas seguras para avançar o tempo.
}
$('act').onclick=()=>choose('AGIR');$('talk').onclick=()=>choose('FALAR');$('time').onclick=()=>choose('TEMPO');
['act','talk','time'].forEach(id=>$(id).addEventListener('mousedown',e=>e.preventDefault()));
function renderTime(){
 const el=$('timearea');if(!el)return;
 el.hidden=!timeActive;
 if(!timeActive){updateMode();return;}
 const longMode=current?.timeSuggestionMode==='long',offer=longMode?current?.timeOpportunity:null;
 const limit=current?.timeMaxHours||24,days=Math.floor(limit/24);
 const intervalLabel=limit%8760===0?limit/8760+' ano(s)':limit%720===0?limit/720+' mês(es)':days>0?days+' dia(s)':limit+' hora(s)';
 const choices=Array.isArray(current?.timeChoices)?current.timeChoices.filter(opt=>opt&&Number.isInteger(opt.hours)&&opt.hours>0&&opt.hours<=limit).slice(0,3):[];
 el.innerHTML='<p class="time-preflight">'+(offer?'<strong>'+esc(offer.label)+' · até '+intervalLabel+' por avanço.</strong> ':'Tempo disponível nesta cena: '+intervalLabel+'. ')+'O calendário só avança quando você enviar; acontecimentos importantes podem interrompê-lo.</p>'+
  '<div class="time-suggestions-label">Sugestões para esta cena <small>Toque para preencher a ação</small></div>'+
  '<div class="time-suggestions">'+choices.map((opt,index)=>'<button type="button" data-time-choice="'+index+'" aria-pressed="false">'+esc(opt.label)+'</button>').join('')+'</div>'+
  '<label for="timeactivity">⌛ O QUE ACONTECE DURANTE ESSE TEMPO?</label>'+
  '<textarea id="timeactivity" rows="2" maxlength="2000" placeholder="Escolha uma sugestão acima ou escreva sua própria ação.">'+esc(timeText)+'</textarea>'+
  '<div class="time-inline-controls"><input id="timeamount" aria-label="Quantidade" type="number" min="1" max="3650" value="'+esc(timeAmount)+'"><select id="timeunit" aria-label="Unidade"><option value="1">horas</option><option value="24">dias</option><option value="168">semanas</option><option value="720">meses (30 dias)</option><option value="8760">anos (365 dias)</option></select></div>';
 $('timeunit').value=String(timeUnit);
 const markSelected=()=>el.querySelectorAll('[data-time-choice]').forEach(b=>{
  const opt=choices[Number(b.dataset.timeChoice)];
  const selected=Number(timeAmount)*Number(timeUnit)===opt.hours&&timeText.trim()===String(opt.action||opt.label||'').trim();
  b.setAttribute('aria-pressed',String(selected));
  b.classList.toggle('selected',selected);
 });
 $('timeactivity').oninput=e=>{timeText=e.target.value;markSelected();saveDraft();};
 $('timeamount').oninput=e=>{timeAmount=e.target.value;markSelected();saveDraft();};
 $('timeunit').onchange=e=>{timeUnit=Number(e.target.value);markSelected();saveDraft();};
 el.querySelectorAll('[data-time-choice]').forEach(button=>button.onclick=()=>{
  const opt=choices[Number(button.dataset.timeChoice)];
  if(!opt)return;
  const h=opt.hours;
  timeUnit=h>=8760&&h%8760===0?8760:h>=720&&h%720===0?720:h>=168&&h%168===0?168:h>=24&&h%24===0?24:1;
  timeAmount=h/timeUnit;
  timeText=String(opt.action||opt.label||'').trim().slice(0,2000);
  $('timeamount').value=timeAmount;
  $('timeunit').value=String(timeUnit);
  $('timeactivity').value=timeText;
  markSelected();
  saveDraft();
  $('timeactivity').focus();
 });
 markSelected();
 updateMode();
}
function renderDrafts(){
 $('drafts').innerHTML='<div id="editor" contenteditable="true" role="textbox" aria-label="Escrever narrativa e falas" aria-multiline="true" spellcheck="true" data-placeholder="Escreva aqui; use NARRAR e FALAR para alternar no cursor."></div><div id="timearea" class="time-area" hidden></div>';
 const root=$('editor');
 for(const part of parts){const el=document.createElement('span');el.dataset.kind=part.type==='FALAR'?'FALAR':'AGIR';el.className=part.type==='FALAR'?'inline-talk':'inline-narrate';el.textContent=part.text||'\u200b';root.appendChild(el);}
 root.addEventListener('beforeinput',e=>{if(e.inputType==='insertParagraph'){e.preventDefault();document.execCommand('insertText',false,'\n');}});
 root.addEventListener('paste',e=>{e.preventDefault();const plain=e.clipboardData.getData('text/plain');document.execCommand('insertText',false,plain);});
 root.addEventListener('input',()=>{parts=editorParts();checkReview();saveCaret();saveDraft();});
 root.addEventListener('focus',()=>{if(!root.querySelector('span')){const el=document.createElement('span');el.dataset.kind='AGIR';el.className='inline-narrate';el.textContent='\u200b';root.appendChild(el);}});
 renderTime();checkReview();updateMode();freeze();
}
function newTurnId(){
 if(crypto.randomUUID)return crypto.randomUUID();
 // O Chrome no endereço HTTP da rede local também oferece getRandomValues.
 const bytes=crypto.getRandomValues(new Uint8Array(16));
 bytes[6]=(bytes[6]&15)|64;
 bytes[8]=(bytes[8]&63)|128;
 const hex=Array.from(bytes,n=>n.toString(16).padStart(2,'0')).join('');
 return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
}
async function send(days=null){
 if(busy)return;lastAction='Enviar turno';
 if(!current){notice('Crie e confirme uma ficha primeiro.');return;}
 if(current.introConfirmed===false&&current.messages.length===1){notice('Confirme a introdução antes de começar a jogar.');return;}
 const hours=timeActive?Number(timeAmount)*Number(timeUnit):0;
 if(!Number.isInteger(hours)||hours<0||hours>87600||(timeActive&&hours<1)){notice('Escolha uma duração válida entre 1 hora e 3650 dias.');return;}
 if(timeActive&&hours>(current.timeMaxHours||24)){notice('Nesta cena, o TEMPO permite até '+(current.timeMaxHours||24)+' horas. Escolha uma duração menor.');return;}
 if(timeActive&&!timeText.trim()){notice('Descreva a atividade durante a passagem de tempo.');$('timeactivity')?.focus();return;}
 const segments=editorParts();
 if(timeActive)segments.push({type:'AGIR',text:timeText.trim()});
 if(segments.length>8||segments.some(s=>s.text.length>2000)){notice('Use até oito trechos com no máximo 2000 caracteres cada.');return;}
 if(!segments.length&&!days){notice('Escreva uma ação ou fala para começar.');focusPart();return;}
 const payload={segments,days:0,hours,revision:current.revision},id=current.id;
 const signature=JSON.stringify(payload);
 const delivery=pendingDelivery?.signature===signature?pendingDelivery:{id:newTurnId(),signature};
 payload.requestId=delivery.id;
 saveDraft(delivery);
 await run(async()=>{
  try { current=await api('campaigns/'+id+'/turn',payload); }
  catch(error){
   if(error.code!=='TRANSPORT')throw error;
   const state=await api('campaigns/'+id).catch(()=>null);
   if(!state?.messages.some(m=>m.role==='user'&&m.delivery?.id===delivery.id))throw error;
   current=state;
  }
  pendingDelivery=null;
  parts=[{type:'AGIR',text:''}];timeActive=false;timeText='';timeAmount=1;timeUnit=24;editorMode='AGIR';savedCaret=null;clearDraft(id);render();},true);
}
$('send').onclick=()=>send();
$('regen').onclick=()=>{if(current&&!busy&&current.messages.length>=3&&current.introConfirmed!==false){lastAction='Regenerar última resposta';run(async()=>{current=await api(`campaigns/${current.id}/regenerate`,{revision:current.revision});render();},true);}};
$('copyerror').onclick=async()=>{const data={version:serverVersion||'desconhecida',page:location.pathname,operation:lastAction,issue:$('turnnotice').textContent||$('notice').textContent||'Sem erro recente',engine:$('connection').textContent};try{await navigator.clipboard.writeText(JSON.stringify(data,null,2));notice('Diagnóstico copiado. Compartilhe este texto para facilitar a correção.');}catch{notice('Não foi possível copiar o diagnóstico neste navegador.');}};
$('restorelocal').onclick=()=>{if(busy)return;lastAction='Recuperar backup local';run(async()=>{if(current)throw Error('Encerre a campanha atual antes de restaurar.');const content=await recoverBackup();if(!content)throw Error('Não há backup local neste aparelho. Tente importar um arquivo.');const data=JSON.parse(content);const restored=await api('import',data);await list(restored.id);tab('story');notice('Campanha recuperada do backup local.');});};
$('closecampaign').onclick=()=>{if(!current||busy)return;lastAction='Encerrar campanha';run(async()=>{const original={id:current.id,revision:current.revision};const backup=await api('campaigns/'+original.id+'/export');const raw=JSON.stringify(backup);let copied=false;try{await storeBackup(raw);copied=true;}catch{try{if(raw.length<=2500000){localStorage.setItem('shinobi-autobackup',raw);copied=true;}}catch{}}if(!copied&&!window.confirm('Não foi possível salvar um backup local. Antes de continuar, você já exportou o arquivo JSON da campanha?'))return;if(!window.confirm('Encerrar a campanha atual? Ela será apagada do servidor, mas o backup local poderá recuperá-la.'))return;if(window.prompt('Digite ENCERRAR para confirmar a exclusão:')!=='ENCERRAR')return;await api('campaigns/'+original.id+'/close',{revision:original.revision,confirm:'ENCERRAR'});clearDraft(original.id);try{localStorage.removeItem('shinobi-active');}catch{}location.reload();});};
$('restorebackup').onclick=()=>{if(!busy)$('backupfile').click();};
$('backupfile').onchange=e=>{const file=e.target.files?.[0];if(!file)return;lastAction='Restaurar campanha';run(async()=>{if(file.size>4000000)throw Error('O backup é grande demais para importar.');const data=JSON.parse(await file.text());const restored=await api('import',data);await list(restored.id);tab('story');notice('Campanha restaurada neste aparelho. Exporte backups periodicamente para maior segurança.');});e.target.value='';};
$('export').onclick=()=>{if(current&&!busy)window.location.href=`/api/campaigns/${current.id}/export`;else if(!busy)notice('Crie uma campanha para exportar.');};
async function rewindMessage(index){if(!current||busy)return;const shown=current.messages[index-(current.messageOffset||0)];if(!shown||shown.role!=='user')return;const later=current.messages.length+Number(current.messageOffset||0)-index-1;const question=later>1?'Excluir esta mensagem e voltar a narrativa até antes dela? Todas as respostas e turnos posteriores também serão desfeitos.':'Excluir sua última mensagem e a resposta do narrador, voltando ao estado anterior?';if(!window.confirm(question))return;const campaign=current.id,revision=current.revision;await run(async()=>{current=await api('campaigns/'+campaign+'/rewind',{revision,messageIndex:index});render();notice('Narrativa restaurada para antes da mensagem excluída.');});}
function timeUntilEra(days){const years=Math.floor(days/365),months=Math.floor((days%365)/30),rest=(days%365)%30;return [years?years+' ano'+(years!==1?'s':''):'',months?months+' mês'+(months!==1?'es':''):'',!years&&!months?rest+' dia'+(rest!==1?'s':''):''].filter(Boolean).join(' e ');}
function updateEraUI(date){
 const era=date.era;
 $('era-label').textContent=era.name;
 $('era-current').textContent=era.name+' · Ano '+date.year;
 const until=era.next?timeUntilEra(era.next.inDays):'última era prevista';
 $('era-countdown').textContent=era.next?'Próxima: '+era.next.name+' em '+until:'Era atual: Boruto';
 $('era-next').textContent=era.next?'Próxima: '+era.next.name+' em '+until:'Você está na última era planejada.';
 const total=era.next?era.next.start-era.start:1;
 $('era-progress').value=era.next?Math.min(100,Math.round(100*era.elapsedDays/total)):100;
 const item=e=>'<div class="era-item'+(e.active?' era-active':'')+(e.reached?' era-past':' era-future')+'"><b>'+esc(e.name)+'</b><small>'+esc(e.active?'Era atual':e.reached?'Concluída':'A partir do ano '+Math.floor(e.start/365))+'</small></div>';
 $('era-list').innerHTML=date.eras.map(item).join('');
 $('era-timeline').innerHTML='<div class="era-summary"><small>ERA ATUAL</small><strong>'+esc(era.name)+'</strong><span>'+esc(era.next?'Próxima era: '+era.next.name+' em '+until:'Última era planejada')+'</span></div>'+
  '<details class="panel-fold"><summary>Explorar eras <span class="panel-count">'+date.eras.length+'</span></summary><div class="panel-inner">'+
  date.eras.map(e=>'<details class="compact-entry"><summary><span class="compact-entry-title">'+esc(e.name)+'</span><small>'+(e.active?'Era atual':e.reached?'Concluída':'Futura')+' · Ano '+(1+Math.floor(e.start/365))+'</small></summary><div class="compact-entry-body"><p>'+esc(e.reached?e.description:'Os detalhes serão revelados conforme a campanha avançar.')+'</p></div></details>').join('')+
  '</div></details>';
}
const monthNames=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const monthLengths=[31,28,31,30,31,30,31,31,30,31,30,31];
function displayedDay(year,month,day){return (year-1)*365+monthLengths.slice(0,month-1).reduce((a,b)=>a+b,0)+day-1-282;}
function calendarGo(year,month,{scroll=true,selectedDay=null}={}){
 let yr=Math.trunc(Number(year)||1),mo=Math.trunc(Number(month)||10);
 if(mo<1){yr--;mo=12;}else if(mo>12){yr++;mo=1;}
 yr=Math.max(1,Math.min(100,yr));
 if(yr===1&&mo<10)mo=10;
 calendarCursor={year:yr,month:mo};
 calendarSelected=displayedDay(yr,mo,yr===1&&mo===10?10:1);
 if(Number.isInteger(selectedDay))calendarSelected=selectedDay;
 drawCalendar(scroll);
}
function renderCalendarYears(year){
 const root=$('calyears');if(!root)return;
 if(root.dataset.ready!=='yes'){
  root.innerHTML=Array.from({length:100},(_,i)=>'<button type="button" data-year="'+(i+1)+'" aria-label="Consultar ano '+(i+1)+'">Ano '+(i+1)+'</button>').join('');
  root.querySelectorAll('button').forEach(btn=>btn.onclick=()=>calendarGo(Number(btn.dataset.year),calendarCursor?.month||10));
  root.dataset.ready='yes';
 }
 root.querySelectorAll('button').forEach(btn=>{
  const active=Number(btn.dataset.year)===year;
  btn.classList.toggle('selected',active);
  btn.setAttribute('aria-current',active?'date':'false');
  const todayYear=current?.calendar?.year;
  btn.classList.toggle('year-current',Number(btn.dataset.year)===todayYear);
  btn.title=Number(btn.dataset.year)===todayYear?'Ano atual da campanha':'Consultar ano '+btn.dataset.year;
 });
 const active=root.querySelector('button.selected');
 if(active){
  const left=active.offsetLeft-(root.clientWidth-active.offsetWidth)/2;
  root.scrollTo({left:Math.max(0,left),behavior:'instant'});
 }
}
function renderCalendarMonths(year,month,scroll=true){
 const root=$('calmonths');if(!root)return;
 if(root.dataset.ready!=='yes'){
  root.innerHTML=monthNames.map((name,i)=>'<button type="button" data-month="'+(i+1)+'" aria-label="Consultar '+name+'">'+name+'</button>').join('');
  root.querySelectorAll('button').forEach(btn=>btn.onclick=()=>calendarGo(calendarCursor.year,Number(btn.dataset.month)));
  root.dataset.ready='yes';
 }
 root.querySelectorAll('button').forEach(btn=>{
  const n=Number(btn.dataset.month),active=n===month;
  btn.disabled=year===1&&n<10;
  btn.classList.toggle('selected',active);
  btn.classList.toggle('month-current',year===current?.calendar?.year&&n===current?.calendar?.month);
  btn.setAttribute('aria-current',active?'date':'false');
 });
 if(scroll){
  const active=root.querySelector('button.selected');
  if(active)root.scrollTo({left:Math.max(0,active.offsetLeft-(root.clientWidth-active.offsetWidth)/2),behavior:'instant'});
 }
}
function drawCalendar(repositionYears=true){
 if(!current)return;
 const c=current,date=c.calendar;
 if(!calendarCursor)calendarCursor={year:date.year,month:date.month};
 const {year,month}=calendarCursor;
 $('calmonth').textContent=monthNames[month-1]+' · Ano '+year;
 const home=current.calendar;
 $('calcurrent').textContent=home.day+' de '+monthNames[home.month-1].toLowerCase()+' · Ano '+home.year;
 $('calcurrent-sub').textContent='Hora atual: '+(current.clockTime||'08:00')+' · consultar o calendário não avança a história.';
 const isHomeMonth=year===home.year&&month===home.month;
 $('calbrowsing').hidden=isHomeMonth;
 $('calbrowsing').textContent=isHomeMonth?'':'Você está consultando outra data. A história continua em '+String(home.day).padStart(2,'0')+'/'+String(home.month).padStart(2,'0')+' · Ano '+home.year+'.';
 $('calbrowsing').classList.toggle('away',!isHomeMonth);
 $('calprev').disabled=year===1&&month<=10;
 $('calnext').disabled=year>=100&&month===12;
 if(repositionYears)renderCalendarYears(year);
 renderCalendarMonths(year,month,repositionYears);
 $('calyearprev').disabled=year<=1;
 $('calyearnext').disabled=year>=100;
 const monthEvents=(c.calendarEvents||[]).filter(e=>e.year===year&&e.month===month);
 const monthEras=(c.calendarEraEvents||[]).filter(e=>e.year===year&&e.month===month);
 const days=monthLengths[month-1];
 const first=(displayedDay(year,month,1)+1)%7;
 const headers=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d=>'<span class="cal-weekday">'+d+'</span>').join('');
 const blanks='<span class="cal-blank"></span>'.repeat((first+7)%7);
 const cells=Array.from({length:days},(_,i)=>{
  const n=i+1,absolute=displayedDay(year,month,n);
  const event=monthEvents.some(e=>e.day===n),era=monthEras.some(e=>e.day===n);
  const classes=['cal-cell',absolute<0?'cal-before-start':'',absolute===c.day?'cal-today':'',absolute===calendarSelected?'cal-selected':'',event?'cal-event':'',era?'cal-era':''].filter(Boolean).join(' ');
  return '<button type="button" '+(absolute<0?'disabled ':'')+'class="'+classes+'" data-calendar-day="'+absolute+'" '+(absolute===c.day?'aria-current="date" ':'')+'aria-pressed="'+(absolute===calendarSelected)+'" aria-label="Dia '+n+(absolute===c.day?', data atual de '+esc(c.character?.name||'personagem'):'')+(event?', '+monthEvents.filter(e=>e.day===n).length+' eventos':'')+'"><span class="cal-day-number">'+n+'</span>'+(event||era?'<span class="cal-dot '+(era?'era-dot':'')+'" aria-hidden="true"></span>':'')+'</button>';
 }).join('');
 $('calgrid').innerHTML=headers+blanks+cells;
 $('calgrid').querySelectorAll('[data-calendar-day]').forEach(btn=>btn.onclick=()=>{calendarSelected=Number(btn.dataset.calendarDay);drawCalendar(false);});
 const chosenDay=calendarSelected;
 const dayNumber=Array.from({length:days},(_,index)=>index+1).find(n=>displayedDay(year,month,n)===chosenDay);
 $('calselectedheading').textContent=dayNumber?'Dia '+dayNumber+' de '+monthNames[month-1].toLowerCase()+' · Ano '+year+(chosenDay===c.day?' · Hoje na história':''):'Detalhes do dia selecionado';
 const onDay=(c.calendarEvents||[]).filter(e=>e.dayIndex===calendarSelected);
 const era=(c.calendarEraEvents||[]).find(e=>e.start===calendarSelected);
 const events=onDay.map(e=>({title:e.title,subtitle:e.confirmedDate?'Data documentada':'Data estimada',text:e.overridden||e.detail||''}));
 if(era)events.push({title:'Início da era '+era.name,subtitle:'Marco aproximado',text:'A campanha acompanha a passagem das eras.'});
 $('caldayinfo').innerHTML=events.length?compactRecords(events,e=>e,2):'<p class="empty-compact">Sem eventos registrados neste dia.</p>';
 const horizon=c.day+730,future=(c.calendarEvents||[]).filter(e=>e.dayIndex>=c.day&&e.dayIndex<=horizon);
 $('calupcoming').innerHTML=compactRecords(future,e=>({
  title:e.title,subtitle:String(e.day).padStart(2,'0')+'/'+String(e.month).padStart(2,'0')+' · Ano '+e.year,
  text:e.overridden||e.detail||''
 }),4);
}
$('calprev').onclick=()=>calendarGo(calendarCursor.year,calendarCursor.month-1);
$('calnext').onclick=()=>calendarGo(calendarCursor.year,calendarCursor.month+1);
$('calyearprev').onclick=()=>calendarGo(calendarCursor.year-1,calendarCursor.month);
$('calyearnext').onclick=()=>calendarGo(calendarCursor.year+1,calendarCursor.month);
$('caljumpnow').onclick=()=>{
 if(!current)return;
 const d=current.calendar;calendarGo(d.year,d.month,{selectedDay:current.day});
};
{
 let touchStart=null;
 $('calgrid').addEventListener('touchstart',e=>{const t=e.touches[0];touchStart=t?{x:t.clientX,y:t.clientY}:null;},{passive:true});
 $('calgrid').addEventListener('touchend',e=>{
  if(!touchStart)return;
  const t=e.changedTouches[0];if(!t)return;
  const dx=t.clientX-touchStart.x,dy=t.clientY-touchStart.y;touchStart=null;
  if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.5){const button=$(dx<0?'calnext':'calprev');if(!button.disabled)button.click();}
 },{passive:true});
}

// Conteúdo completo fica disponível ao toque, sem ocupar o espaço da leitura rápida.
function compactRecords(items,toCard,visible=3){
 const list=Array.isArray(items)?items:[];
 if(!list.length)return '<p class="empty-compact">Nenhum registro por enquanto.</p>';
 const card=item=>{
  const d=toCard(item)||{};
  const title=String(d.title||'Registro'),sub=String(d.subtitle||''),description=String(d.text||'');
  const preview=description.length>96?description.slice(0,93).trimEnd()+'…':description;
  return '<details class="compact-entry"><summary><span class="compact-entry-title">'+esc(title)+'</span>'+(sub?'<small>'+esc(sub)+'</small>':'')+(preview?'<span class="compact-entry-preview">'+esc(preview)+'</span>':'')+'</summary><div class="compact-entry-body">'+(description?'<p>'+esc(description)+'</p>':'')+'</div></details>';
 };
 const initial=list.slice(0,visible).map(card).join('');
 const older=list.slice(visible);
 return initial+(older.length?'<details class="compact-more"><summary>Ver mais '+older.length+' registro'+(older.length===1?'':'s')+'</summary><div class="compact-more-content">'+older.map(card).join('')+'</div></details>':'');
}
async function setPersonalGoal(text) {
 if (!current || busy) return;
 const ok = await run(async () => {
  current = await api('campaigns/'+current.id+'/goal', {revision:current.revision, text});
  render();
 });
 if (ok) $('goal-feedback').textContent = text.trim() ? 'Objetivo salvo.' : 'Objetivo retirado.';
}
$('goal-form').onsubmit = event => {
 event.preventDefault();
 void setPersonalGoal($('goal-text').value);
};
$('clear-goal').onclick = () => setPersonalGoal('');

function renderTeam(c) {
 const panel = $('sheet-team'), content = $('team-content'), team = c.team;
 panel.hidden = !team;
 content.replaceChildren();
 if (!team) return;
 if (team.status === 'pending') {
  content.textContent = 'A formação da equipe aguarda confirmação na história.';
  return;
 }
 const add = (role, name) => {
  const row = document.createElement('div'), title = document.createElement('b');
  row.className = 'fact';
  title.textContent = role;
  const value = document.createElement('p');
  value.textContent = name;
  row.append(title, value);
  content.append(row);
 };
 if (team.status === 'disbanded') add('Situação', 'Formação encerrada');
 add('Jōnin responsável', team.leader);
 add('Integrantes', team.members.join(' · '));
 for (const change of team.history.slice(-3)) add('Registro da equipe', change.evidence);
}

function renderCombat(c){
 const status=$('combat-status');
 status.hidden=!c.combat;
 if(!c.combat){status.textContent='';return;}
 const title=document.createElement('strong');
 title.textContent=c.combat.opponent+' · '+c.combat.advantage;
 const detail=document.createElement('span');
 detail.textContent=c.combat.opening?'Guarda exposta nesta troca.':c.combat.pressure;
 const chakra=document.createElement('small');
 chakra.textContent='Chakra: '+c.conditions.chakra;
 status.replaceChildren(title,detail,chakra);
}
function renderDatabook(c){
 $('goal-text').value = c.personalGoal || '';
 $('clear-goal').hidden = !c.personalGoal;
 $('goal-feedback').textContent = '';
 renderTeam(c);
 const data=c.databook||{},container=$('db-graphic'),stats=Array.isArray(data.attributes)?data.attributes:[];
 if(!container||!stats.length)return;
 const toggle=$('db-show-numbers'),numbers=saved('shinobi-databook-numbers','off')==='on';
 toggle.checked=numbers;
 toggle.onchange=()=>{remember('shinobi-databook-numbers',toggle.checked?'on':'off');renderDatabook(current);};
 $('db-name').textContent=c.character?.name||'Personagem';
 $('db-meta').textContent=[c.character?.village||'Sem vila',c.profile?.affiliation||c.character?.affiliation||'Sem graduação',c.age+' anos'].join(' · ');
 const attrs=stats.slice(0,8),center=180,radius=105,cy=173;
 const valid=x=>typeof x.value==='number'&&Number.isFinite(x.value)&&x.value>=.5&&x.value<=5;
 const p=(index,value)=>{
  const angle=-Math.PI/2+index*Math.PI/4;
  return [(center+radius*Math.cos(angle)*value/5).toFixed(1),(cy+radius*Math.sin(angle)*value/5).toFixed(1)];
 };
 const outline=count=>attrs.map((_,i)=>p(i,count).join(',')).join(' ');
 const rings=[1,2,3,4,5].map(k=>'<polygon class="db-grid-ring" points="'+outline(k)+'"></polygon>').join('');
 const axes=attrs.map((_,i)=>'<line class="db-axis" x1="'+center+'" y1="'+cy+'" x2="'+p(i,5)[0]+'" y2="'+p(i,5)[1]+'"></line>').join('');
 const complete=attrs.length===8&&attrs.every(valid);
 const area=complete?'<polygon class="db-data-area" points="'+attrs.map((x,i)=>p(i,x.value).join(',')).join(' ')+'"></polygon>':'';
 const lines=attrs.map((stat,i)=>{
  const next=attrs[(i+1)%8];
  if(!valid(stat)||!valid(next)||(!complete&&i===7))return '';
  const x=p(i,stat.value),y=p((i+1)%8,next.value);
  return '<line class="db-data-line" x1="'+x[0]+'" y1="'+x[1]+'" x2="'+y[0]+'" y2="'+y[1]+'"></line>';
 }).join('');
 const dots=attrs.map((stat,i)=>valid(stat)?'<circle class="db-data-point" cx="'+p(i,stat.value)[0]+'" cy="'+p(i,stat.value)[1]+'" r="4.2"></circle>':'').join('');
 const labels=attrs.map((stat,i)=>{
  const radians=-Math.PI/2+i*Math.PI/4;
  const x=(center+147*Math.cos(radians)).toFixed(1);
  const y=(cy+147*Math.sin(radians)).toFixed(1);
  const detail=valid(stat)?numbers?stat.value.toLocaleString('pt-BR')+' / 5':stat.description:'—';
  const positions=[-3,0,4,0,8,0,4,0];
  return '<g class="db-radar-label" aria-label="'+esc(stat.label+': '+detail)+'"><title>'+esc(stat.label+': '+detail)+'</title><text x="'+x+'" y="'+(Number(y)+positions[i])+'" text-anchor="middle"><tspan x="'+x+'" class="db-radar-name">'+esc(stat.label)+'</tspan><tspan x="'+x+'" dy="15" class="db-radar-grade">'+esc(detail)+'</tspan></text></g>';
 }).join('');
 const attributeEvidence=data.attributeEvidence||{},intelligenceEvidence=data.intelligenceEvidence||{};
 const plain=attrs.map(stat=>stat.label+': '+(valid(stat)?numbers?stat.value+' de 5':stat.description:'não avaliado')+(attributeEvidence[stat.key]?.records?' ('+attributeEvidence[stat.key].records+' práticas comprovadas)':'')).join('; ')+(intelligenceEvidence.sourceCount?' · Inteligência: '+intelligenceEvidence.studyCount+' estudos e '+intelligenceEvidence.tacticCount+' estratégias documentadas.':'');
 container.innerHTML='<svg viewBox="0 0 360 352" role="img" aria-label="'+esc(plain)+'">'+axes+rings+area+lines+dots+'<circle cx="'+center+'" cy="'+cy+'" r="2.4" class="db-center"></circle>'+labels+'</svg>';
 $('db-attributes').textContent=plain;
 const missionRanks=['D','C','B','A','S'],totals=data.missions||{};
 $('db-missions').innerHTML=missionRanks.map(rank=>'<div class="db-mission"><small>RANK</small><strong>'+rank+'</strong><span>'+Math.max(0,Number(totals[rank])||0)+'</span></div>').join('')+(totals.unranked?'<div class="db-mission db-mission-unranked"><small>SEM RANK</small><strong>?</strong><span>'+Math.max(0,Number(totals.unranked)||0)+'</span></div>':'');
 $('db-mission-total').textContent=Object.values(totals).reduce((sum,n)=>sum+(Number(n)||0),0)+' registradas';
 const log=Array.isArray(data.missionLog)?data.missionLog.slice().reverse():[];
 $('db-mission-log').innerHTML=compactRecords(log,entry=>({
  title:entry.rank==='?'?'Missão sem rank':'Missão rank '+entry.rank,
  subtitle:'Dia '+(entry.day??'—'),text:entry.summary
 }),3);
 const history=Array.isArray(data.history)?data.history.slice().reverse():[];
 $('db-history').innerHTML=compactRecords(history,item=>({
  title:'Avaliação atualizada',subtitle:'Ano '+(1+Math.floor(item.day/365))+' · Dia '+item.day,text:item.reason||'Evolução registrada'
 }),3);
}
function render(){const c=current;if(!c)return;renderCombat(c);const stop=$('timestatus');stop.hidden=!c.lastTimeInterruption;stop.textContent=c.lastTimeInterruption?'⏳ O avanço foi interrompido: '+c.lastTimeInterruption.reason:'';updateVillageSymbol(c.character?.village);const date=c.calendar;$('calendar').firstElementChild.textContent=`${String(date.day).padStart(2,'0')}/${String(date.month).padStart(2,'0')} · Ano ${date.year} · ${c.clockTime||'08:00'}`;updateEraUI(date);drawCalendar();$('hero').textContent=c.character.name;$('origin').textContent=`${c.age} anos · ${c.character.village||'Origem livre'}`;$('conditions').innerHTML=`<div class="condition">Energia<b>${esc(c.conditions.energy)}</b></div><div class="condition">Chakra<b>${esc(c.conditions.chakra)}</b></div>${c.chakraActivity?`<p class="chakra-feedback" role="status">${esc(c.chakraActivity)}</p>`:''}`;$('abilities').innerHTML=Object.entries(c.abilities).map(([k,v])=>`<div class="condition">${esc(k)}<b>${esc(v)}</b></div>`).join('');$('chat').innerHTML=c.messages.map((m,localIndex)=>`<article class="bubble ${m.role==='user'?'user':'ai'} ${localIndex>=c.messages.length-2?(m.sceneType==='combat'?'combat-glow':m.sceneType==='time'?'time-glow':''):''} ${m.memoryCandidate?'has-memory':''}"><div class="who">${m.role==='user'?esc(c.character.name):'忍 SHINOBI'}${m.role==='user'&&c.undoableMessages?.includes(localIndex+(c.messageOffset||0))?`<button class="undo-message" data-undo-message="${localIndex+(c.messageOffset||0)}" aria-label="Excluir mensagem e voltar a história" title="Excluir mensagem e voltar a história">✕ Excluir</button>`:''}</div><div class="message-text">${esc(m.role==='user'?m.text.replace(/^AGIR:/gm,'NARRAR:'):m.text)}</div>${m.memoryCandidate?`<div class="memory-proposal"><strong>✦ Memória Marcante: ${esc(m.memoryCandidate.title)}</strong><p>${esc(m.memoryCandidate.description)}</p><button type="button" data-memory-save="${esc(m.memoryCandidate.id)}">Salvar na ficha</button><button type="button" data-memory-dismiss="${esc(m.memoryCandidate.id)}">Ignorar</button></div>`:''}${m.sources?.length?`<div class="sources">Referências: ${m.sources.map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a>`).join('')}</div>`:''}</article>`).join('')+(c.introConfirmed===false&&c.messages.length===1?'<div class="intro-choices"><strong>Introdução personalizada</strong><p>Aceite esta abertura ou gere outra antes de iniciar.</p><button type="button" id="acceptintro">✓ Aceitar abertura</button><button type="button" id="retryintro">↻ Gerar outra introdução</button></div>':'');$('chat').querySelectorAll('[data-undo-message]').forEach(btn=>btn.onclick=()=>rewindMessage(Number(btn.dataset.undoMessage)));$('chat').querySelectorAll('[data-memory-save],[data-memory-dismiss]').forEach(b=>b.onclick=()=>run(async()=>{current=await api('campaigns/'+current.id+'/memory',{revision:current.revision,candidateId:b.dataset.memorySave||b.dataset.memoryDismiss,decision:b.dataset.memorySave?'saved':'dismissed'});render();if(b.dataset.memorySave)await auditCurrentMemories();}));if($('acceptintro'))$('acceptintro').onclick=()=>run(async()=>{current=await api('campaigns/'+current.id+'/intro-confirm',{revision:current.revision});render();});if($('retryintro'))$('retryintro').onclick=()=>run(async()=>{current=await api('campaigns/'+current.id+'/intro',{revision:current.revision});calendarSelected=current.day;render();},true);$('chat').scrollTop=$('chat').scrollHeight;renderDatabook(c);$('sheetcontent').innerHTML=['name','age','village','clan','affiliation','appearance','personality','skills','history'].map(k=>`<div class="fact"><b>${esc(({name:'Nome',age:'Idade inicial',village:'Vila de origem',clan:'Clã',appearance:'Aparência',personality:'Personalidade',skills:'Aptidões',history:'História',affiliation:'Afiliação atual'})[k])}</b><p>${esc(k==='age'?c.character.age:(c.profile?.[k]||c.character[k]||'Não definido'))}</p></div>`).join('');$('jutsus').innerHTML=(c.jutsus||[]).map(j=>`<div class="fact"><b>${esc(j.name)}</b><p>${esc(j.description||'Técnica aprendida')}</p></div>`).join('')||'<p class="caption">Nenhum jutsu aprendido foi registrado ainda.</p>';const bonds=Object.entries(c.relations||{});
 $('relations-count').textContent=String(bonds.length);
 $('relations').innerHTML=compactRecords(bonds,([name,description])=>({title:name,text:description}),4);
 const moments=(c.memories||[]).filter(m=>m.status==='saved'||!m.status).slice().reverse();
 $('memory-count').textContent=String(moments.length);
 $('memorable').innerHTML=compactRecords(moments,m=>({title:m.title||'Momento importante',subtitle:'Ano '+(1+Math.floor((m.day||0)/365)),text:m.description||''}),4);
 const openTasks=(c.pendingTasks||[]).filter(t=>t.status==='open').slice().reverse();
 $('pending-count').textContent=String(openTasks.length);
 $('pendingTasks').innerHTML=compactRecords(openTasks,t=>({title:'Compromisso pendente',text:t.description||''}),3);
 const consequences=(c.consequences||[]).slice().reverse();
 $('consequences-count').textContent=String(consequences.length);
 $('consequences').innerHTML=compactRecords(consequences,t=>({title:t.status==='resolved'?'Resolvida':'Consequência',text:t.description||''}),3);
 const facts=(c.facts||[]).slice().reverse();
 $('facts-count').textContent=String(facts.length);
 $('facts').innerHTML=compactRecords(facts,f=>({title:'Dia '+(f.day??'—'),text:f.text||''}),4);
 const events=(c.timeline||[]).slice().reverse();
 $('events-count').textContent=String(events.length);
 $('events').innerHTML=compactRecords(events,e=>({title:e.title||'Marco',subtitle:'Dia '+(e.day??'—'),text:e.outcome==='referência'?e.detail:e.outcome}),4);
 renderDrafts();freeze();void backupCurrent();}
async function startConnection(){
 $('connection').textContent='Conectando ao servidor…';$('reconnect').hidden=true;
 await run(async()=>{
  let s;
  for(let attempt=0;attempt<3;attempt++){
   try{s=await api('status',undefined,{startup:true});break;}
   catch(error){if(error.code==='AUTH')throw error;if(attempt===2)throw error;$('connection').textContent='Aguardando o servidor iniciar…';await new Promise(resolve=>setTimeout(resolve,1200));}
  }
  serverVersion=s.version;
  $('connection').textContent=s.configured?'● Servidor e Gemini disponíveis':'○ Servidor conectado · Gemini não configurado';
  $('libraryStatus').textContent=s.externalLore?'Consultas externas ativadas para tópicos selecionados.':'Consulta externa desativada pelo servidor; biblioteca interna disponível.';
  await list();if(s.ephemeral)$('storagewarning').hidden=false;
  if(!s.configured)notice('O servidor está funcionando. Falta configurar a chave Gemini na hospedagem para iniciar a narrativa com IA.');
 });
 if($('connection').textContent.includes('Conectando')||$('connection').textContent.includes('Aguardando')){
  $('connection').textContent='● Falha de conexão';$('reconnect').hidden=false;
 }else if($('turnnotice')?.textContent&&$('turnnotice')?.hidden===false){
  $('connection').textContent='● Falha ao carregar';$('reconnect').hidden=false;
 }
}
$('reconnect').onclick=()=>{if(!busy)void startConnection();};
renderDrafts();void startConnection();
