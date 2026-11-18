# Shinobi 2.8.1 — missão concluída precisa ser registrada sem depender de uma frase

## Falha reproduzida
A mesma campanha podia concluir uma segunda missão e continuar com a contagem antiga. Encontradas quatro fragilidades:
1. Reconhecimento dependia demais de termos literais como “missão concluída”, embora o jogo pudesse confirmar sucesso por um relatório final aprovado, objetivo cumprido ou resultado homologado.
2. Quando duas missões do mesmo rank terminavam no mesmo dia ou em poucas mensagens, o detector podia tratá-las como duplicatas.
3. O campo estruturado `missionCompletion` do Gemini tinha requisitos muito estreitos: a narração precisava repetir simultaneamente missão, rank e verbo de conclusão, ignorando a classificação já atribuída em cena anterior.
4. A leitura da ficha reconstruía resultados a partir de texto e memórias, sem guardar permanentemente a prova estruturada junto à resposta aceita. A ficha podia perder contexto ou depender demais da redação.

## O que mudou
- **Eventos aceitos e verificáveis:** a confirmação estruturada do Gemini agora fica armazenada junto à mensagem do narrador (`missionProof` e campo compatível `missionCompletion`). A reconciliação só utiliza esse registro com trecho literal comprovável na cena e sem negação/falha/atribuição exclusiva a terceiro.
- **Estado da missão no contexto:** o narrador recebe `missionStatus.active` e as conclusões recentes. O rank já confirmado na atribuição não precisa ser repetido no diálogo final.
- **Conclusões por acontecimentos:** relatório final aprovado, trabalho reconhecido, objetivo concluído e contrato aceito podem fechar uma missão previamente atribuída. Uma proposta, etapa parcial, intenção do jogador ou sucesso exclusivo de outro NPC não a concluem.
- **Identidade e duplicatas:** nova atribuição de missão do mesmo rank não é descartada por ter ocorrido no mesmo dia ou até quatro mensagens após a anterior. Relatos repetidos do mesmo objetivo continuam sem inflar a contagem.
- **Fontes antigas:** narrativas aceitas, registros de missão persistidos, Memórias Marcantes salvas e compromissos de missão confirmadamente concluídos podem recuperar registros anteriores. Abrir a ficha não modifica o histórico; continuar a campanha passa a persistir o registro consolidado. Rewind e regeneração removem conclusões de cenas rejeitadas.
- **Sem alteração de identidade:** não é necessário reiniciar o personagem, refazer missão, recontar o tempo ou editar a ficha travada.

## Validação
`test/mission-event-persistence.test.js` cobre nove cenários de missão: relatório aprovado sem expressão fixa, duas D no mesmo dia, duas C diferentes, lembrança repetida, prova estruturada e recuperação, rank no contexto, alegação só do jogador, conclusão alheia e leitura idempotente.

`test/mission-ledger-2-8-1.test.js` cobre ainda dois registros próximos, confirmação em pendências e memórias antigas, relatório passivo e recuperação com rewind. Mantemos toda a suíte anterior e o smoke test móvel.

## Limites e dados privados
Não temos acesso direto à campanha privada de Kaien no navegador ou ao SQLite temporário da Render para confirmar o texto específico da segunda missão. A correção deriva de registros comprovados existentes: se o diálogo não registrou nenhum desfecho aceito, não inventa uma missão concluída.

A Render gratuita utiliza armazenamento efêmero: publicar pode reiniciar a cópia da campanha no servidor. Exportar o JSON antes de atualizações continua essencial. Existe tentativa de restauração de backup local no mesmo navegador, mas não é garantia.

## Recomendação futura
Uma evolução de arquitetura posterior deve atribuir um ID estável a cada missão assim que for criada, mantendo status explícito aceita/em andamento/concluída/cancelada e ligando o diário às suas evidências. A versão atual melhora a recuperação e torna eventos estruturados persistentes sem migrar destrutivamente campanhas antigas.
