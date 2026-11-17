// Escala interna aproximada: dia 0 = nascimento de Naruto (10/10), 365 dias por ano.
// Os nomes das eras são convenções do SHINOBI, não uma divisão oficial do cânone.
const YEAR=365;
export const eras=[
 {id:'pre-classico',name:'Pré-clássico',start:0,description:'Do nascimento de Naruto até o início da história clássica.'},
 {id:'classico',name:'Clássico',start:12*YEAR,description:'Formação do Time 7 e acontecimentos da primeira parte.'},
 {id:'pre-shippuden',name:'Pré-Shippuden',start:13*YEAR,description:'Intervalo de preparação e viagem entre as duas partes.'},
 {id:'shippuden',name:'Shippuden',start:15*YEAR,description:'Retorno de Naruto, Akatsuki e a Quarta Guerra.'},
 {id:'pre-boruto',name:'Pré-Boruto',start:17*YEAR,description:'Reconstrução e transformação do mundo shinobi após a guerra.'},
 {id:'boruto',name:'Boruto',start:33*YEAR,description:'Nova geração. Marco aproximado: cerca de dezesseis anos após a guerra.'}
];
export function eraAt(day){const i=Math.max(0,eras.findLastIndex(e=>e.start<=day));const now=eras[i],next=eras[i+1];return {...now,elapsedDays:day-now.start,next:next?{id:next.id,name:next.name,start:next.start,inDays:next.start-day}:null};}
export const events=[
 {id:'kyubi',day:0,title:'Ataque da Kyūbi',detail:'Naruto nasce; Minato e Kushina morrem no ataque. Hiruzen reassume o posto. Iruka perde os pais e ainda é criança.'},
 {id:'hyuga',day:3*YEAR+80,title:'Incidente Hyūga',detail:'Uma tentativa de sequestro de Hinata agrava o conflito entre Konoha e Kumo; Hizashi morre.'},
 {id:'uchiha',day:7*YEAR,title:'Massacre Uchiha',detail:'O clã Uchiha é massacrado; Sasuke sobrevive. Autoria e motivos não são conhecidos publicamente.'},
 {id:'team7',day:12*YEAR+90,title:'Formação do Time 7',detail:'Naruto, Sasuke e Sakura formam o Time 7 sob Kakashi.'},
 {id:'exams',day:12*YEAR+130,title:'Exames Chūnin',detail:'A nova geração participa dos exames em Konoha. Época estimada, não data oficial.'},
 {id:'invasion',day:12*YEAR+180,title:'Invasão de Konoha',detail:'Orochimaru invade Konoha durante os exames; Hiruzen morre, salvo divergência estabelecida.'},
 {id:'tsunade',day:12*YEAR+240,title:'Busca por Tsunade',detail:'Naruto e Jiraiya buscam Tsunade, após os eventos da invasão. Data interna aproximada.'},
 {id:'sasukeDeparture',day:13*YEAR-20,title:'Partida de Sasuke',detail:'Sasuke deixa Konoha durante a noite. No dia seguinte, Tsunade mobiliza Shikamaru e a equipe de recuperação; período aproximado e sujeito às decisões da campanha.'},
 {id:'return',day:15*YEAR,title:'Retorno de Naruto',detail:'Naruto retorna após treinar com Jiraiya; a ameaça da Akatsuki cresce.'},
 {id:'pain',day:16*YEAR+180,title:'Ataque de Pain a Konoha',detail:'A Akatsuki ameaça Konoha; o confronto com Pain acontece antes da Quarta Guerra. Momento aproximado.'},
 {id:'war',day:17*YEAR-2,title:'Quarta Guerra Ninja',detail:'Início das batalhas da Aliança Shinobi, dois dias antes do desfecho da guerra, em 10 de outubro. A posição no ano é referência aproximada do SHINOBI.'},
 {id:'last',day:19*YEAR,title:'Época de The Last',detail:'Cerca de dois anos após a guerra; nova fase pessoal de Naruto. Data aproximada.'},
 {id:'nextgen',day:33*YEAR,title:'Nova geração de Boruto',detail:'Naruto já é adulto e a nova geração está ativa. Aproximadamente dezesseis anos após a guerra.'}
];
const general=[
 'Cada personagem envelhece com o relógio: não antecipar a idade, cargo, parentesco conhecido, treinamento, aparência ou experiência de fases futuras.',
 'Reputação, morte, técnicas, laços e status de um NPC somente podem refletir acontecimentos já ocorridos nesta campanha; conhecimento do leitor não é conhecimento do personagem.',
 'Orochimaru é um dos Sannin, ex-discípulo de Hiruzen; não atribuir a ele cargo de professor da Academia Ninja sem fato específico estabelecido.',
 'Iruka Umino perde os pais no ataque da Kyūbi e ainda é criança no nascimento de Naruto. Ele NÃO é instrutor da Academia no Pré-clássico inicial; sua futura função não deve ser antecipada.',
 'Naruto, Sasuke e Sakura são recém-nascidos ou bebês no início; não fazem missões, falas maduras ou técnicas de sua adolescência.',
 'Hiruzen reassume após o ataque; Minato e Kushina morrem naquela noite, salvo divergência estabelecida.',
 'Kakashi tem aproximadamente 14 anos e Itachi aproximadamente 5 no nascimento de Naruto; considerar aproximações e verificar papel e conhecimentos por etapa.',
 'Uma data imprecisa na obra é uma aproximação do SHINOBI; jamais afirme que a divisão Pré-clássico/Pré-Boruto é oficial.',
 'As mudanças provocadas pelo jogador alteram o rumo da história somente se foram efetivamente estabelecidas; não antecipar spoiler por saber o resultado canônico.'
];
const library=[
 ['vilas',0,'Konoha no País do Fogo; Suna, Kiri, Kumo e Iwa têm lideranças e interesses próprios.'],
 ['clãs',0,'Sarutobi, Uchiha, Hyūga, Nara, Akimichi e Yamanaka têm habilidades e história próprias, não automáticas para qualquer personagem.'],
 ['hiruzen sarutobi',0,'Hiruzen é o Terceiro Hokage, mentor de Jiraiya, Tsunade e Orochimaru, pai de Asuma. Fala como pessoa, não como manual.'],
 ['naruto minato kushina',0,'Naruto nasce no ataque da Kyūbi, quando perde os pais; deve envelhecer junto do calendário.'],
 ['iruka umino academia pais kyubi',0,'Iruka era criança quando perdeu os pais no ataque da Kyūbi. No início NÃO leciona na Academia; a docência pertence à sua vida adulta.'],
 ['kakashi itachi sasuke',0,'No nascimento de Naruto, Kakashi tem por volta de 14 anos, Itachi 5 e Sasuke é bebê.'],
 ['orochimaru sannin',0,'Orochimaru, discípulo de Hiruzen, não é professor da Academia; sua situação e influência precisam ser compatíveis com esta época.'],
 ['organizações',0,'ANBU, Raiz e Akatsuki existem em contextos variados; seus objetivos e segredos mudam no tempo. Não projetar situação futura no passado.'],
 ['chakra técnicas ninjutsu genjutsu taijutsu',0,'Treino é necessário; técnicas avançadas não surgem instantaneamente.'],
 ['hierarquia academia missão',0,'Academia, genin, chūnin, jōnin e Kage indicam papéis que mudam por idade e feitos.'],
 ['história guerra',0,'Konoha foi fundada por Hashirama e Madara; Tobirama foi o Segundo Hokage.'],
 ['academia genin graduação bandana exame',0,'A formação ninja passa por treinamento e avaliação. A graduação a genin depende de conclusão confirmada, não apenas de idade ou desejo. Técnicas já comprovadas na campanha devem integrar o repertório.'],
 ['missões rank d c b a s equipe liderança',0,'As missões shinobi são classificadas por dificuldade e risco; responsabilidade, graduação, supervisão e condições reais influenciam a escolha de tarefas. Não promover o personagem automaticamente.'],
 ['treino prodígio talento habilidades progressão',0,'Talento excepcional pode acelerar a aprendizagem quando acompanhado de esforço demonstrado. Progresso acima da média é possível, mas não elimina prática, limitações ou necessidade de conquistas narradas.'],
 ['bunshin jutsu clones genjutsu',0,'Bunshin no Jutsu cria clones ilusórios, que não possuem corpo físico para agir independentemente. Não confundir com Kage Bunshin. Confirmar que a técnica foi aprendida antes de registrá-la.'],
 ['kage bunshin clones sombras chakra',0,'Kage Bunshin no Jutsu produz clones com substância e divide o chakra do usuário entre eles, exigindo reserva e controle compatíveis. Não atribuir esta técnica ao personagem apenas por conhecer Bunshin.'],
 ['hengen transformação kawarimi substituição',0,'Henge no Jutsu altera a aparência; Kawarimi no Jutsu é uma técnica de substituição. Saber seus nomes não significa que o personagem as domina.'],
 ['asuma sarutobi clã hiruzen',0,'Asuma é filho de Hiruzen. Vínculos de personagens adotados com o clã Sarutobi precisam nascer da história, com idade, convivência e acontecimentos coerentes.'],
 ['sannin jiraiya tsunade orochimaru',0,'Jiraiya, Tsunade e Orochimaru foram discípulos de Hiruzen. Ser filho adotivo de Hiruzen não torna o protagonista automaticamente discípulo dos três.'],
 ['academia naruto iruka professor',12*YEAR,'Durante a etapa clássica, Iruka é professor de Naruto na Academia. Não transportar esse cargo para os anos imediatamente posteriores ao nascimento de Naruto.'],
 ['time 7 kakashi sasuke sakura naruto',12*YEAR,'Na era clássica, o Time 7 reúne Naruto, Sasuke e Sakura sob orientação de Kakashi. Uma campanha divergente pode alterar participações apenas quando a intervenção foi comprovada.'],
 ['akatsuki pain invasão konoha',15*YEAR,'A ameaça da Akatsuki cresce na fase Shippuden; posições e informações de membros devem depender do momento e dos registros efetivos da campanha.']
].map(([key,day,text])=>({key,day,text}));
export function temporalLore(day){
 const era=eraAt(day),age=Math.floor(day/YEAR);
 const facts=[...general,`Era atual: ${era.name}; Naruto tem aproximadamente ${age} anos. O próximo período será ${era.next?.name||'nenhum previsto'}.`];
 if(day<12*YEAR)facts.push('Pré-clássico: Naruto não integra o Time 7; Iruka não é professor dele. Não antecipar eventos ou funções da primeira parte.');
 if(day>=12*YEAR&&day<13*YEAR)facts.push('Clássico: Time 7 e primeiros grandes exames/missões. Iruka atua como professor na época da formação de Naruto.');
 if(day>=13*YEAR&&day<15*YEAR)facts.push('Pré-Shippuden: Naruto viaja e treina com Jiraiya; não descrevê-lo como retornado antes do marco.');
 if(day>=15*YEAR&&day<17*YEAR)facts.push('Shippuden: Naruto regressou, mas as mortes e eventos posteriores dependem do relógio e da campanha.');
 if(day>=17*YEAR&&day<33*YEAR)facts.push('Pré-Boruto: período pós-guerra; Boruto e Sarada ainda devem envelhecer antes de alcançar a idade da nova série.');
 if(day>=33*YEAR)facts.push('Boruto: a nova geração já cresceu; Naruto é adulto e ocupa posição condizente com os marcos estabelecidos.');
 if(day>=12*YEAR+180)facts.push('Hiruzen morreu durante a invasão de Konoha na história de referência; divergências da campanha podem alterar esse fato.');
 return facts;
}
const stopWords=new Set(['para','porque','quando','onde','como','sobre','entre','muito','mais','menos','esse','essa','isto','aquilo','tenho','quero','gostaria','fazer','durante','personagem','minha','meu','nosso','nossa','estou','estava','pode','apenas','agora']);
const normLore=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
const loreWords=s=>[...new Set((normLore(s).match(/[a-z0-9]{3,}/g)||[]).filter(w=>!stopWords.has(w)))];
export function retrieveLore(day,query){
 const words=loreWords(query).slice(0,35);
 const topic=library.filter(x=>x.day<=day).map((x,index)=>{
  const keys=loreWords(x.key),description=loreWords(x.text),keyString=normLore(x.key),descriptionString=normLore(x.text);
  const score=words.reduce((total,w)=>total+(keys.includes(w)?5:description.includes(w)?2:(w.length>4&&keyString.includes(w))?2:(w.length>5&&descriptionString.includes(w))?1:0),0);
  return {text:x.text,score,index};
 }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,5).map(x=>x.text);
 // Os princípios temporais são recuperados separadamente pelo contexto.
 // Nunca preencher o limite com trechos aleatórios de assuntos não solicitados.
 return [...temporalLore(day).slice(0,6),...topic];
}
