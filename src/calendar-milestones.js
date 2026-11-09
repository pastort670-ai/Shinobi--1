// Eventos narrativos da obra de referência, com datas internas apenas aproximadas.
// Visíveis no calendário, mas NÃO utilizados para forçar acontecimentos na IA.
const YEAR=365;
export const calendarMilestones=[
  {
    "id": "milestone-konoha-rebuild",
    "day": 15,
    "title": "Reconstrução após o ataque da Kyūbi",
    "detail": "Konoha reorganiza a vila após o ataque; período aproximado.",
    "confirmedDate": false,
    "category": "history",
    "approximate": true
  },
  {
    "id": "milestone-itachi-anbu",
    "day": 3325,
    "title": "Itachi na ANBU",
    "detail": "Ascensão de Itachi nas forças especiais; ano aproximado no calendário interno.",
    "confirmedDate": false,
    "category": "history",
    "approximate": true
  },
  {
    "id": "milestone-naruto-academy",
    "day": 4095,
    "title": "Naruto na Academia Ninja",
    "detail": "Período escolar e preparação para se tornar ninja; aproximação.",
    "confirmedDate": false,
    "category": "history",
    "approximate": true
  },
  {
    "id": "milestone-graduation",
    "day": 4462,
    "title": "Graduação da turma de Naruto",
    "detail": "Naruto conclui a Academia e se prepara para integrar uma equipe.",
    "confirmedDate": false,
    "category": "history",
    "approximate": true
  },
  {
    "id": "milestone-bell-test",
    "day": 4475,
    "title": "Teste dos sinos",
    "detail": "Primeira avaliação do Time 7 sob Kakashi, após sua formação.",
    "confirmedDate": false,
    "category": "history",
    "approximate": true
  },
  {
    "id": "milestone-waves",
    "day": 4492,
    "title": "Missão no País das Ondas",
    "detail": "Confronto do Time 7 com Zabuza e Haku; período estimado.",
    "confirmedDate": false,
    "category": "history",
    "approximate": true
  },
  {
    "id": "milestone-forest-death",
    "day": 4528,
    "title": "Floresta da Morte",
    "detail": "Etapa dos Exames Chūnin e acontecimentos ligados a Orochimaru.",
    "confirmedDate": false,
    "category": "history",
    "approximate": true
  },
  {
    "id": "milestone-chunin-finals",
    "day": 4560,
    "title": "Finais dos Exames Chūnin",
    "detail": "Fase final dos Exames Chūnin, durante a qual ocorre a invasão de Konoha; mesma data de referência.",
    "confirmedDate": false,
    "category": "history",
    "approximate": true
  },
  {
    "id": "milestone-gaara",
    "day": 4560,
    "title": "Confronto de Naruto e Gaara",
    "detail": "Confronto de Naruto e Gaara durante a invasão de Konoha; mesma sequência histórica.",
    "confirmedDate": false,
    "category": "history",
    "approximate": true
  },
  {
    "id": "milestone-hokage-fifth",
    "day": 4631,
    "title": "Tsunade como Quinta Hokage",
    "detail": "Período de transição de liderança em Konoha.",
    "confirmedDate": false,
    "category": "history",
    "approximate": true
  },
  {
    "id": "milestone-sasuke-rescue",
    "day": 4726,
    "title": "Missão de recuperação de Sasuke",
    "detail": "Tsunade envia Shikamaru e seu grupo na manhã seguinte à saída de Sasuke; datas internas aproximadas.",
    "confirmedDate": false,
    "category": "history",
    "approximate": true
  },
  {
    "id": "milestone-naruto-journey",
    "day": 4820,
    "title": "Treinamento de Naruto com Jiraiya",
    "detail": "Início do longo período de treinamento fora de Konoha.",
    "confirmedDate": false,
    "category": "history",
    "approximate": true
  },
  {
    "id": "milestone-kazekage-rescue",
    "day": 5501,
    "title": "Resgate do Kazekage",
    "detail": "Naruto e aliados se envolvem no resgate de Gaara após seu sequestro.",
    "confirmedDate": false,
    "category": "history",
    "approximate": true
  },
  {
    "id": "milestone-tenchi-bridge",
    "day": 5569,
    "title": "Missão da Ponte Tenchi",
    "detail": "Tentativa de contato com informações envolvendo Sasuke e Orochimaru.",
    "confirmedDate": false,
    "category": "history",
    "approximate": true
  },
  {
    "id": "milestone-akatsuki-asuma",
    "day": 5674,
    "title": "Hidan, Kakuzu e Asuma",
    "detail": "Conflito de Konoha contra integrantes da Akatsuki; época estimada.",
    "confirmedDate": false,
    "category": "history",
    "approximate": true
  },
  {
    "id": "milestone-sasuke-orochimaru",
    "day": 5730,
    "title": "Sasuke e Orochimaru",
    "detail": "Mudança decisiva na trajetória de Sasuke, segundo a obra de referência.",
    "confirmedDate": false,
    "category": "history",
    "approximate": true
  },
  {
    "id": "milestone-jiraiya-rain",
    "day": 5895,
    "title": "Jiraiya na Vila da Chuva",
    "detail": "Investigação de Jiraiya sobre Pain e a Akatsuki.",
    "confirmedDate": false,
    "category": "history",
    "approximate": true
  },
  {
    "id": "milestone-itachi-sasuke",
    "day": 5953,
    "title": "Confronto entre Sasuke e Itachi",
    "detail": "Batalha que altera a história do clã Uchiha.",
    "confirmedDate": false,
    "category": "history",
    "approximate": true
  },
  {
    "id": "milestone-naruto-sage",
    "day": 5997,
    "title": "Treinamento no Monte Myōboku",
    "detail": "Naruto desenvolve o Modo Sábio antes do confronto com Pain.",
    "confirmedDate": false,
    "category": "history",
    "approximate": true
  },
  {
    "id": "milestone-naruto-pain",
    "day": 6020,
    "title": "Naruto enfrenta Pain",
    "detail": "Naruto enfrenta Pain durante o ataque a Konoha; o confronto integra o mesmo episódio histórico, sem intervalo artificial de semanas.",
    "confirmedDate": false,
    "category": "history",
    "approximate": true
  },
  {
    "id": "milestone-summit",
    "day": 6096,
    "title": "Reunião dos Cinco Kage",
    "detail": "Cúpula das grandes vilas para debater a ameaça crescente.",
    "confirmedDate": false,
    "category": "history",
    "approximate": true
  },
  {
    "id": "milestone-war-declaration",
    "day": 6132,
    "title": "Anúncio da Quarta Guerra Ninja",
    "detail": "As alianças se reorganizam diante do conflito iminente.",
    "confirmedDate": false,
    "category": "history",
    "approximate": true
  },
  {
    "id": "milestone-turtle-island",
    "day": 6170,
    "title": "Treinamento de Naruto na ilha",
    "detail": "Naruto e Killer B se preparam para a guerra.",
    "confirmedDate": false,
    "category": "history",
    "approximate": true
  },
  {
    "id": "milestone-war-battles",
    "day": 6203,
    "title": "Batalhas da Quarta Guerra Ninja",
    "detail": "Aliança Shinobi entra em combate no início da Quarta Guerra; a campanha retrata a guerra em poucos dias, não meses.",
    "confirmedDate": false,
    "category": "history",
    "approximate": true
  },
  {
    "id": "milestone-ten-tails",
    "day": 6204,
    "title": "Dez-Caudas e forças aliadas",
    "detail": "Confrontos envolvendo o Dez-Caudas durante os dias decisivos da Quarta Guerra Ninja.",
    "confirmedDate": false,
    "category": "history",
    "approximate": true
  },
  {
    "id": "milestone-kaguya",
    "day": 6205,
    "title": "Confronto com Kaguya",
    "detail": "Etapa final dos combates da Quarta Guerra Ninja; data interna aproximada, imediatamente anterior ao Vale do Fim.",
    "confirmedDate": false,
    "category": "history",
    "approximate": true
  },
  {
    "id": "milestone-valley-end",
    "day": 6205,
    "title": "Vale do Fim",
    "detail": "Confronto final de Naruto e Sasuke logo após a resolução da guerra; faz parte do mesmo desfecho histórico.",
    "confirmedDate": false,
    "category": "history",
    "approximate": true
  },
  {
    "id": "milestone-peace",
    "day": 6225,
    "title": "Reconstrução do mundo ninja",
    "detail": "Início da reconstrução nas semanas seguintes ao fim da Quarta Guerra Ninja.",
    "confirmedDate": false,
    "category": "history",
    "approximate": true
  },
  {
    "id": "milestone-naruto-hinata-wedding",
    "day": 7360,
    "title": "Casamento de Naruto e Hinata",
    "detail": "Evento da fase pós-guerra; época estimada.",
    "confirmedDate": false,
    "category": "history",
    "approximate": true
  },
  {
    "id": "milestone-hokage-seventh",
    "day": 9925,
    "title": "Naruto como Sétimo Hokage",
    "detail": "Marco de sua carreira adulta; data exata não confirmada.",
    "confirmedDate": false,
    "category": "history",
    "approximate": true
  },
  {
    "id": "milestone-boruto-academy",
    "day": 11940,
    "title": "Nova geração na Academia",
    "detail": "Boruto, Sarada e colegas começam a ocupar o centro da narrativa.",
    "confirmedDate": false,
    "category": "history",
    "approximate": true
  },
  {
    "id": "milestone-boruto-chunin",
    "day": 12135,
    "title": "Exames Chūnin da nova geração",
    "detail": "Competição da geração de Boruto; época estimada.",
    "confirmedDate": false,
    "category": "history",
    "approximate": true
  },
  {
    "id": "milestone-momoshiki",
    "day": 12180,
    "title": "Confronto com Momoshiki",
    "detail": "Ameaça Ōtsutsuki durante a era da nova geração.",
    "confirmedDate": false,
    "category": "history",
    "approximate": true
  },
  {
    "id": "milestone-kara",
    "day": 12445,
    "title": "Conflitos envolvendo a organização Kara",
    "detail": "Novas ameaças atingem as vilas e a família de Naruto.",
    "confirmedDate": false,
    "category": "history",
    "approximate": true
  },
  {
    "id": "milestone-isshiki",
    "day": 12630,
    "title": "Conflito com Isshiki",
    "detail": "Batalhas da nova era envolvendo Isshiki e seus aliados.",
    "confirmedDate": false,
    "category": "history",
    "approximate": true
  },
  {
    "id": "milestone-two-blue-vortex",
    "day": 13170,
    "title": "Período de Two Blue Vortex",
    "detail": "Nova fase da geração de Boruto após passagem de anos.",
    "confirmedDate": false,
    "category": "history",
    "approximate": true
  }
];
