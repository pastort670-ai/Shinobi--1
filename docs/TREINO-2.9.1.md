# SHINOBI 2.9.1 — Treinamentos de até dois anos e evolução equilibrada

## Objetivo
O usuário pediu que a passagem de tempo comportasse uma etapa de treinamento ninja prolongado de **até dois anos**, como o treinamento de Naruto sob Jiraiya, sem transformar tempo decorrido em maestria automática ou levar qualquer atributo ao nível máximo apenas pelo salto.

## Regras temporais
- `MAX_TRAINING_SKIP_DAYS=730` dias, equivalentes a dois anos do calendário interno (365 dias por ano).
- Treinamento explicitamente aceito por um mestre e combinado por um prazo menor **permanece limitado ao prazo menor** (ex.: um mês → no máximo 30 dias).
- Acordos de três anos ou mais são cumpridos em etapas de **até dois anos por seleção**. Após dois anos, a janela oferece apenas o prazo restante.
- Uma mentoria **prolongada** assumida pelo NPC sem data final pode abrir uma primeira etapa de dois anos. Uma aula ou treino casual sem duração não cria automaticamente um compromisso de dois anos.
- Sugestões proporcionais à etapa disponível, como um mês, um ano e dois anos. O botão TEMPO só avança após o jogador selecionar e enviar.
- Outras atividades, como viagens, espera e obras, conservam suas regras anteriores; o teto de dois anos é específico de **treino**.
- Compromissos datados e eventos canônicos continuam interrompendo saltos. O avanço real não pode exceder o período autorizado, inclusive após interrupções.
- Tenta reconhecer acordos anteriores preservados no histórico sem modificar nem recriar a campanha.

## Balanceamento de treinamento
- `src/training-balance.js` calcula ganhos a partir do treinamento **confirmado pela narração**, qualidade informada no campo `training`, duração efetivamente consumida e capacidade previamente demonstrada.
- Para períodos longos há progresso adicional moderado, proporcional à qualidade, com **retornos decrescentes**; treino de dois anos rende mais que um mês, mas o ganho é limitado a 30 pontos internos por turno no máximo, e geralmente menos.
- Prodígios recebem vantagem moderada em fases de prática longa, sem imunidade aos limites.
- Perto do topo, repetir treinos é menos produtivo. **Treino sozinho não aumenta os três parâmetros de treinamento até 100**, e a avaliação do Databook por treino permanece abaixo da nota 5.
- Notas máximas já conquistadas em campanhas existentes não são diminuídas. O teto se aplica apenas a progresso decorrente de treino, não a conquistas especiais previamente reconhecidas.
- Avaliações de Força, Velocidade, Resistência, Inteligência ou Selos propostas pelo Gemini após salto longo de treino também não podem saltar direto para nota 5 por simples passagem de tempo. Estudos e exercícios indiretos continuam sendo reconhecidos como evidências.
- Jutsus podem ser aprendidos durante anos de treinamento, mas cada salto aceita no máximo duas técnicas novas identificadas **pelo nome e pelo aprendizado bem-sucedido na narração**; meras tentativas ou nomes ausentes da história não bastam.
- O narrador é explicitamente instruído a apresentar evolução, limitações e especialidades de maneira plausível, sem descrever perfeição universal e sem atribuir vitórias ou poderes gratuitos.

## Campanhas atuais e hospedagem
Não há migração destrutiva. O personagem, as campanhas, relações, memórias, jutsus já aprendidos e avaliações elevadas existentes são preservados. O comportamento novo aplica-se a **próximos treinos** e aos acordos que ainda possam ser reconhecidos no histórico aceito.

O serviço na Render Free utiliza SQLite com armazenamento temporário. Publicar o código pode apagar a campanha que está no servidor. **Antes do deploy, exportar a campanha em JSON é a opção mais segura.** Backup automático do navegador não é garantia.

## Testes
`test/long-training-balance-2-9-1.test.js` cobre: dois anos aceitos, mentoria sem prazo, limites menores, acordo de três anos em etapas, projetos independentes, negativa e condicionantes, treinamento insuficiente, ganhos de novato e avançado, limite de maestria, permanência de nota 5 antiga, jutsus comprovados, databoook e interrupções. Executar suíte geral e navegação móvel antes de publicar.
