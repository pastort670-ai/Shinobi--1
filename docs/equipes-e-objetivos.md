# Equipes e objetivos · SHINOBI 2.10.0

Na criação, um genin de vila recebe dois colegas e um jōnin, com nomes originais da campanha. Veja a formação em **Ficha e desenvolvimento → Minha equipe**. O jogador continua livre para interpretar cenas sem os colegas. Uma equipe temporária de missão pode ter outro comandante. Campanhas antigas conservam seu histórico. Quando faltam os nomes, a ficha aguarda confirmação pela história em vez de inventar um passado.

O narrador pode confirmar ou dissolver a formação permanente com uma designação explícita. O servidor confere a citação na narração aceita e os nomes antes de registrar a mudança. Uma mudança ambígua pode ficar apenas no texto. O histórico guarda as últimas doze alterações. Desfazer um turno volta à formação correspondente.

Em **Memória → Meu objetivo**, escreva até 240 caracteres. Esse campo dá direção à narrativa. Um desejo não equivale a uma vitória, uma promoção ou uma promessa de outro personagem. O objetivo pode ser alterado sem consumir um turno. Ele acompanha o backup e é preservado ao refazer uma cena.

A versão inclui as sugestões contextuais da 2.9.2. Tocar numa sugestão preenche uma ação editável. O tempo passa depois do envio. Treinos longos continuam sujeitos aos limites de progressão e aos compromissos da história.

## Referências de design

- [Formação do Time 7 após a Academia](https://naruto-official.com/en/news/01_1282). A campanha usa essa composição como padrão de jogo.
- [Primeiro comando de Shikamaru como chūnin](https://naruto-official.com/en/anime/naruto1/list/01_334). Um grupo de missão pode ter outros integrantes.
- [Escrita de ficção interativa com ink](https://www.inklestudios.com/ink/web-tutorial/). As escolhas apresentadas ao leitor e o texto narrado podem cumprir papéis diferentes.

## Verificação

Execute `npm test` com Node 24 ou posterior. O teste de navegador em `scripts/smoke-ui.mjs` usa Playwright e Chromium. Para um ensaio prolongado local, use `SOAK_MINUTES=90 node scripts/campaign-soak.mjs`. Ele cria campanhas descartáveis em SQLite, alterna falas e ações, testa solicitações com revisão antiga e restaura backups. As respostas são simuladas e não consomem a cota do Gemini.
