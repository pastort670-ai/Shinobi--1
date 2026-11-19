# SHINOBI 2.9.2 — TEMPO contextual com sugestões e texto editável

## Solicitação
O sistema 2.9.0/2.9.1 implementou grandes períodos de treino, estudos e pesquisas, mas passou a substituir as sugestões antigas do botão **TEMPO** por opções repetitivas de duração. O jogador prefere sugestões variadas da cena, com treino longo aparecendo apenas quando apropriado. Além disso, tocar em uma sugestão deve preencher automaticamente a ação, sem enviá-la.

## Como funciona
**Cena cotidiana com TEMPO disponível:** o motor preserva, em primeiro lugar, as opções `timeChoices` devolvidas pelo Gemini (incluindo nome, duração e um texto de ação opcional). Se não houver opções, aproveita as opções legadas ou apresenta sugestões seguras de espera, descanso e passagem do dia. Essas alternativas não são substituídas por `Treinar por 2 anos` só porque um acordo antigo está guardado no histórico.

**Treino/estudo/projeto longo em foco:** quando um personagem acaba de aceitar a atividade ou o narrador continua falando dela de forma recente, o painel apresenta as opções de semanas, meses ou anos do compromisso válido. O limite real de tempo do contrato permanece intacto (por exemplo, um mês aceito não permite dois anos; o máximo de treino por salto continua sendo dois anos).

**Ao selecionar uma sugestão:** o botão preenche a duração e o campo **O que acontece durante esse tempo?** com um rascunho em primeira pessoa (campo opcional `timeChoices[].action`, quando fornecido pelo narrador). Sem esse campo, o título da sugestão é usado como rascunho compatível com campanhas anteriores. O jogador pode editar antes de enviar, e os dados ficam salvos no rascunho local por campanha.

**Sem avanço automático:** selecionar não envia requisição ao servidor, não muda a data e não assume decisões. O avanço só acontece com **Enviar**. O botão TEMPO continua disponível apenas nas janelas válidas, e interrupções canônicas e compromissos datados permanecem.

## Implementação
- `src/time-engine.js`: nova função `focusedTimeOpportunity`; diferencia contexto atual de compromisso histórico; `timeSuggestions` prioriza narrador, depois sugestões legadas e fallback natural quando fora da atividade longa.
- `src/long-term-time.js`: sugestões de treinamento, estudo, viagens, recuperação e projetos incluem `action` editável coerente com a duração.
- `src/engine.js`: projeta `timeSuggestionMode` para a interface e valida/persiste o texto opcional (com tamanho limitado).
- `src/gemini.js`: instrui a IA a propor ações variadas adequadas à cena, sem tornar todas as opções treino/estudo; esquema permite `action` opcional.
- `public/app.js` e `public/style.css`: botões de sugestões maiores, legíveis e acessíveis; toque seleciona duração, preenche campo e destaca a opção; alterações manuais retiram o destaque.
- Testes unitários `test/time-suggestions-2-9-2.test.js` e navegação móvel em `scripts/smoke-ui.mjs`.

## Preservação
Mudanças compatíveis com saves antigos, sem migração de banco. Dados de personagens, evolução, missões, NPCs, memórias, jutsus e regras de treino da 2.9.1 não são alterados.

**Render gratuita:** não acionar novo deploy sem preservar a campanha atual. A hospedagem usa SQLite potencialmente efêmero; exportar arquivo JSON é a medida mais segura. Integrar a mudança no GitHub não reinicia a Render porque autoDeploy está desativado.

## Limites
- A distinção entre foco atual e compromisso antigo depende dos trechos narrados recentemente. Situações ambíguas podem exigir melhoria com exemplos da campanha.
- A qualidade de sugestões personalizadas depende da resposta do Gemini. O fallback evita deixar o painel vazio quando existe uma janela válida.
- O texto fornecido pelo narrador é sempre um **rascunho de intenção**, não um resultado narrativo concluído.
