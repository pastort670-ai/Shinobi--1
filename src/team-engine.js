// A formação é um fato da campanha. Uma missão pode reunir outros participantes.
const rosters = {
  Konohagakure: ['Aoi Morita', 'Ren Takeda', 'Mizuki Arata'],
  Sunagakure: ['Sora Kazane', 'Riku Sado', 'Maki Hoshina'],
  Kirigakure: ['Nami Kurose', 'Haru Minato', 'Shin Aoba'],
  Kumogakure: ['Rai Kanda', 'Yuna Shibata', 'Tetsu Mori'],
  Iwagakure: ['Iwa Morisaki', 'Nao Tsubaki', 'Kenji Sato']
};
const reserve = ['Hana Akiyama', 'Daichi Mori', 'Sayuri Tanaka', 'Yori Tama'];
const fold = text => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
const isName = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 100;
const different = names => names.every(isName) && new Set(names.map(fold)).size === names.length;
export const teamGuidance = 'A formação permanente está em team. Um genin de vila normalmente tem dois colegas e um jōnin responsável. Família e mentores particulares mantêm papéis próprios. Colegas podem discordar, propor soluções e lembrar consequências, mas sua presença depende da cena. Uma força temporária pode ter outro líder e outra composição. Um chūnin pode receber comando de missão. ANBU é uma função e nukenin uma condição. Graduação e aprovação em exames não são automáticas. Com team.status pending, consulte os fatos antigos antes de confirmar a formação. Só em designação permanente formal ou dissolução expressa, use teamUpdate com citação literal da narrativa que mencione o protagonista e, para active, os três nomes completos. Use a expressão equipe permanente ou equipe de formação para distinguir a designação.';

export function initialTeam(character) {
  if (character.affiliation !== 'Genin' || character.village === 'Sem vila') return null;
  const names = [...new Set([...(rosters[character.village] || []), ...reserve])];
  const [first, second, leader] = names.filter(name => fold(name) !== fold(character.name));
  return {status:'active', members:[character.name, first, second], leader, village:character.village, assignedDay:0, history:[]};
}

export function validTeam(team, character) {
  return team == null || (
    ['active', 'disbanded'].includes(team.status) && Array.isArray(team.members) &&
    team.members.length === 3 && team.members[0] === character.name &&
    different([...team.members, team.leader]) && typeof team.village === 'string' &&
    team.village.length <= 100 && Number.isSafeInteger(team.assignedDay) && team.assignedDay >= 0 &&
    Array.isArray(team.history) && team.history.length <= 12 &&
    team.history.every(item => item && Number.isSafeInteger(item.day) && item.day >= 0 &&
      typeof item.evidence === 'string' && item.evidence.length <= 550)
  );
}

export function teamOf(c) {
  if (c.team) return c.team;
  const rank = c.profile?.affiliation || c.character.affiliation;
  if (rank === 'Genin' && c.character.village !== 'Sem vila') return {status:'pending'};
  return null;
}

export function readTeamUpdate(change) {
  if (!change || !['active','disbanded'].includes(change.status)) return null;
  if (typeof change.evidence !== 'string' || change.evidence.trim().length < 20 || change.evidence.length > 550) return null;
  const update = {status:change.status, evidence:change.evidence.trim()};
  if (change.status === 'disbanded') return update;
  if (!Array.isArray(change.peers) || change.peers.length !== 2 || !different([...change.peers, change.leader])) return null;
  return {...update, peers:change.peers.map(name => name.trim()), leader:change.leader.trim()};
}

export function commitTeam(c, result) {
  const update = result.teamUpdate;
  if (!update || !result.narrative.includes(update.evidence)) return;
  const evidence = fold(update.evidence);
  const hero = fold(c.character.name).split(/\s+/)[0];
  const words = evidence.match(/[\p{L}\p{N}'-]+/gu) || [];
  if (!words.includes(hero) || !/equipe (permanente|de formacao)/.test(evidence)) return;
  if (/\b(se|talvez|poderia|pode|pretende|nao|quando|ainda|seria|sera)\b/.test(evidence)) return;
  const current = c.team;
  if (update.status === 'disbanded') {
    if (current?.status !== 'active' || !/\b(dissolveu|dissolvida|desfeita|desfez)\b/.test(evidence)) return;
    c.team = {...current, status:'disbanded'};
  } else {
    const rank = c.profile?.affiliation || c.character.affiliation;
    const members = [c.character.name, ...update.peers];
    if (rank !== 'Genin' || !different([...members,update.leader])) return;
    if (!/\b(designou|designada|designado|nomeou|confirmou|oficializou|formou)\b/.test(evidence)) return;
    if (![...update.peers, update.leader].every(n => evidence.includes(fold(n)))) return;
    if (current?.status === 'active' && current.leader === update.leader && update.peers.every(n => current.members.includes(n))) return;
    c.team = {status:'active', members, leader:update.leader, village:c.character.village, assignedDay:c.day};
  }
  c.team.history = [...(current?.history || []).slice(-11), {day:c.day, evidence:update.evidence}];
}
