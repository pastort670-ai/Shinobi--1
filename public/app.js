const $=id=>document.getElementById(id);let current=null,busy=false,parts=[{type:'AGIR',text:''}],timeAmount=1,timeUnit=1,calendarCursor=null,calendarSelected=0;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const saved=(key,fallback)=>{try{return localStorage.getItem(key)||fallback;}catch{return fallback;}};
const remember=(key,value)=>{try{localStorage.setItem(key,value);}catch{}};
function theme(value){document.documentElement.dataset.theme=value;remember('shinobi-theme',value);$('lighttheme').classList.toggle('selected',value==='light');$('darktheme').classList.toggle('selected',value==='dark');$('lighttheme').setAttribute('aria-pressed',String(value==='light'));$('darktheme').setAttribute('aria-pressed',String(value==='dark'));document.querySelector('meta[name="theme-color"]').content=value==='dark'?'#101116':'#ffffff';}
theme(saved('shinobi-theme','light')==='dark'?'dark':'light');$('lighttheme').onclick=()=>theme('light');$('darktheme').onclick=()=>theme('dark');
function drawer(open){document.body.classList.toggle('sidebar-open',open);$('menutoggle').setAttribute('aria-expanded',String(open));$('backdrop').hidden=!(open&&matchMedia('(max-width:800px)').matches);}
$('menutoggle').onclick=()=>drawer(!document.body.classList.contains('sidebar-open'));$('closemenu').onclick=() =>drawer(false);$('backdrop').onclick=()=>drawer(false);window.addEventListener('resize',()=>drawer(document.body.classList.contains('sidebar-open')));document.addEventListener('keydown',e=>{if(e.key==='Escape'){drawer(false);$('more').open=false;}});
if(matchMedia('(min-width:1000px)').matches)drawer(true);
function notice(s=''){for(const id of ['notice','turnnotice']){const el=$(id);if(el){el.textContent=s;el.hidden=!s;}}}
async function api(path,body){const r=await fetch('/api/'+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});let data;try{data=await r.json();}catch{throw Error('O servidor demorou ou está reiniciando. Aguarde e tente novamente.');}if(!r.ok)throw Error(data.error||'Falha na comunicação.');return data;}
function freeze(){document.querySelectorAll('button,input,select,textarea').forEach(b=>{if(!b.hasAttribute('data-keep-enabled')&&!['menutoggle','closemenu','backdrop'].includes(b.id))b.disabled=busy;});$('chat').setAttribute('aria-busy',String(busy));}
async function run(fn,narrating=false){if(busy)return false;busy=true;notice();$('processing').hidden=!narrating;$('savehint').textContent=narrating?'Aguarde a resposta para iniciar o próximo turno.':'Ações e falas seguem juntas em um turno.';freeze();let ok=false;try{await fn();ok=true;}catch(e){notice(e.message||'Falha no envio. Seu texto foi mantido.');}finally{busy=false;$('processing').hidden=true;$('savehint').textContent='Ações e falas seguem juntas em um turno.';freeze();}return ok;}
function tab(name){['story','sheet','calendarpage','memory','timeline','library','admin'].forEach(t=>$(t).hidden=t!==name);document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));if(matchMedia('(max-width:800px)').matches)drawer(false);$('more').open=false;}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>tab(b.dataset.tab));
async function list(select){const cs=await api('campaigns');$('campaigns').innerHTML=cs.map(c=>`<option value="${c.id}">${esc(c.title)} · ${esc(c.name)}</option>`).join('');if(cs.length){const id=select||saved('shinobi-active','');$('campaigns').value=cs.some(c=>c.id===id)?id:cs[0].id;await load($('campaigns').value);}else{$('campaigns').innerHTML='<option>Crie sua primeira campanha</option>';current=null;}}
async function load(id){current=await api('campaigns/'+id);remember('shinobi-active',id);parts=[{type:'AGIR',text:''}];calendarCursor=null;calendarSelected=current.day;render();}
$('campaigns').onchange=()=>run(()=>load($('campaigns').value));
function openCreation(){if(busy)return;$('createform').reset();$('creation').showModal();drawer(false);}
$('new').onclick=openCreation;$('start').onclick=openCreation;$('close').onclick=()=>$('creation').close();
$('akira').onclick=()=>{const f=$('createform');const data={title:'Akira · O caminho de Hayama',name:'Akira Hayama',age:6,village:'Konohagakure',clan:'',appearance:'Criança de seis anos; aparência livre para definir antes de confirmar.',personality:'Independente, ambicioso e determinado.',skills:'Grande potencial ninja, treinamento inicial. Ainda sem domínio de técnicas avançadas.',history:'Criança adotada por Hiruzen Sarutobi, o Terceiro Hokage. Cresce sob sua proteção e orientação.'};for(const [k,v]of Object.entries(data))f.elements.namedItem(k).value=v;};
$('createform').onsubmit=e=>{e.preventDefault();const raw=Object.fromEntries(new FormData(e.target));run(async()=>{const c=await api('campaigns',{title:raw.title,character:raw});$('creation').close();await list(c.id);tab('story');});};
function focusPart(index){const input=$('drafts').querySelector(`[data-part="${index}"]`);input?.focus();if(input)input.scrollIntoView({block:'nearest'});}
function choose(type){
 if(busy)return;
 if(type==='TEMPO'){const existing=parts.findIndex(s=>s.type==='TEMPO');if(existing!==-1){renderDrafts();focusPart(existing);return;}}
 const last=parts.at(-1);
 if(!last.text.trim())last.type=type;
 else{if(parts.length>=8){notice('Este turno já tem oito blocos. Envie ou remova um antes de adicionar outro.');return;}parts.push({type,text:''});}
 renderDrafts();focusPart(parts.length-1);
}
$('act').onclick=()=>choose('AGIR');$('talk').onclick=()=>choose('FALAR');$('time').onclick=()=>choose('TEMPO');
function renderDrafts(){
 $('drafts').innerHTML=parts.map((part,i)=>{
  const isTime=part.type==='TEMPO';
  const label=isTime?'◷ TEMPO':part.type==='AGIR'?'✦ AÇÃO':'❝ FALA';
  const placeholder=isTime?'Qual atividade você vai realizar durante esse tempo?':part.type==='AGIR'?'Descreva o que seu personagem faz…':'Escreva o que seu personagem diz…';
  const controls=isTime?`<div class="time-inline"><label for="duration-${i}">DURAÇÃO</label><div class="time-inline-controls"><input id="duration-${i}" data-time-amount type="number" min="1" max="3650" value="${timeAmount}" aria-label="Quantidade de tempo"><select data-time-unit aria-label="Unidade de tempo"><option value="1" ${timeUnit===1?'selected':''}>dias</option><option value="30" ${timeUnit===30?'selected':''}>meses de 30 dias</option><option value="365" ${timeUnit===365?'selected':''}>anos de 365 dias</option></select></div><div class="time-suggestions">${(current?.timeOptions||[]).map(d=>`<button data-days="${d}" type="button">${d} ${d===1?'dia':'dias'}</button>`).join('')}</div><small>Escreva a atividade e toque em Enviar para avançar o tempo.</small></div>`:'';
  return `<div class="draft-block ${isTime?'time-draft':''}"><div class="draft-label"><label for="part-${i}">${label}</label>${parts.length>1?`<button data-remove="${i}" aria-label="Remover bloco ${i+1}">×</button>`:''}</div><textarea id="part-${i}" data-part="${i}" aria-label="${label} ${i+1}" maxlength="2000" rows="1" placeholder="${placeholder}">${esc(part.text)}</textarea>${controls}</div>`;
 }).join('');
 const last=parts.at(-1)?.type;
 $('act').classList.toggle('active',last==='AGIR');
 $('talk').classList.toggle('active',last==='FALAR');
 $('time').classList.toggle('active',last==='TEMPO');
 $('savehint').textContent=parts.some(s=>s.type==='TEMPO')?'O botão Enviar narra a atividade e avança o calendário.':'Ações e falas seguem juntas em um turno.';
 document.querySelectorAll('[data-part]').forEach(el=>{
  el.style.height='auto';el.style.height=Math.min(180,el.scrollHeight)+'px';
  el.addEventListener('input',()=>{if(busy)return;parts[Number(el.dataset.part)].text=el.value;el.style.height='auto';el.style.height=Math.min(180,el.scrollHeight)+'px';});
 });
 document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{if(busy)return;parts.splice(Number(b.dataset.remove),1);if(!parts.length)parts=[{type:'AGIR',text:''}];renderDrafts();});
 const amount=$('drafts').querySelector('[data-time-amount]'),unit=$('drafts').querySelector('[data-time-unit]');
 if(amount)amount.addEventListener('input',()=>{timeAmount=amount.value;});
 if(unit)unit.addEventListener('change',()=>{timeUnit=Number(unit.value);});
 document.querySelectorAll('[data-days]').forEach(b=>b.onclick=()=>{if(busy)return;timeAmount=Number(b.dataset.days);timeUnit=1;if(amount)amount.value=String(timeAmount);if(unit)unit.value='1';});
 freeze();
}
async function send(days=null){
 if(busy)return;
 if(!current){notice('Crie e confirme uma ficha primeiro.');return;}
 const time=parts.find(s=>s.type==='TEMPO');
 if(days===null)days=time?Number(timeAmount)*Number(timeUnit):0;
 if(!Number.isInteger(days)||days<0||days>3650||time&&days<1){notice('Escolha uma duração entre 1 e 3650 dias.');return;}
 if(time&&!time.text.trim()){notice('Descreva qual atividade seu personagem vai realizar durante esse tempo.');focusPart(parts.indexOf(time));return;}
 const segments=parts.filter(s=>s.text.trim()).map(s=>({type:s.type==='TEMPO'?'AGIR':s.type,text:s.text.trim()}));
 if(!segments.length&&!days){notice('Escreva uma ação ou fala para começar.');focusPart(0);return;}
 const payload={segments,days,revision:current.revision},id=current.id;
 await run(async()=>{current=await api(`campaigns/${id}/turn`,payload);parts=[{type:'AGIR',text:''}];timeAmount=1;timeUnit=1;render();},true);
}
$('send').onclick=()=>send();
$('regen').onclick=()=>{if(current&&!busy){$('more').open=false;run(async()=>{current=await api(`campaigns/${current.id}/regenerate`,{revision:current.revision});render();},true);}};
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
function render(){const c=current;if(!c)return;const date=c.calendar;$('calendar').firstElementChild.textContent=`${String(date.day).padStart(2,'0')}/${String(date.month).padStart(2,'0')} · Ano ${date.year}`;updateEraUI(date);drawCalendar();$('hero').textContent=c.character.name;$('origin').textContent=`${c.age} anos · ${c.character.village||'Origem livre'}`;$('conditions').innerHTML=`<div class="condition">Energia<b>${esc(c.conditions.energy)}</b></div><div class="condition">Chakra<b>${esc(c.conditions.chakra)}</b></div>`;$('abilities').innerHTML=Object.entries(c.abilities).map(([k,v])=>`<div class="condition">${esc(k)}<b>${esc(v)}</b></div>`).join('');const growth=c.development||[];$('growthsummary').textContent=growth.length?'Resumo dos avanços e mudanças que o personagem conquistou ao longo da campanha.':'A ficha inicial permanece travada. As conquistas e mudanças passam a ser registradas aqui nos próximos turnos.';$('growth').innerHTML=growth.slice().reverse().map(g=>'<div class="fact growth-item"><small>Dia '+g.day+' · evolução</small><p>'+esc(g.text)+'</p></div>').join('')||c.facts.filter(f=>!/^AGIR:|^FALAR:/.test(f.text)).slice(-6).reverse().map(f=>'<div class="fact"><small>Dia '+f.day+' · fato anterior da jornada</small><p>'+esc(f.text)+'</p></div>').join('')||'<p class="caption">Ainda não há evolução registrada pela narrativa.</p>';$('chat').innerHTML=c.messages.map((m,localIndex)=>`<article class="bubble ${m.role==='user'?'user':'ai'}"><div class="who">${m.role==='user'?esc(c.character.name):'忍 SHINOBI'}${m.role==='user'&&c.undoableMessages?.includes(localIndex+(c.messageOffset||0))?`<button class="undo-message" data-undo-message="${localIndex+(c.messageOffset||0)}" aria-label="Excluir mensagem e voltar a história" title="Excluir mensagem e voltar a história">✕ Excluir</button>`:''}</div><div class="message-text">${esc(m.text)}</div>${m.sources?.length?`<div class="sources">Referências: ${m.sources.map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a>`).join('')}</div>`:''}</article>`).join('');$('chat').querySelectorAll('[data-undo-message]').forEach(btn=>btn.onclick=()=>rewindMessage(Number(btn.dataset.undoMessage)));$('chat').scrollTop=$('chat').scrollHeight;$('sheetcontent').innerHTML=Object.entries(c.character).map(([k,v])=>`<div class="fact"><b>${esc(({name:'Nome',age:'Idade inicial',village:'Vila',clan:'Clã',appearance:'Aparência',personality:'Personalidade',skills:'Aptidões iniciais',history:'História'})[k])}</b><p>${esc(v||'Não definido')}</p></div>`).join('');$('relations').innerHTML=Object.entries(c.relations).map(([k,v])=>`<div class="fact"><b>${esc(k)}</b><p>${esc(v)}</p></div>`).join('')||'<p class="caption">Ainda não há vínculos registrados.</p>';$('facts').innerHTML=c.facts.slice().reverse().map(f=>`<div class="fact"><small>Dia ${f.day}</small><p>${esc(f.text)}</p></div>`).join('')||'<p class="caption">Suas decisões deixarão marcas aqui.</p>';$('events').innerHTML=c.timeline.map(e=>`<div class="fact"><small>Dia ${e.day} · data aproximada</small><h2>${esc(e.title)}</h2><p>${esc(e.outcome==='referência'?e.detail:e.outcome)}</p></div>`).join('');renderDrafts();freeze();}
async function refreshInvites(){const invites=await api('invites');$('invitelist').innerHTML=invites.map(i=>`<div class="chip"><span>${esc(i.label)} · ${i.revoked?'cancelado':new Date(i.expires).toLocaleDateString('pt-BR')}</span>${i.revoked?'':`<button data-revoke="${i.id}">Cancelar acesso</button>`}</div>`).join('');document.querySelectorAll('[data-revoke]').forEach(b=>b.onclick=()=>run(async()=>{const r=await fetch('/api/invites/'+b.dataset.revoke,{method:'DELETE'});if(!r.ok)throw Error('Não foi possível cancelar.');await refreshInvites();}));freeze();}
$('createinvite').onclick=()=>run(async()=>{const i=await api('invites',{label:$('invitelabel').value.trim()});$('invitelink').value=location.origin+'/#invite='+i.token;await refreshInvites();});
renderDrafts();run(async()=>{const s=await api('status');$('connection').textContent=(s.admin?'Administrador · ':'')+(s.configured?'● Gemini conectado':'○ Gemini aguarda configuração');$('libraryStatus').textContent=s.externalLore?'Consultas externas ativadas para tópicos selecionados.':'Consulta externa desativada pelo servidor; biblioteca interna disponível.';await list();if(s.admin){$('adminnav').hidden=false;$('invitepanel').hidden=false;await refreshInvites();}if(s.ephemeral)$('storagewarning').hidden=false;if(!s.configured)notice('O servidor está funcionando. Falta configurar a chave Gemini na hospedagem para iniciar a narrativa com IA.');});
