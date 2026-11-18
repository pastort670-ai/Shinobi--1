# SHINOBI 2.4.2 — correção do contador de missões

## Problema identificado
O motor 2.4.1 só registrava missões se o narrador Gemini fornecesse o campo opcional `missionCompletion`, com rank e trecho textual literal no mesmo turno de conclusão. Uma missão concluída na história poderia permanecer com contador zero quando o rank aparecia antes da cena final ou quando esse campo não era preenchido.

## Correção
- `src/mission-reconciliation.js` recupera conclusões a partir de **narrativas aceitas**, em vez de exigir sempre o campo opcional do Gemini.
- Quando o rank é informado em outra cena, o motor pode aproveitar a classificação da missão anteriormente atribuída.
- Conclusões confirmadas sem rank documentado são separadas como **Sem rank**, sem inventar classificação D/C/B/A/S.
- A ficha recupera cenas anteriores que ainda constem do histórico salvo, inclusive campanhas criadas antes desta atualização. Abrir a ficha não altera o estado da campanha; o histórico reconciliado é persistido no turno seguinte.
- Eventos de NPCs, notícias de missões distantes, promessas, tentativas e alegações isoladas do jogador não contam.
- A mesma conclusão repetida em mensagens próximas, o registro proposto pelo Gemini e a detecção automática não podem aumentar a contagem duas vezes.
- Checkpoints, rewind e regeneração preservam apenas as cenas aceitas na versão selecionada.

## Limites
A recuperação não pode reencontrar missões cujas cenas foram perdidas do banco ou do backup. Uma conclusão sem evidência suficiente da participação do protagonista pode permanecer sem registro; nesse caso, um relato narrativo claro em campanha seria necessário, sem falsificar a classificação.

## Validação
`test/mission-reconciliation.test.js` cobre: campo opcional ausente, rank em cena anterior, histórico antigo, sem rank, notícias sobre outras equipes, duplicação, negação, alegação do jogador e regeneração.

## Nota importante sobre publicação
O serviço atual usa Render gratuito e `EPHEMERAL_STORAGE=true`; qualquer atualização pode reiniciar o banco SQLite temporário. Antes de um deploy, recomenda-se salvar um arquivo em **Mais opções → Exportar campanha** no próprio Shinobi. O backup automático no aparelho também existe, mas não deve substituir o backup manual de uma campanha importante.
