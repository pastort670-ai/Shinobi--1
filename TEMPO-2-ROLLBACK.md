# TEMPO inteligente 2.0 — notas de reversão

A versão anterior está preservada no branch `backup/shinobi-1.3.2-before-time-2`,
commit `8a90a9659d4aa076a0d8db3d74ffbf8cfa5f2a7c`.

Para reverter a lógica inteira do TEMPO, republicar esse commit pela Render
ou alterar temporariamente a fonte do deploy para o branch de backup.
Reversão de código não restaura campanhas perdidas: exporte backups JSON das
campanhas separadamente antes de qualquer reversão.

A versão nova guarda o relógio em `clockMinutes`; campanhas antigas que não
possuem esse campo continuam utilizáveis, usando 08:00 como horário padrão.
O antigo parâmetro `days` continua aceito na camada de compatibilidade para
checkpoints e ações já registradas, enquanto o novo compositor envia `hours`.

## O que a versão 2.0 deve fazer

- TEMPO visível apenas quando a última cena é segura e o narrador oferece janela.
- Durações expressas em horas, dias, semanas, meses ou anos, com limite da cena.
- O relógio avança em horas; passar da meia-noite muda também o dia do calendário.
- Noites concluídas na narrativa avançam automaticamente, sem exigir TEMPO.
- Marcos e compromissos datados interrompem saltos grandes; interrupções
  propostas pelo narrador exigem causa documentada no estado da campanha.
- Regenerar e voltar no histórico restauram tanto a data quanto o relógio.

## Testes

`npm test` e `node scripts/smoke-ui.mjs` são executados na CI.
O teste móvel cobre criação, calendário, regeneração, TEMPO bloqueado em combate,
disponível após conversa encerrada e avanço automático pelo sono.
