// Seleções de origem disponíveis no começo da cronologia. Listas extensíveis.
export const villages=[
 ['Konohagakure','Vila Oculta da Folha'],['Sunagakure','Vila Oculta da Areia'],
 ['Kirigakure','Vila Oculta da Névoa'],['Kumogakure','Vila Oculta da Nuvem'],
 ['Iwagakure','Vila Oculta da Pedra'],['Amegakure','Vila Oculta da Chuva'],
 ['Takigakure','Vila Oculta da Cachoeira'],['Kusagakure','Vila Oculta da Grama'],
 ['Sem vila','Sem vila / viajante']
];
export const clans=[
 'Sem clã','Sarutobi','Uchiha','Hyūga','Nara','Akimichi','Yamanaka',
 'Aburame','Inuzuka','Senju','Uzumaki','Hatake','Hōzuki','Kaguya',
 'Outro clã / origem desconhecida'
];
export const affiliations=['Civil','Academia Ninja','Genin','Chūnin','Jōnin','ANBU','Nukenin','Independente','Sem afiliação'];
export function characterIssues(c){
 const issues=[];
 const age=Number(c.age);
 if(!villages.some(([name])=>name===c.village))issues.push('Selecione uma vila existente na época.');
 if(!clans.includes(c.clan))issues.push('Selecione um clã da lista.');
 if(!affiliations.includes(c.affiliation))issues.push('Selecione uma afiliação.');
 if(['Genin','Chūnin','Jōnin','ANBU'].includes(c.affiliation)&&age<5)issues.push('Afiliação incompatível com a idade inicial.');
 if(c.affiliation==='Academia Ninja'&&age<4)issues.push('A Academia exige idade inicial plausível.');
 if(c.clan==='Uchiha'&&c.village==='Sem vila'&&!/ex[ií]l|fug|viag|fora|refugi/i.test(c.history||''))issues.push('Explique na história como um Uchiha vive fora de sua vila.');
 return issues;
}
