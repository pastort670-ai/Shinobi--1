# SHINOBI 2.9.0 — Saltos de tempo proporcionais à história

## Problema real
Um mentor aceitou treinar o personagem durante um mês, mas o narrador não ativou **Tempo** nem sugeriu o mês inteiro. O estado antigo dependia do campo opcional `timeAvailable` e das sugestões `timeChoices` devolvidas pelo Gemini. O servidor também recusava um salto quando esse campo vinha falso, independentemente dos compromissos confirmados. Isso impedia que o jogador acelerasse períodos de aprendizado e trabalho já combinados.

## Correção
- `src/long-term-time.js` consulta **cenas ACEITAS** da campanha (e a solicitação imediatamente anterior, quando o interlocutor respondeu apenas “concordo”), identifica atividade, acordo positivo e duração. Não confia somente na intenção do jogador. Os acordos antigos continuam elegíveis sem migração nem reinício.
- O motor `time-engine.js` habilita **Tempo** para treinamentos, estudos, pesquisas, projetos, viagens, tratamentos ou períodos de espera confirmados, mesmo se o Gemini esqueceu o botão.
- **Exemplo:** “Hiruzen concorda em treinar Kaien por um mês” habilita 7 dias, 15 dias e **1 mês**; pode selecionar a duração combinada ou um intervalo menor. Se o mestre concordou em ensinar “por três anos”, o limite passa a três anos, não 24 horas.
- Anos e meses: **1 mês = 30 dias**, **1 ano = 365 dias**, de acordo com o calendário do Shinobi. **Máximo de 10 anos por salto**, mas compromissos com 20 anos, por exemplo, podem continuar em saltos posteriores enquanto vigentes. Isso impede que uma só requisição enorme destrua o ritmo da campanha.
- A interface mostra o motivo do avanço (“Treinamento combinado”, “Estudos combinados” etc.), sugere intervalos condizentes e preenche um rascunho de atividade que o jogador pode editar. Nenhuma ação é enviada sem clicar em **Enviar**.
- O servidor usa `canUseTime` para validar oportunidades reais. Não é necessário que o Gemini envie `timeAvailable:true` se a história aceita um acordo longo. O limite no servidor impede avançar além do período combinado.
- **Interrupções reais continuam:** marcos canônicos, compromissos já datados e causas narrativas fundamentadas podem encurtar o salto. O narrador deve parar no evento, não pular o conflito, nem acrescentar crises aleatórias para prender o jogador. O período restante do acordo continua disponível quando cabível.
- O contador de data, idade, cronologia, energia/chakra e progressão continuam passando pelo mecanismo `apply` atual, sem conceder jutsus ou habilidades automaticamente por apenas clicar no botão.

## Casos que desbloqueiam TEMPO
- Mentor confirma um **mês de treino** → opções de semanas ou mês completo.
- Professor aceita **um ou vários anos de estudos/aprendizado** → opções de meses/anos.
- Equipe autoriza uma **expedição ou viagem de vários meses** → pulo conforme jornada planejada.
- Médico confirma **semanas de recuperação** → descanso proporcional ao tratamento.
- Responsável aceita **meses de construção, fabricação ou pesquisa** → andamento resumido por fases.
- Pessoa ou instituição confirma **espera/projeto de longa duração**, sem missão urgente ou combate → avanço voluntário limitado ao acordo.

## Não desbloqueia
- O jogador apenas pede “treine-me por um ano” e o NPC não aceitou.
- O NPC recusa, considera a hipótese ou ainda não confirmou o compromisso.
- A atividade pertence só a outro NPC.
- O protagonista está em combate.
- O prazo do acordo acabou ou o compromisso foi cancelado.
- O modelo apenas anunciou um resultado, sem aprovação/atividade confirmada.

## Campanha atual
A detecção é calculada ao consultar o estado já salvo: **o acordo anterior do instrutor pode habilitar o botão na campanha existente**, se o texto de confirmação ainda estiver no histórico aceito. Não precisa recriar a ficha nem mandar a IA concordar de novo. A função não altera memórias e dados da campanha ao ler o estado.

## Limites e risco de deploy
- Reconhecimento é uma heurística conservadora; formulações muito incomuns podem precisar de exemplos reais para adaptação.
- Períodos longos narrados em um turno não equivalem a completar automaticamente todas as etapas do treinamento; progresso e técnicas continuam exigindo evidências da história.
- **Render Free:** o banco SQLite pode ser efêmero. Antes de publicar esta versão no mesmo serviço, exportar a campanha atual para JSON é fundamental. O app tenta guardar um backup no mesmo navegador, mas isso não garante que o banco sobreviva a um deploy.

## Testes
`test/time-long-term-2-9.test.js`: contrato mensal, aceite curto, recusas/hipóteses, estudos por anos, 20 anos em lotes, campanhas antigas, projetos, recuperação, viagem, combate, evento canônico e pendência datada, API com `timeAvailable:false`, seleção móvel, avanço não automático, calendário e progresso. Suíte geral preservada.
