// Calendário interno: 365 dias, início em 10/10 do ano 0. Não é um calendário oficial.
export const events = [
 {id:'kyubi',day:0,title:'Ataque da Kyūbi',detail:'Naruto nasce. Minato e Kushina morrem no ataque; Hiruzen reassume o posto de Hokage.'},
 {id:'hyuga',day:3*365+80,title:'Incidente Hyūga',detail:'Uma tentativa de sequestro de Hinata agrava o conflito entre Konoha e Kumo; Hizashi morre.'},
 {id:'uchiha',day:7*365,title:'Massacre Uchiha',detail:'O clã Uchiha é massacrado; Sasuke sobrevive. A autoria e os motivos não são conhecimento público completo.'},
 {id:'team7',day:12*365+90,title:'Formação do Time 7',detail:'Naruto, Sasuke e Sakura formam o Time 7 sob orientação de Kakashi.'},
 {id:'invasion',day:12*365+180,title:'Invasão de Konoha',detail:'Orochimaru invade Konoha durante os exames. Hiruzen morre; a vila busca um novo Hokage.'},
 {id:'return',day:15*365,title:'Retorno de Naruto',detail:'Naruto retorna após treinar com Jiraiya; a ameaça da Akatsuki cresce.'}
];
export const library = [
 ['vilas',0,'Konoha no País do Fogo, Suna no Vento, Kiri na Água, Kumo no Relâmpago e Iwa na Terra. Cada vila possui sua liderança, alianças e interesses.'],
 ['clãs',0,'Sarutobi: tradição shinobi de Konoha. Uchiha: Sharingan, não automático para qualquer pessoa. Hyūga: Byakugan e Jūken. Nara: técnicas de sombra. Akimichi: expansão corporal. Yamanaka: técnicas mentais.'],
 ['hiruzen sarutobi',0,'Hiruzen é o Terceiro Hokage, professor de Jiraiya, Tsunade e Orochimaru, pai de Asuma. Protetor, experiente e conciliador, carrega responsabilidades e falhas políticas. Fala como uma pessoa, não como um manual.'],
 ['naruto minato kushina',0,'No marco inicial Naruto é recém-nascido; não fala nem luta. Minato e Kushina morrem durante o ataque da Kyūbi, salvo intervenção explícita já estabelecida. Naruto envelhece com o calendário.'],
 ['kakashi itachi sasuke',0,'No nascimento de Naruto, Kakashi tem aproximadamente 14 anos, Itachi 5 e Sasuke é bebê. Não antecipar seus cargos, traumas ou conhecimentos futuros.'],
 ['organizações',0,'ANBU responde à liderança da vila. Raiz é uma estrutura clandestina ligada a Danzō; seus segredos não são conhecimento comum. Akatsuki tem origem em Amegakure, com objetivos que mudam ao longo do tempo.'],
 ['chakra técnicas ninjutsu genjutsu taijutsu',0,'Chakra combina energias física e espiritual. Ninjutsu exige controle e treinamento; genjutsu afeta percepção; taijutsu usa o corpo. Afinidades elementais, selos e limites de linhagem restringem técnicas. Kage Bunshin é exigente; dominar um jutsu não ocorre por mera intenção.'],
 ['hierarquia academia missão',0,'Academia, genin, chūnin, jōnin e Kage representam formação e responsabilidade. ANBU é uma função especializada. Missões vão de D a S. Crianças exigem supervisão; talento não substitui experiência.'],
 ['história guerra',0,'Konoha foi fundada por Hashirama Senju e Madara Uchiha. Tobirama foi o Segundo Hokage. As guerras deixaram rivalidades e perdas. O jogador só conhece o que sua origem, experiência e cena permitem.']
].map(([key,day,text])=>({key,day,text}));
export function retrieveLore(day,query){let words=query.toLowerCase().split(/\W+/).filter(x=>x.length>3);return library.filter(x=>x.day<=day).map(x=>({...x,score:words.filter(w=>(x.key+' '+x.text).toLowerCase().includes(w)).length})).sort((a,b)=>b.score-a.score).slice(0,5).map(x=>x.text);}
