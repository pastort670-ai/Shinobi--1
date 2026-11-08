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
 {id:'sasukeDeparture',day:13*YEAR-20,title:'Partida de Sasuke',detail:'Sasuke deixa Konoha na história de referência. A campanha pode mudar o resultado; período aproximado.'},
 {id:'return',day:15*YEAR,title:'Retorno de Naruto',detail:'Naruto retorna após treinar com Jiraiya; a ameaça da Akatsuki cresce.'},
 {id:'pain',day:16*YEAR+180,title:'Ataque de Pain a Konoha',detail:'A Akatsuki ameaça Konoha; o confronto com Pain acontece antes da Quarta Guerra. Momento aproximado.'},
 {id:'war',day:17*YEAR,title:'Quarta Guerra Ninja',detail:'Conflito decisivo e começo da reconstrução. Data aproximada.'},
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
 ['história guerra',0,'Konoha foi fundada por Hashirama e Madara; Tobirama foi o Segundo Hokage.']
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
export function retrieveLore(day,query){
 const words=query.toLowerCase().split(/\W+/).filter(x=>x.length>3);
 const topical=library.filter(x=>x.day<=day).map(x=>({...x,score:words.filter(w=>(x.key+' '+x.text).toLowerCase().includes(w)).length})).sort((a,b)=>b.score-a.score).slice(0,5).map(x=>x.text);
 return [...temporalLore(day).slice(0,6),...topical];
}
