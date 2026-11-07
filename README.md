# SHINOBI 1.0

RPG narrativo em português, baseado no protótipo HTML fornecido. Frontend móvel sem dependências, servidor Node.js 24+, banco SQLite nativo e narrador Gemini real. Não há narrador simulado na aplicação entregue: sem chave o servidor permite criar/salvar fichas e informa que a narrativa está indisponível.

## Começar

1. Instale Node.js **24 ou superior**.
2. Extraia esta pasta e abra um terminal nela.
3. Copie `.env.example` para `.env`.
4. Crie uma chave em https://aistudio.google.com/apikey e preencha `GEMINI_API_KEY` em `.env`. A chave fica somente no servidor. Não a inclua em commits nem no HTML.
5. Execute `npm start` e abra http://localhost:3000.

Não é necessário `npm install`: só são usadas bibliotecas nativas. `node:sqlite` pode emitir aviso de recurso experimental dependendo da versão do Node.

O padrão é `gemini-2.5-flash`; altere `GEMINI_MODEL` para outro modelo compatível com generateContent e respostas estruturadas, conforme a disponibilidade da sua conta. O plano gratuito tem cotas variáveis por projeto/modelo. Este aplicativo não habilita faturamento nem garante gratuidade de uma conta já paga. Veja https://ai.google.dev/gemini-api/docs/pricing e https://ai.google.dev/gemini-api/docs/rate-limits. O uso gratuito pode ser usado pelo Google para melhoria dos produtos segundo seus termos.

## Jogar

- Clique em **Nova campanha**, depois **Preencher com Akira Hayama** para usar a ficha de teste. Ajuste os dados, confirme a caixa e sele a ficha. A idade inicial é 6; ele foi adotado por Hiruzen e começa com aptidões iniciais.
- Use AGIR ou FALAR. **Combinar trecho** guarda um trecho na fila. Troque de modo para combinar ação e diálogo no mesmo turno. **Enviar turno** envia tudo, incluindo o texto ainda no campo.
- Exemplo: AGIR: “Procuro Hiruzen e seguro a manga de seu manto.” FALAR: “Pai, o que está acontecendo com a vila?”
- TEMPO permite escolher dias, meses internos de 30 dias ou anos de 365 dias. Explique a atividade no campo de texto. A IA também oferece durações contextuais. O avanço máximo é dez anos por turno.
- Treinamentos e combates são julgados pelo Gemini dentro dos limites do servidor. Energia, chakra e habilidades aparecem como descrições. Ganhos são conservadores, até dois pontos internos por turno, inclusive durante saltos longos.
- **Regenerar** substitui o último turno usando o estado anterior, sem acumular ganhos duplicados. Se a nova chamada falhar, o turno original é preservado.
- Troque de campanha no seletor para carregar outra história. O estado persiste em disco após reiniciar o servidor. Use **Backup** para exportar a campanha integral em JSON.

## Publicar usando só o celular

É preciso um serviço que execute Node 24 ou Docker **e tenha disco persistente**. GitHub Pages e hospedar só o HTML não executam este servidor.

1. Extraia o ZIP no gerenciador de arquivos do celular. No navegador, crie um repositório privado no GitHub. Use a visualização “Site para computador” se necessário para enviar os arquivos mantendo as pastas. Também é possível usar um GitHub Codespace no navegador para descompactar, revisar e enviar os arquivos.
2. Não envie `.env`, a pasta `data` nem backups pessoais. A pasta do projeto já inclui `.gitignore` e testes automáticos para GitHub Actions.
3. Em um provedor com aplicação Docker/Node e volume persistente, conecte o repositório. Com Docker, use o `Dockerfile` fornecido. Sem Docker, selecione Node 24, nenhum comando de build obrigatório, e início `npm start`.
4. Cadastre `GEMINI_API_KEY` como segredo no painel da hospedagem, `GEMINI_MODEL=gemini-2.5-flash` e `COOKIE_SECURE=true` quando a URL for HTTPS. Use a porta fornecida pelo provedor via `PORT`.
5. Monte o volume em `/app/data` para Docker e use `DB_PATH=/app/data/shinobi.sqlite`. Se o provedor montar outro caminho, ajuste `DB_PATH`. Execute apenas **uma instância** do aplicativo.
6. Publique e abra a URL HTTPS no Chrome do celular. Crie Akira e faça a primeira conversa. Uma hospedagem sem volume pode perder todas as campanhas quando reiniciar ou atualizar; não a use para o salvamento definitivo.

Os nomes das telas e as ofertas dos provedores variam. O pacote está preparado para publicação, mas não cria conta GitHub, chave Gemini nem hospedagem automaticamente. A gratuidade do Gemini não implica gratuidade da hospedagem persistente.

## Persistência, privacidade e recuperação

