# SHINOBI 1.3.0 beta — pontos de recuperação e testes

## Versão anterior preservada

A versão estável anterior ao Motor Shinobi 1.0 está fixada no branch GitHub
`backup/shinobi-stable-before-motor-2026-11-09`, commit
`eac206e3a8b35ef563ee4f4fcdb16ddd89c74511`.

O desenvolvimento da versão beta parte desse commit em
`feature/motor-shinobi-foundation-mobile-ux`.

## Voltar atrás

Há duas alternativas distintas:

1. **Desligar o motor de NPCs** sem remover alterações de interface:
   definir `MOTOR_SHINOBI_ENABLED=false` na variável de ambiente do serviço
   e reiniciar o serviço. As campanhas antigas continuam sendo importáveis e
   o Gemini opera com o fluxo pré-motor (o novo estado fica armazenado, mas
   não influencia novos turnos).
2. **Voltar à versão anterior inteira**: publicar novamente o código do
   commit `eac206e3a8b35ef563ee4f4fcdb16ddd89c74511`, seja pela opção de
   rollback de deploy da hospedagem (caso disponível) ou pela troca da fonte
   do deploy para o branch de backup. Antes disso, guardar um backup JSON de
   cada campanha, pois o disco de serviços gratuitos pode ser efêmero.

Não suponha que o rollback de código recupere campanhas apagadas do servidor.
Dados de campanha exigem backup independente.

## Confiabilidade

- `src/motor.js`: decisões locais e limitadas; **nenhuma chamada de IA extra**.
- A proposta de iniciativa nunca altera a história diretamente.
- Eventos, memórias e objetivos dos NPCs só são salvos depois de um turno validado.
- Regenerar e desfazer restauram o snapshot anterior, inclusive o estado do motor.
- Conhecimento privado de NPC não é exposto automaticamente a outros NPCs.
- A importação de backups da versão anterior continua compatível.
- `MOTOR_SHINOBI_ENABLED=false` é a chave de desativação imediata.

## Critérios para manter a beta publicada

Rodar `npm test` e o teste móvel automatizado; verificar regeneração perto
do campo de chat, sem perda do rascunho; validar ao menos um turno com
relacionamentos e compromissos; testar importação/exportação e
reversão de mensagens. Coletar relatórios de erros dos testadores sem
divulgar chaves de API ou outros segredos.
