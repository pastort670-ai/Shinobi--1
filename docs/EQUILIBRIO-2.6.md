# Shinobi 2.6.0 — evolução indireta, NPCs humanos e Memórias Marcantes

## Problemas que motivaram a revisão
- A ficha avaliava Inteligência retrospectivamente, mas Força, Velocidade, Resistência, Selos de mão, Ninjutsu, Taijutsu e Genjutsu podiam continuar como **Não avaliado** mesmo após prática efetivamente narrada.
- Uma postura excessivamente rigorosa do narrador em combate estava contaminando diálogos, pedidos, relações e reconhecimento de personagens talentosos.
- O motor sugeria Memórias Marcantes para muitas atividades rotineiras ou consequências irrelevantes, causando excesso de registros.

## 1. Avaliação de habilidades a partir de evidências
O novo `src/attribute-evidence.js` consulta os registros **já aceitos** da campanha: narrações, Memórias Marcantes *salvas* e desenvolvimento confirmado. Entende treino físico, corrida, esquiva, condicionamento, exercícios de força, taijutsu, ninjutsu, genjutsu e selos de mão, inclusive treino prolongado narrado ao longo de dias.

Uma prática física sustentada pode oferecer evidências simultâneas de Taijutsu, Resistência e, quando o texto indicar, Força ou Velocidade — **não se concede todos os atributos por qualquer prática genérica**. A progressão depende de quantidade, duração e diversidade das evidências. Uma única atividade prova experiência inicial, não domínio máximo. Não conta intenção isolada do jogador, treino interrompido, tentativa fracassada ou feitos exclusivos de NPCs.

O Databook combina a avaliação retrospectiva com a avaliação já conquistada e sempre preserva a maior nota válida. A ficha mostra quantos registros de prática fundamentam a nota. A consulta retroativa não altera a identidade nem exige reiniciar a campanha. A escala interna é adaptação de RPG, não nota de databook oficial.

## 2. Interações sociais e reconhecimento do talento
O motor `src/social-dynamics.js` fornece ao Gemini relações já estabelecidas, talento excepcional registrado, prática demonstrada, conhecimento disponível ao NPC e tipo de pedido. A instrução prioriza NPCs capazes de orgulho, admiração, surpresa, curiosidade, respeito, humor e cooperação.

**Rigor de combate não deve ser dureza social.** Personagens não passam a rejeitar automaticamente pedidos razoáveis, por mera diferença de idade ou patente. Relações positivas e argumentos sensatos aumentam a chance de ajuda ou negociação, sem transformar os NPCs em servos do jogador. Pessoas que ainda não conhecem o talento não podem adivinhar a ficha privada: precisam testemunhar, conviver ou receber notícia plausível. NPCs mantêm seus objetivos, personalidade e autonomia.

## 3. Seleção de Memórias Marcantes
O novo `src/memory-curation.js` filtra propostas. Treino comum, conversar, voltar ao gabinete, receber proposta ou cumprir burocracia não sugerem memória automaticamente. Marcos como missão concluída, conquista importante, promessa duradoura, aliança ou mudança de vínculo podem ser sugeridos. Há tentativa de evitar memórias redundantes com registros salvos; **as memórias antigas escolhidas pelo usuário não são apagadas**. O usuário continua aprovando ou descartando a sugestão, com apenas uma proposta por turno.

## 4. Aplicação à campanha ativa
A recuperação das avaliações acontece **na leitura da ficha atual**, usando histórico ainda salvo, sem apagar progresso anterior ou recomeçar personagem. Os ajustes de NPC e seleção de memórias se aplicam aos próximos turnos. O sistema não reescreve conversas ou combates antigos.

O Shinobi continua na Render gratuita com possível armazenamento temporário. O navegador possui tentativa de restaurar backup do mesmo aparelho, mas **não é garantia**. Antes de novas atualizações, exportar o JSON da campanha é recomendado.

## Testes e limites
`test/social-progression-2-6.test.js` verifica efeitos indiretos do treino, histórico de vários dias, fonte dos registros, preservação de notas, competência observada, interações sociais, memórias corriqueiras/decisivas e aplicação na mesma campanha. `npm test` e testes de interface móvel são executados automaticamente.

- A avaliação depende de evidências textuais reconhecíveis. Há situações raras ou descrições vagas que podem exigir melhor reconhecimento.
- Relações sociais continuam sendo narradas pelo Gemini: o motor fornece regras e fatos para reduzir dureza artificial, mas o comportamento final precisa ser avaliado na campanha.
- A filtragem das memórias é heurística e pode ser refinada com exemplos reais durante os testes.