Cada navegador recebe um identificador aleatório de 256 bits em cookie HttpOnly, SameSite=Strict. O banco armazena seu hash e restringe todas as campanhas a esse proprietário. A chave Gemini nunca chega ao navegador. O calendário, os fatos e as conversas ficam no SQLite, não no localStorage; localStorage guarda só o ID da campanha ativa.

Esta versão não possui login, sincronização entre dispositivos nem importador de backups. **Apagar os cookies, trocar de navegador ou usar aba anônima remove o acesso às campanhas anteriores**, embora elas permaneçam no banco. O JSON exportado permite leitura e recuperação técnica futura, não restauração pela interface nesta versão. Guarde também cópias consistentes do banco: pare o servidor e copie `shinobi.sqlite` junto com quaisquer arquivos `-wal`/`-shm` presentes. Para restaurar, pare o serviço e reponha o conjunto no mesmo DB_PATH. Preserve os cookies do navegador para manter o acesso.

O serviço é adequado para uso pessoal/restrito. O identificador por navegador não substitui contas de usuário para lançamento público. Antes de abrir para muitos usuários, adicione login, recuperação, cotas por conta, controle de acesso da hospedagem, moderação e limites globais. Criar novos cookies pode contornar a cota local; não exponha sua chave a acesso irrestrito.

## Estrutura

- `public/`: interface manga colorido, balões, ficha, memória, calendário fixo e comandos adjacentes.
- `src/server.js`: HTTP, cookie, isolamento, SQLite, bloqueio de concorrência, limite local e exportação.
- `src/engine.js`: validação, calendário, recuperação lexical, progressão e aplicação de turnos.
- `src/gemini.js`: adaptador substituível para generateContent, instruções e esquema JSON.
- `src/lore.js`: biblioteca separada e seis marcos históricos internos.
- `test/`: testes de regras, HTTP, persistência e adaptador com transporte controlado.
- `scripts/live.mjs`: teste real opcional, com chave própria.
- `reference/prototipo.html`: cópia intacta da referência; o servidor não a publica.
- `docs/TESTES.md`: resultados e limites da verificação.

## Memória e cronologia

Decisões do jogador são guardadas literalmente, além de fatos extraídos pelo Gemini. O contexto usa oito mensagens recentes (até 5 mil caracteres cada), até dezesseis fatos classificados por palavras relevantes/recência, relações atuais e cinco trechos da biblioteca. O histórico completo permanece salvo e exportável; a interface mostra as últimas cem mensagens e cento e cinquenta memórias. Recuperação lexical não é busca semântica: paráfrases podem deixar de encontrar memórias antigas.

O calendário tem 365 dias por ano, inicia em 10/10 do ano 0 e não tem anos bissextos. Meses usam as durações convencionais. A idade aumenta após cada 365 dias decorridos; a data de aniversário individual não é modelada. A cronologia é aproximada e incompleta: incidente Hyūga, massacre Uchiha (~ano 7), Time 7, invasão de Konoha e retorno de Naruto. O massacre aproximado do protótipo no ano 5 foi corrigido para ano 7 nesta referência interna. Os marcos são aplicados ao cruzar suas datas, com divergências justificadas pelo narrador e persistidas. Não existe simulação independente de toda a política do mundo. A IA pode cometer erros de lore, antecipar fatos ou julgar consequências de modo inadequado; os limites estruturais e numéricos não provam coerência literária.

## Testar

- `npm test`: testes automatizados locais, sem consumir API.
- `npm run test:live`: uma chamada real ao Gemini, usando `.env`; imprime a narrativa e valida sua estrutura. Consome sua cota. Sem chave, informa a pendência e termina com código 2.

O teste real é necessário para validar disponibilidade do modelo e qualidade narrativa na sua conta. Ele não foi executado com credencial nesta entrega.

## Limites intencionais desta versão reduzida

Biblioteca curada pequena; inventário, economia, missões formais, jutsus individuais e NPCs com fichas próprias ainda não implementados. Hiruzen e outros NPCs têm relações e fatos persistidos, mas conhecimentos e objetivos são interpretados pelo modelo. Não há regras determinísticas completas de combate, nem garantia de consistência absoluta do Gemini. O servidor valida forma, limites e permissões; fatos e divergências continuam dependendo do julgamento narrativo. Não há funcionamento narrativo offline. O banco usa estados JSON por campanha, apropriado a uso pessoal; campanhas muito extensas precisarão de normalização e indexação. Falhas/429 não repetem chamadas automaticamente e não mudam a campanha; aguarde e reenvie. O limite local é um envio a cada 15 segundos e 100 tentativas por dia UTC por navegador; ambos os sucessos e erros contam. Não existe migração automática do salvamento do protótipo.

Projeto de fã, sem afiliação oficial. Naruto e seus personagens pertencem aos respectivos titulares.
