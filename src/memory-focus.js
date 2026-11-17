// Seleção determinística das lembranças mais úteis; não altera fatos canônicos.
const tokens=value=>new Set(String(value||'').toLocaleLowerCase('pt-BR').match(/[\p{L}\p{N}]{4,}/gu)||[]);
const overlap=(a,b)=>{let count=0;for(const t of a)if(b.has(t))count++;return count;};
export function memoryFocus(c,question='',recent=[]){
 const query=tokens(question+' '+recent.map(m=>m.text||'').slice(-4).join(' '));
 const items=[];
 const add=(kind,text,day,extra={})=>{
  if(typeof text!=='string'||!text.trim())return;
  const value=text.slice(0,450),match=overlap(query,tokens(value));
  items.push({kind,text:value,day:Number.isInteger(day)?day:c.day,match,...extra});
 };
 for(const f of (c.facts||[]).slice(-700))add('fact',f.text,f.day);
 for(const m of (c.memories||[]).slice(-100))if(m.status==='saved')add('moment',[m.title,m.description].filter(Boolean).join(' — '),m.day);
 for(const d of (c.development||[]).slice(-160))add('growth',d.text,d.day);
 for(const t of (c.pendingTasks||[]).slice(-100))if(t.status==='open')add('pending',t.description,t.dueDay??t.day??c.day);
 for(const t of (c.consequences||[]).slice(-100))if(t.status==='ongoing')add('consequence',t.description,t.day??c.day);
 for(const [name,description] of Object.entries(c.relations||{}))add('relation',name+' — '+description,c.day);
 for(const j of c.jutsus||[])add('jutsu',j.name+' — '+(j.description||''),j.day??c.day);
 const seen=new Set(),now=c.day;
 const weights={pending:7,consequence:6,moment:6,jutsu:5,relation:3,growth:2,fact:0};
 const ranked=items.map((m,index)=>({...m,index,score:m.match*8+(weights[m.kind]||0)+(m.kind==='moment'&&/gradua|promov|aprend|jutsu|conquist|vit[oó]ria|clonagem/iu.test(m.text)?4:0)+Math.max(0,3-Math.floor(Math.max(0,now-m.day)/365))})).sort((a,b)=>b.score-a.score||b.index-a.index);
 const selected=[];for(const m of ranked){const key=m.kind+':'+m.text.toLocaleLowerCase('pt-BR');if(seen.has(key))continue;selected.push({kind:m.kind,text:m.text,day:m.day});seen.add(key);if(selected.length>=22)break;}
 return selected;
}
