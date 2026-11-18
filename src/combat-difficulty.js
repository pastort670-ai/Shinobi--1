// Motor de dificuldade do SHINOBI. Regras de consequência, não de violência real.
// Aplica limites de plausibilidade às vitórias propostas pelo narrador.
const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
const rankOf=x=>{
 const text=norm(x);
 if(/\b(?:hokage|kazekage|raikage|mizukage|tsuchikage|sannin|kage)\b/u.test(text))return 4;
 if(/\b(?:jonin|jounin|anbu)\b/u.test(text))return 3;
 if(/\b(?:chunin|chuunin)\b/u.test(text))return 2;
 if(/\bgenin\b/u.test(text))return 1;
 return 0;
};
const nums={dois:2,duas:2,tres:3,quatro:4,cinco:5,seis:6,sete:7,oito:8,nove:9,dez:10};
const countFrom=text=>{
 const s=norm(text);
 const num='(\\d{1,2}|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez)';
 const people='(?:inimigos|adversarios|oponentes|atacantes|agressores|ninjas|mercenarios|shinobi)';
 for(const regexp of [new RegExp('\\b'+num+'\\s+'+people+'\\b','u'),new RegExp('\\b'+people+'\\s+(?:em\\s+numero\\s+de\\s+)?'+num+'\\b','u')]){
  const m=s.match(regexp);
  if(m){const v=nums[m[1]]||Number(m[1]);if(v>0)return clamp(v,1,20);}
 }
 if(/\b(?:varios|muitos|grupo|multidao|esquadrao|numerosos)\s+(?:de\s+)?(?:inimigos|ninjas|adversarios|atacantes|mercenarios|shinobi)\b/u.test(s))return 3;
 return 0;
};
const enemyRankFrom=text=>{
 const s=norm(text);
 const enemy='(?:inimig[oa]s?|adversari[oa]s?|oponentes?|agressor(?:es)?|atacantes?|ninjas?\\s+(?:hostis|renegados)|mercenari[oa]s?)';
 for(const [label,rank] of [['genin',1],['chunin',2],['jonin',3],['kage',4]]){
  if(new RegExp('\\b'+enemy+'\\b.{0,32}\\b'+label+'\\b|\\b'+label+'\\b.{0,18}\\b'+enemy+'\\b','u').test(s))return rank;
 }
 return 0;
};
const actualFight=/\b(?:ataco|ataca|atacou|luto|luta|lutou|enfrento|enfrenta|enfrentou|combato|combate|combateu|golpeio|golpeia|golpeou|desvio|desvia|desviou|bloqueio|bloqueia|bloqueou|defendo|defende|defendeu|tento acertar|tento atingir|investida|invisto|faco um jutsu|uso um jutsu|executo um jutsu)\b/u;
const training=/\b(?:treino simulado|luta amistosa|sparring|combate de treinamento|treino de combate|simulacao)\b/u;
const planned=/\b(?:vou|pretendo|gostaria|quero|planejo|penso em|estudarei)\b.{0,50}\b(?:lutar|atacar|enfrentar)\b/u;
const victory=/\b(?:derrotou|venc[eê]u|neutralizou|nocauteou|subjugou|rendeu|imobilizou|derrubou|eliminou|venceu|vit[oó]ria|foram derrotados|foram vencidos|foram neutralizados|todos ca[ií]ram|ultimo inimigo caiu|fim do combate|combate terminou)\b/u;
const directVictory=new RegExp('\\b(?:derrotou|venceu|neutralizou|nocauteou|subjugou|imobilizou|derrubou|eliminou)\\b','u');
const tacticalTerms=[
 /\b(?:armadilha|isca|emboscada|atraio|atrair|engano|engana|enganar|distrai|distrair|distracao)\b/u,
 /\b(?:flanco|flanquear|posicionamento|cobertura|altura|terreno|passagem|obstaculo|estreito|corredor|rota|distancia)\b/u,
 /\b(?:separo|separar|isolo|isolar|divido|dividir|um de cada vez|despisto|despistar)\b/u,
 /\b(?:observ\w*|antecip\w*|ponto fraco|fraqueza|padrao|ritmo|analiso|analisar|calculo|calculou)\b/u,
 /\b(?:recuo|recuar|fuga|retirada|defesa|bloqueio|protejo|protege|escudo)\b/u,
 /\b(?:companheiro|equipe|aliado|ajuda|suporte|coorden\w*|sincroni\w*)\b/u
];
function tacticalMerit(c,i){
 const current=(i.segments||[]).map(x=>norm(x.text)).join(' ');
 const recent=(c.messages||[]).filter(x=>x.role==='user').slice(-2).map(x=>norm(x.text)).join(' ');
 const terms=tacticalTerms.filter(re=>re.test(current)).length;
 const prepared=tacticalTerms.filter(re=>re.test(recent)).length;
 const score=Math.min(3,terms+(terms>0&&prepared>=2?1:0));
 return {score,explained:score>=2,summary:score>=2?'Plano com detalhes táticos identificáveis.':'A intenção sozinha não fornece uma estratégia eficaz.'};
}
function enemiesContext(c,i){
 const current=(i.segments||[]).map(s=>s.text).join(' ');
 const history=(c.messages||[]).filter(m=>m.role==='ai').slice(-6).reverse();
 // Preserva a informação estabelecida mais recente sem inventar adversários.
 let count=countFrom(current),enemyRank=enemyRankFrom(current),evidence='';
 for(const scene of history){
  const candidate=norm(scene.text);
  if(count===0){const n=countFrom(candidate);if(n){count=n;evidence=scene.text.slice(0,240);}}
  if(enemyRank===0){const rank=enemyRankFrom(candidate);if(rank)enemyRank=rank;}
  if(count>0&&enemyRank>0)break;
 }
 return {count:count||1,explicitCount:count>0,enemyRank,evidence};
}
export function combatForecast(c,i){
 const action=(i.segments||[]).filter(s=>s.type==='AGIR').map(s=>norm(s.text)).join(' ');
 const prior=(c.messages||[]).filter(m=>m.role==='ai').slice(-3).map(m=>norm(m.text)).join(' ');
 const active=actualFight.test(action)&&!planned.test(action)&&!training.test(action);
 const enemyNearby=/\b(?:inimig|adversari|oponent|atacant|agressor|ninjas?\s+hostil|mercenari|confront|luta|batalha|combate)\w*/u.test(action+' '+prior);
 const opposition=enemiesContext(c,i),rank=rankOf(c.profile?.affiliation||c.character?.affiliation);
 const levels=Object.values(c.progress||{}).filter(Number.isFinite);
 const ability=levels.length?Math.max(...levels):0;
 const skillBoost=ability>=65?1:0;
 const tactic=tacticalMerit(c,i);
 const threat=Math.max(0,opposition.count-(rank+1+skillBoost))+Math.max(0,opposition.enemyRank-rank)*2;
 const score=threat-tactic.score*1.2;
 const tooRisky=rank<=1&&(
  opposition.explicitCount&&opposition.count>=3&&tactic.score<2||
  opposition.enemyRank>=2&&opposition.enemyRank>rank+1||
  score>2.3
 );
 return {
  active:active&&enemyNearby,enemyCount:opposition.count,enemyCountConfirmed:opposition.explicitCount,
  opponentRank:opposition.enemyRank,playerRank:rank,skillBoost,tactics:tactic,
  risk:clamp(Math.round(score*10)/10,0,20),
  blockEasyVictory:active&&enemyNearby&&tooRisky,
  rule:'Inferir dificuldade apenas de fatos comprovados: adversários, patentes, preparação e terreno. Vantagem numérica e patentes altas representam ameaças reais a iniciantes. Um plano concreto melhora as chances, mas não garante êxito. O narrador não deve conceder a vitória automática; derrotas parciais, retiradas e necessidade de ajuda são possíveis. O jogador escolhe suas próprias ações.'
 };
}
const playerVictorious=(text,first)=>{
 const s=norm(text),name=norm(first).split(/\s+/)[0].replace(/[^a-z0-9]/g,'');
 if(!victory.test(s))return false;
 const subject=name&&new RegExp('\\b'+name+'\\b.{0,85}\\b(?:derrotou|venceu|neutralizou|nocauteou|subjugou|imobilizou|derrubou|eliminou|conseguiu vencer)\\b','u');
 if(subject?.test(s))return true;
 const passive=/\b(?:todos os|os|seus)\s+(?:inimigos|adversarios|oponentes)\b.{0,45}\b(?:foram derrotados|foram neutralizados|cairam|se renderam)\b/u;
 const completion=/\b(?:a batalha|o confronto|o combate)\b.{0,40}\b(?:terminou|acabou|foi vencido)\b/u;
 return passive.test(s)||completion.test(s);
};
export function enforceCombatOutcome(c,i,r){
 const forecast=combatForecast(c,i);
 if(!forecast.active)return {...r,combatForecast:forecast};
 const veto=forecast.blockEasyVictory&&playerVictorious(r.narrative,c.character?.name);
 if(veto){
  const name=String(c.character?.name||'O protagonista').split(/\s+/)[0];
  const penalty=clamp(6+forecast.enemyCount*2+(forecast.opponentRank>forecast.playerRank?3:0),6,16);
  return {
   ...r,
   narrative:'A investida de '+name+' não encerra o confronto. A vantagem numérica ou a diferença de experiência dos adversários impede uma vitória imediata. O grupo inimigo mantém a pressão, e '+name+' precisa encontrar uma abertura, recuar para se proteger ou contar com apoio antes de conseguir superar a ameaça.',
   sceneType:'combat',energyDelta:Math.min(Number.isInteger(r.energyDelta)?r.energyDelta:0,-penalty),
   facts:[],development:[],moment:null,consequences:[],learnedJutsus:[],profileUpdates:[],missionCompletion:null,databookUpdates:[],
   pendingTasks:(r.pendingTasks||[]).filter(t=>t.status!=='done'),divergences:[],training:null,
   combatForecast:forecast,combatVetoed:true
  };
 }
 // Pressão real de múltiplos adversários mesmo quando não há vitória indevida.
 const tiring=forecast.risk>=1.3&&forecast.tactics.score<2;
 const expected=tiring?-clamp(4+Math.ceil(forecast.risk),4,12):0;
 return {...r,sceneType:r.sceneType==='combat'||forecast.active?'combat':r.sceneType,
  energyDelta:tiring?Math.min(Number.isInteger(r.energyDelta)?r.energyDelta:0,expected):r.energyDelta,
  combatForecast:forecast,combatVetoed:false};
}
