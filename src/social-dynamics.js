import {hasExceptionalTalent} from './progression.js';
import {assessAttributeEvidence} from './attribute-evidence.js';
import {assessHistoricalIntelligence} from './intelligence-evidence.js';

// A atitude de um NPC não depende apenas da patente do protagonista.
// Relações, prestígio demonstrado e metas individuais importam.
// Só fatos testemunhados/noticiados podem ser conhecidos pelos NPCs.
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const evidenceList=c=>[
 ...(c.memories||[]).filter(m=>m?.status==='saved').slice(-25).map(m=>m.description||''),
 ...(c.messages||[]).filter(m=>m?.role==='ai').slice(-25).map(m=>m.text||''),
 ...(c.development||[]).slice(-20).map(m=>m.text||'')
];
export function buildSocialDynamics(c,i){
 const input=(i.segments||[]).map(s=>s.text).join(' ');
 const words=norm(input);
 const experience=assessAttributeEvidence(c),intelligence=assessHistoricalIntelligence(c);
 const traits=[...Object.values(experience).map(x=>x.records),intelligence.sourceCount];
 const demonstrations=traits.reduce((sum,count)=>sum+count,0);
 const exceptional=hasExceptionalTalent(c);
 const mentioned=new Set([...Object.keys(c.relations||{}),...Object.keys(c.npcKnowledge||{}),...Object.keys(c.npcAgents||{})]);
 for(const name of ['Hiruzen','Asuma','Kakashi','Iruka','Jiraiya','Tsunade','Orochimaru'])if(new RegExp('\\b'+name+'\\b','i').test(input))mentioned.add(name);
 const people=[...mentioned].filter(name=>norm(input).includes(norm(name))).slice(0,6).map(name=>{
  const relation=c.relations?.[name]||c.npcAgents?.[name]?.relationship||'';
  const witnessed=[...(c.npcKnowledge?.[name]||[]),...(c.npcAgents?.[name]?.knowledge||[])].slice(-6);
  const hasPositive=/\b(?:afeto|mentor|filho|familia|pai|amizade|amigo|confia|confianca|respeita|admira|orgulho|aliado|protegido)\b/u.test(norm(relation));
  const hasNegative=/\b(?:inimigo|odio|hostil|despreza|traiu|desconfia)\b/u.test(norm(relation));
  return {name,relation,hasPositive,hasNegative,witnessedFacts:witnessed.map(s=>String(s).slice(0,160)),
   principle:hasPositive?'Relação positiva: NPC costuma cooperar ou explicar seus limites, não rejeitar sem motivo.':hasNegative?'Relação problemática: há resistência justificada, mas feitos reais ainda podem impressionar.':'Atitude inicial neutra ou aberta; não tratar o jogador com arrogância automática.'};
 });
 const now=norm((i.segments||[]).map(x=>x.text).join(' '));
 const isRequest=/\b(?:pe[cç]o|pedir|solicito|solicita|convencer|conven[cç]o|proponho|proposta|poderia|permita|deixe|autorize|ensine|treine|ajude|preciso|gostaria)\b/iu.test(now);
 const includesReason=/\b(?:porque|pois|para que|em troca|beneficio|motivo|razao|necessario|seguro|compromisso|prova|demonstro|mostro)\b/iu.test(now);
 const profile=norm([c.character?.skills,c.character?.history].join(' '));
 const backgroundTalent=exceptional&&/\b(?:prodigio|genio|talento excepcional|aptidao extraordinaria)\b/u.test(profile);
 return {
  version:1,
  talentConfirmed:exceptional,
  talentByBackstory:backgroundTalent,
  documentedPractice:demonstrations,
  trainingSpecialties:Object.entries(experience).filter(([,v])=>v.records>0).map(([name,v])=>({name,records:v.records})).slice(0,7),
  namedNPCs:people,request:{isRequest,explained:isRequest&&includesReason},
  instructions:'Rigor em combate NÃO significa dureza social. NPCs devem ser humanos, curiosos, capazes de surpresa, admiração, humor e mudança de opinião. Um jovem prodígio pode ser respeitado ou tratado com cuidado pela idade, mas nunca sistematicamente menosprezado só por ser jovem. Talento de origem é real, embora NPCs que não o conhecem só percebam após testemunhar ou receber notícia plausível. Diálogo e persuasão não são testes impossíveis: pedidos razoáveis, argumentos sólidos e relações positivas recebem acolhimento, negociação ou contrapropostas. Pedidos arriscados, secretos ou contrários a objetivos podem ser recusados com motivo específico, nunca por barreira genérica de autoridade. Reconheça conquistas e progresso observáveis com reações variadas, não elogios repetitivos nem reverência automática. Os NPCs conservam autonomia e não podem ler a ficha privada do jogador.'
 };
}
