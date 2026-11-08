const $=id=>document.getElementById(id);let current=null,busy=false,parts=[{type:'AGIR',text:''}],timeAmount=1,timeUnit=1,calendarCursor=null,calendarSelected=0,editorMode='AGIR',timeActive=false,timeText='',savedCaret=null,lastAction='inicialização';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const saved=(key,fallback)=>{try{return localStorage.getItem(key)||fallback;}catch{return fallback;}};
const remember=(key,value)=>{try{localStorage.setItem(key,value);}catch{}};
function theme(value){document.documentElement.dataset.theme=value;remember('shinobi-theme',value);$('lighttheme').classList.toggle('selected',value==='light');$('darktheme').classList.toggle('selected',value==='dark');$('lighttheme').setAttribute('aria-pressed',String(value==='light'));$('darktheme').setAttribute('aria-pressed',String(value==='dark'));document.querySelector('meta[name="theme-color"]').content=value==='dark'?'#101116':'#ffffff';}
theme(saved('shinobi-theme','light')==='dark'?'dark':'light');
function fitMobileViewport(){const h=window.visualViewport?.height||window.innerHeight;if(h>200)document.documentElement.style.setProperty('--visible-height',Math.round(h)+'px');}
window.visualViewport?.addEventListener('resize',fitMobileViewport);window.addEventListener('orientationchange',fitMobileViewport);fitMobileViewport();$('lighttheme').onclick=()=>theme('light');$('darktheme').onclick=()=>theme('dark');
function drawer(open){document.body.classList.toggle('sidebar-open',open);$('menutoggle').setAttribute('aria-expanded',String(open));$('backdrop').hidden=!(open&&matchMedia('(max-width:800px)').matches);}
$('menutoggle').onclick=()=>drawer(!document.body.classList.contains('sidebar-open'));$('closemenu').onclick=() =>drawer(false);$('backdrop').onclick=()=>drawer(false);window.addEventListener('resize',()=>drawer(document.body.classList.contains('sidebar-open')));document.addEventListener('keydown',e=>{if(e.key==='Escape'){drawer(false);$('more').open=false;}});
if(matchMedia('(min-width:1000px)').matches)drawer(true);
function notice(s=''){for(const id of ['notice','turnnotice']){const el=$(id);if(el){el.textContent=s;el.hidden=!s;}}}
async function api(path,body){const r=await fetch('/api/'+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});let data;try{data=await r.json();}catch{throw Error('O servidor demorou ou está reiniciando. Aguarde e tente novamente.');}if(!r.ok)throw Error(data.error||'Falha na comunicação.');return data;}
async function backupCurrent(){if(!current?.id)return;const id=current.id,revision=current.revision;try{const r=await fetch('/api/campaigns/'+id+'/export');if(!r.ok)return;const t=await r.text();if(t.length<2500000&&current?.id===id&&current.revision===revision)remember('shinobi-autobackup',t);}catch{}}
function freeze(){if($('editor')){$('editor').contentEditable=busy?'false':'true';$('editor').setAttribute('aria-disabled',String(busy));}document.querySelectorAll('button,input,select,textarea').forEach(b=>{if(!b.hasAttribute('data-keep-enabled')&&!['menutoggle','closemenu','backdrop'].includes(b.id))b.disabled=busy;});$('chat').setAttribute('aria-busy',String(busy));}
async function run(fn,narrating=false){if(busy)return false;busy=true;notice();$('processing').hidden=!narrating;$('savehint').textContent=narrating?'Aguarde a resposta para iniciar o próximo turno.':'Ações e falas seguem juntas em um turno.';freeze();let ok=false;try{await fn();ok=true;}catch(e){notice(e.message||'Falha no envio. Seu texto foi mantido.');}finally{busy=false;$('processing').hidden=true;$('savehint').textContent='Ações e falas seguem juntas em um turno.';freeze();}return ok;}
function tab(name){['story','sheet','calendarpage','memory','timeline','library','admin'].forEach(t=>$(t).hidden=t!==name);document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));if(matchMedia('(max-width:800px)').matches)drawer(false);$('more').open=false;}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>tab(b.dataset.tab));
async function list(select){const cs=await api('campaigns');$('campaigns').innerHTML=cs.map(c=>`<option value="${c.id}">${esc(c.title)} · ${esc(c.name)}</option>`).join('');if(cs.length){const id=select||saved('shinobi-active','');$('campaigns').value=cs.some(c=>c.id===id)?id:cs[0].id;await load($('campaigns').value);}else{$('campaigns').innerHTML='<option>Crie sua primeira campanha</option>';current=null;if(saved('shinobi-autobackup',''))notice('Há um backup neste aparelho. Abra Mais opções → Restaurar backup para recuperar sua campanha.');}}
async function load(id){current=await api('campaigns/'+id);remember('shinobi-active',id);parts=[{type:'AGIR',text:''}];timeActive=false;timeText='';editorMode='AGIR';calendarCursor=null;calendarSelected=current.day;render();}
$('campaigns').onchange=()=>run(()=>load($('campaigns').value));
function openCreation(){if(busy)return;$('createform').reset();$('creation').showModal();drawer(false);}
$('new').onclick=openCreation;$('start').onclick=openCreation;$('close').onclick=()=>$('creation').close();
$('akira').onclick=()=>{const f=$('createform');const data={title:'Akira · O caminho de Sarutobi',name:'Akira Sarutobi',age:2,village:'Konohagakure',clan:'Sarutobi',affiliation:'Civil',appearance:'Olhos e cabelos castanhos.',personality:'Curioso, observador e muito talentoso.',skills:'Grande potencial ninja, mas ainda muito jovem.',history:'Órfão adotado por Hiruzen Sarutobi, o Terceiro Hokage, dois anos mais velho que Naruto.'};for(const [k,v]of Object.entries(data))f.elements.namedItem(k).value=v;};
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
 if(type==='TEMPO'){timeActive=!timeActive;renderTime();return;}
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
 root.focus();updateMode();
}
function updateMode(){
 $('act').classList.toggle('active',editorMode==='AGIR');
 $('talk').classList.toggle('active',editorMode==='FALAR');
 $('time').classList.toggle('active',timeActive);
 $('time').hidden=!timeActive&&!(current?.timeOptions?.length>0);
}
$('act').onclick=()=>choose('AGIR');$('talk').onclick=()=>choose('FALAR');$('time').onclick=()=>choose('TEMPO');
['act','talk','time'].forEach(id=>$(id).addEventListener('mousedown',e=>e.preventDefault()));
function renderTime(){
 const el=$('timearea');if(!el)return;
 el.hidden=!timeActive;
 if(!timeActive){updateMode();return;}
 el.innerHTML='<label for="timeactivity">⌛ ATIVIDADE DURANTE O TEMPO</label><textarea id="timeactivity" rows="2" maxlength="2000" placeholder="O que seu personagem faz durante esse período?">'+esc(timeText)+'</textarea><div class="time-inline-controls"><input id="timeamount" aria-label="Quantidade" type="number" min="1" max="3650" value="'+esc(timeAmount)+'"><select id="timeunit" aria-label="Unidade"><option value="1">dias</option><option value="30">meses (30 dias)</option><option value="365">anos (365 dias)</option></select></div><div class="time-suggestions">'+(current?.timeOptions||[]).map(d=>'<button type="button" data-days="'+d+'">'+d+' dias</button>').join('')+'</div>';
 $('timeunit').value=String(timeUnit);
 $('timeactivity').oninput=e=>{timeText=e.target.value;};
 $('timeamount').oninput=e=>{timeAmount=e.target.value;};
 $('timeunit').onchange=e=>{timeUnit=Number(e.target.value);};
 el.querySelectorAll('[data-days]').forEach(b=>b.onclick=()=>{timeAmount=Number(b.dataset.days);timeUnit=1;$('timeamount').value=timeAmount;$('timeunit').value='1';});
 updateMode();
}
function renderDrafts(){
 $('drafts').innerHTML='<div id="editor" contenteditable="true" role="textbox" aria-label="Escrever narrativa e falas" aria-multiline="true" spellcheck="true" data-placeholder="Escreva aqui; use NARRAR e FALAR para alternar no cursor."></div><div id="timearea" class="time-area" hidden></div>';
 const root=$('editor');
 for(const part of parts){const el=document.createElement('span');el.dataset.kind=part.type==='FALAR'?'FALAR':'AGIR';el.className=part.type==='FALAR'?'inline-talk':'inline-narrate';el.textContent=part.text||'\u200b';root.appendChild(el);}
 root.addEventListener('beforeinput',e=>{if(e.inputType==='insertParagraph'){e.preventDefault();document.execCommand('insertText',false,'\n');}});
 root.addEventListener('paste',e=>{e.preventDefault();const plain=e.clipboardData.getData('text/plain');document.execCommand('insertText',false,plain);});
 root.addEventListener('input',()=>{parts=editorParts();checkReview();saveCaret();});
 root.addEventListener('focus',()=>{if(!root.querySelector('span')){const el=document.createElement('span');el.dataset.kind='AGIR';el.className='inline-narrate';el.textContent='\u200b';root.appendChild(el);}});
 renderTime();checkReview();updateMode();freeze();
}
async function send(days=null){
 if(busy)return;lastAction='Enviar turno';
 if(!current){notice('Crie e confirme uma ficha primeiro.');return;}
 if(current.introConfirmed===false&&current.messages.length===1){notice('Confirme a introdução antes de começar a jogar.');return;}
 if(days===null)days=timeActive?Number(timeAmount)*Number(timeUnit):0;
 if(!Number.isInteger(days)||days<0||days>3650||(timeActive&&days<1)){notice('Escolha uma duração entre 1 e 3650 dias.');return;}
 if(timeActive&&!timeText.trim()){notice('Descreva a atividade durante a passagem de tempo.');$('timeactivity')?.focus();return;}
 const segments=editorParts();
 if(timeActive)segments.push({type:'AGIR',text:timeText.trim()});
 if(segments.length>8||segments.some(s=>s.text.length>2000)){notice('Use até oito trechos com no máximo 2000 caracteres cada.');return;}
 if(!segments.length&&!days){notice('Escreva uma ação ou fala para começar.');focusPart();return;}
 const payload={segments,days,revision:current.revision},id=current.id;
 await run(async()=>{current=await api('campaigns/'+id+'/turn',payload);parts=[{type:'AGIR',text:''}];timeActive=false;timeText='';timeAmount=1;timeUnit=1;editorMode='AGIR';savedCaret=null;render();},true);
}
$('send').onclick=()=>send();
$('regen').onclick=()=>{if(current&&!busy){lastAction='Regenerar resposta';$('more').open=false;run(async()=>{current=await api(`campaigns/${current.id}/regenerate`,{revision:current.revision});render();},true);}};
$('copyerror').onclick=async()=>{const data={version:'1.2.1',page:location.pathname,operation:lastAction,issue:$('turnnotice').textContent||$('notice').textContent||'Sem erro recente',engine:$('connection').textContent};try{await navigator.clipboard.writeText(JSON.stringify(data,null,2));notice('Diagnóstico copiado. Compartilhe este texto para facilitar a correção.');}catch{notice('Não foi possível copiar o diagnóstico neste navegador.');}};
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
 $('era-timeline').innerHTML='<div class="era-overview"><strong>'+esc(era.name)+'</strong><p>'+esc(era.description)+'</p><p>'+esc(era.next?'Faltam '+until+' para '+era.next.name+'.':'Última era planejada.')+'</p></div>'+date.eras.map(e=>'<div class="era-timeline-item'+(e.active?' era-active':'')+'"><b>'+esc(e.name)+'</b><small>Início aproximado: '+Math.floor(e.start/365)+' anos após o nascimento de Naruto</small><p>'+esc(e.description)+'</p></div>').join('');
}
const monthNames=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const monthLengths=[31,28,31,30,31,30,31,31,30,31,30,31];
function displayedDay(year,month,day){return (year-1)*365+monthLengths.slice(0,month-1).reduce((a,b)=>a+b,0)+day-1-282;}
function drawCalendar(){
 if(!current)return;
 const c=current,date=c.calendar;
 if(!calendarCursor)calendarCursor={year:date.year,month:date.month};
 const {year,month}=calendarCursor;
 $('calmonth').textContent=monthNames[month-1]+' · Ano '+year;
 $('calprev').disabled=year===1&&month<=10;
 $('calnext').disabled=year>=100;
 const monthEvents=(c.calendarEvents||[]).filter(e=>e.year===year&&e.month===month);
 const monthEras=(c.calendarEraEvents||[]).filter(e=>e.year===year&&e.month===month);
 const days=monthLengths[month-1];
 const first=(displayedDay(year,month,1)+1)%7;
 const headers=['D','S','T','Q','Q','S','S'].map(d=>'<span class="cal-weekday">'+d+'</span>').join('');
 const blanks='<span class="cal-blank"></span>'.repeat((first+7)%7);
 const cells=Array.from({length:days},(_,i)=>{
  const n=i+1,absolute=displayedDay(year,month,n);
  const event=monthEvents.some(e=>e.day===n),era=monthEras.some(e=>e.day===n);
  const classes=['cal-cell',absolute<0?'cal-before-start':'',absolute===c.day?'cal-today':'',absolute===calendarSelected?'cal-selected':'',event?'cal-event':'',era?'cal-era':''].filter(Boolean).join(' ');
  return '<button type="button" '+(absolute<0?'disabled ':'')+'class="'+classes+'" data-calendar-day="'+absolute+'" aria-label="Dia '+n+(event?', evento previsto':'')+'">'+n+(event?'<span class="cal-marker">●</span>':era?'<span class="cal-marker">◆</span>':'')+'</button>';
 }).join('');
 $('calgrid').innerHTML=headers+blanks+cells;
 $('calgrid').querySelectorAll('[data-calendar-day]').forEach(b=>b.onclick=()=>{calendarSelected=Number(b.dataset.calendarDay);drawCalendar();});
 const onDay=(c.calendarEvents||[]).filter(e=>e.dayIndex===calendarSelected);
 const at=calendarSelected;
 const items=onDay.map(e=>'<div class="fact"><b>'+esc(e.title)+'</b><small>'+esc(e.confirmedDate?'Data documentada na lore':'Data estimada pelo SHINOBI')+'</small><p>'+esc(e.overridden||e.detail)+'</p></div>').join('');
 const era=(c.calendarEraEvents||[]).find(e=>e.start===at);
 const eraInfo=era?'<div class="fact"><b>◆ '+esc(era.name)+'</b><p>Começo aproximado desta era.</p></div>':'';
 $('caldayinfo').innerHTML=items+eraInfo||'<p class="caption">Selecione uma data marcada para ver o acontecimento.</p>';
 const future=(c.calendarEvents||[]).filter(e=>e.dayIndex>=c.day).slice(0,7);
 $('calupcoming').innerHTML=future.map(e=>'<div class="fact"><small>'+String(e.day).padStart(2,'0')+'/'+String(e.month).padStart(2,'0')+' · Ano '+e.year+' · '+(e.confirmedDate?'data confirmada':'aproximada')+' · '+(e.dayIndex===c.day?'Hoje': 'Em '+timeUntilEra(e.dayIndex-c.day))+'</small><b>'+esc(e.title)+'</b><p>'+esc(e.overridden||e.detail)+'</p></div>').join('')||'<p class="caption">Nenhum evento previsto.</p>';
}
$('calprev').onclick=()=>{if(!calendarCursor)return;calendarCursor.month--;if(calendarCursor.month===0){calendarCursor.month=12;calendarCursor.year--;}drawCalendar();};
$('calnext').onclick=()=>{if(!calendarCursor)return;calendarCursor.month++;if(calendarCursor.month===13){calendarCursor.month=1;calendarCursor.year++;}drawCalendar();};
function render(){const c=current;if(!c)return;const date=c.calendar;$('calendar').firstElementChild.textContent=`${String(date.day).padStart(2,'0')}/${String(date.month).padStart(2,'0')} · Ano ${date.year}`;updateEraUI(date);drawCalendar();$('hero').textContent=c.character.name;$('origin').textContent=`${c.age} anos · ${c.character.village||'Origem livre'}`;$('conditions').innerHTML=`<div class="condition">Energia<b>${esc(c.conditions.energy)}</b></div><div class="condition">Chakra<b>${esc(c.conditions.chakra)}</b></div>`;$('abilities').innerHTML=Object.entries(c.abilities).map(([k,v])=>`<div class="condition">${esc(k)}<b>${esc(v)}</b></div>`).join('');$('traits').innerHTML=(c.personalityTraits||[]).slice().reverse().map(t=>'<div class="fact"><b>'+esc(t.name)+'</b><small> · Dia '+t.day+'</small><p>'+esc(t.explanation)+'</p></div>').join('')||'<p class="caption">A personalidade evoluirá conforme escolhas comprovadas.</p>';const growth=c.development||[];$('growthsummary').textContent=growth.length?'Resumo dos avanços e mudanças que o personagem conquistou ao longo da campanha.':'A ficha inicial permanece travada. As conquistas e mudanças passam a ser registradas aqui nos próximos turnos.';$('growth').innerHTML=growth.slice().reverse().map(g=>'<div class="fact growth-item"><small>Dia '+g.day+' · evolução</small><p>'+esc(g.text)+'</p></div>').join('')||c.facts.filter(f=>!/^AGIR:|^FALAR:/.test(f.text)).slice(-6).reverse().map(f=>'<div class="fact"><small>Dia '+f.day+' · fato anterior da jornada</small><p>'+esc(f.text)+'</p></div>').join('')||'<p class="caption">Ainda não há evolução registrada pela narrativa.</p>';$('chat').innerHTML=c.messages.map((m,localIndex)=>`<article class="bubble ${m.role==='user'?'user':'ai'} ${localIndex>=c.messages.length-2?(m.sceneType==='combat'?'combat-glow':m.sceneType==='time'?'time-glow':''):''} ${m.memoryCandidate?'has-memory':''}"><div class="who">${m.role==='user'?esc(c.character.name):'忍 SHINOBI'}${m.role==='user'&&c.undoableMessages?.includes(localIndex+(c.messageOffset||0))?`<button class="undo-message" data-undo-message="${localIndex+(c.messageOffset||0)}" aria-label="Excluir mensagem e voltar a história" title="Excluir mensagem e voltar a história">✕ Excluir</button>`:''}</div><div class="message-text">${esc(m.role==='user'?m.text.replace(/^AGIR:/gm,'NARRAR:'):m.text)}</div>${m.memoryCandidate?`<div class="memory-proposal"><strong>✦ Memória Marcante: ${esc(m.memoryCandidate.title)}</strong><p>${esc(m.memoryCandidate.description)}</p><button type="button" data-memory-save="${esc(m.memoryCandidate.id)}">Salvar na ficha</button><button type="button" data-memory-dismiss="${esc(m.memoryCandidate.id)}">Ignorar</button></div>`:''}${m.sources?.length?`<div class="sources">Referências: ${m.sources.map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a>`).join('')}</div>`:''}</article>`).join('')+(c.introConfirmed===false&&c.messages.length===1?'<div class="intro-choices"><strong>Introdução personalizada</strong><p>Aceite esta abertura ou gere outra antes de iniciar.</p><button type="button" id="acceptintro">✓ Aceitar abertura</button><button type="button" id="retryintro">↻ Gerar outra introdução</button></div>':'');$('chat').querySelectorAll('[data-undo-message]').forEach(btn=>btn.onclick=()=>rewindMessage(Number(btn.dataset.undoMessage)));$('chat').querySelectorAll('[data-memory-save],[data-memory-dismiss]').forEach(b=>b.onclick=()=>run(async()=>{current=await api('campaigns/'+current.id+'/memory',{revision:current.revision,candidateId:b.dataset.memorySave||b.dataset.memoryDismiss,decision:b.dataset.memorySave?'saved':'dismissed'});render();}));if($('acceptintro'))$('acceptintro').onclick=()=>run(async()=>{current=await api('campaigns/'+current.id+'/intro-confirm',{revision:current.revision});render();});if($('retryintro'))$('retryintro').onclick=()=>run(async()=>{current=await api('campaigns/'+current.id+'/intro',{revision:current.revision});calendarSelected=current.day;render();},true);$('chat').scrollTop=$('chat').scrollHeight;$('sheetcontent').innerHTML=Object.entries(c.character).map(([k,v])=>`<div class="fact"><b>${esc(({name:'Nome',age:'Idade quando Naruto nasceu',village:'Vila',clan:'Clã',appearance:'Aparência',personality:'Personalidade',skills:'Aptidões iniciais',history:'História',affiliation:'Afiliação'})[k])}</b><p>${esc(v||'Não definido')}</p></div>`).join('');$('relations').innerHTML=Object.entries(c.relations).map(([k,v])=>`<div class="fact"><b>${esc(k)}</b><p>${esc(v)}</p></div>`).join('')||'<p class="caption">Ainda não há vínculos registrados.</p>';$('memorable').innerHTML=(c.memories||[]).slice().reverse().map(m=>'<div class="fact memory-saved"><small>Ano '+(1+Math.floor(m.day/365))+' · Memória Marcante</small><b>'+esc(m.title)+'</b><p>'+esc(m.description)+'</p></div>').join('')||'<p class="caption">Momentos importantes que você confirmar aparecerão aqui.</p>';$('pendingTasks').innerHTML=(c.pendingTasks||[]).filter(t=>t.status==='open').slice().reverse().map(t=>'<div class="fact"><small>Em andamento</small><p>'+esc(t.description)+'</p></div>').join('')||'<p class="caption">Nenhum compromisso pendente.</p>';$('consequences').innerHTML=(c.consequences||[]).slice().reverse().map(t=>'<div class="fact"><small>'+esc(t.status==='resolved'?'Resolvida':'Em andamento')+'</small><p>'+esc(t.description)+'</p></div>').join('')||'<p class="caption">As consequências das decisões importantes aparecerão aqui.</p>';$('facts').innerHTML=c.facts.slice().reverse().map(f=>`<div class="fact"><small>Dia ${f.day}</small><p>${esc(f.text)}</p></div>`).join('')||'<p class="caption">Suas decisões deixarão marcas aqui.</p>';$('events').innerHTML=c.timeline.map(e=>`<div class="fact"><small>Dia ${e.day} · data aproximada</small><h2>${esc(e.title)}</h2><p>${esc(e.outcome==='referência'?e.detail:e.outcome)}</p></div>`).join('');renderDrafts();freeze();void backupCurrent();}
async function refreshInvites(){const invites=await api('invites');$('invitelist').innerHTML=invites.map(i=>`<div class="chip"><span>${esc(i.label)} · ${i.revoked?'cancelado':new Date(i.expires).toLocaleDateString('pt-BR')}</span>${i.revoked?'':`<button data-revoke="${i.id}">Cancelar acesso</button>`}</div>`).join('');document.querySelectorAll('[data-revoke]').forEach(b=>b.onclick=()=>run(async()=>{const r=await fetch('/api/invites/'+b.dataset.revoke,{method:'DELETE'});if(!r.ok)throw Error('Não foi possível cancelar.');await refreshInvites();}));freeze();}
$('createinvite').onclick=()=>run(async()=>{const i=await api('invites',{label:$('invitelabel').value.trim()});$('invitelink').value=location.origin+'/#invite='+i.token;await refreshInvites();});
renderDrafts();run(async()=>{const s=await api('status');$('connection').textContent=(s.admin?'Administrador · ':'')+(s.configured?'● Gemini conectado':'○ Gemini aguarda configuração');$('libraryStatus').textContent=s.externalLore?'Consultas externas ativadas para tópicos selecionados.':'Consulta externa desativada pelo servidor; biblioteca interna disponível.';await list();if(s.admin){$('adminnav').hidden=false;$('invitepanel').hidden=false;await refreshInvites();}if(s.ephemeral)$('storagewarning').hidden=false;if(!s.configured)notice('O servidor está funcionando. Falta configurar a chave Gemini na hospedagem para iniciar a narrativa com IA.');});
