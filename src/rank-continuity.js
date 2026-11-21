import {reconcileProgress} from './progression.js';

const fold=value=>String(value??'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().trim();
const ranks=new Set(['genin','chunin','jonin','jounin','hokage']);
const escape=value=>value.replace(/[.*+?^$${}()|[\]\\]/g,'\\$&');
const academy='(?:a |da |na |pela )?Academia(?: Ninja)?';
const graduationExam='(?:no |pelo |o )?(?:exame|teste|prova) (?:de graduaç[aã]o|final da Academia|para (?:virar |ser |se tornar )?Genin)';
const uncompleted='(?:(?:ainda )?(?:n[aã]o|nem)(?: sequer| chegou a)? (?:(?:terminou|concluiu|completou|finalizou) (?:(?:o curso|os estudos) (?:da|na) )?'+academy+'|se (?:formou|graduou) (?:'+academy+'|como Genin)|(?:passou|foi aprovad[oa]) '+graduationExam+')|(?:ainda )?(?:[eé]s?|continua sendo) (?:s[oó] |apenas )?(?:um |uma )?(?:alun[oa]|estudante) da Academia(?: Ninja)?|ainda (?:est[aá] )?cursa(?:ndo)? (?:a )?Academia(?: Ninja)?)';
const causal='(?:se|j[aá] que|sendo que|porque|pois|visto que)';
const historical=/\b(?:naquela [eé]poca|na [eé]poca em que|antes da (?:sua )?graduaç[aã]o|antes de (?:voc[eê] )?se formar|muitos anos atr[aá]s|flashback)\b/iu;

export const rankPolicy='A patente atual está em protagonistStatus.affiliation. A ficha original descreve o início da campanha. Se protagonistStatus.academyGraduated for verdadeiro, o protagonista já se formou na Academia. Trate essa graduação como fato da campanha em cenas atuais, inclusive na fala de instrutores e em turnos de combate. Ele pode receber instrução ou treinar como ninja graduado. A Academia pode aparecer como local, lembrança ou formação de outros personagens. ';

export function protagonistStatus(c,profile=reconcileProgress(c).profile){
 const affiliation=profile.affiliation||c.character?.affiliation||'';
 return {affiliation,academyGraduated:ranks.has(fold(affiliation))||ranks.has(fold(c.character?.affiliation))};
}

export function correctAcademyClaim(c,status,text){
 if(!status.academyGraduated||typeof text!=='string'||historical.test(text))return text;
 const hero=c.character?.name?.trim()||'';
 const first=hero.split(/\s+/u)[0];
 const named=[hero,first].filter(Boolean).map(escape).join('|');
 const player='(?:voc[eê]|tu|[oa] protagonista'+(named?'|'+named:'')+')';
 const atPlayer='(?<![\\p{L}\\p{N}])('+player+')\\s+';
 const end='(?=$|[^\\p{L}\\p{N}])';
 const explicit=new RegExp(atPlayer+uncompleted+end,'giu');
 const cause=new RegExp('(?:,?\\s+)'+causal+'\\s+(?:'+player+'\\s+)?'+uncompleted+end+'(?=\\s*\\?)','giu');
 return text.replace(cause,'').replace(explicit,(_claim,subject)=>subject+' já concluiu a Academia');
}

export function protectsAcademyGraduation(status,value){
 return status.academyGraduated&&/^(?:(?:alun[oa]|estudante) da )?academia(?: ninja)?$/u.test(fold(value));
}
