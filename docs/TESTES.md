# Relatório de verificação — SHINOBI 1.0

Data: 07/11/2026. Ambiente: Node.js 24.22.1, Linux. Comando final: `npm test`.

**Resultado: 13 testes aprovados, zero falhas.** O registro integral está em `test-output.txt` nesta pasta. Também passaram as verificações sintáticas de `public/app.js`, `src/server.js` e `scripts/live.mjs`.

| Sistema | Evidência | Resultado |
| --- | --- | --- |
| Personagem | Nome e idade válidos; rejeição de dados inválidos | Aprovado |
| Ficha travada | Tentativa de PATCH via HTTP é rejeitada | Aprovado |
| Ação + fala | Trechos combinados preservados na memória e enviados no contexto | Aprovado |
| Relações | Resposta estruturada atualiza vínculo com Hiruzen | Aprovado |
| Treinamento | Ganho gradual e conservação do estado anterior | Aprovado |
| Combate | Resultado narrado e desgaste, sem ganho automático | Aprovado com resposta controlada |
| Calendário | Marco inicial, passagem de ano, idade, limite de dez anos | Aprovado |
| Cronologia | Marcos cruzados e alteração de resultado por divergência | Aprovado |
| Progressão descritiva | Apresentação qualitativa e ocultação de valores de condição | Aprovado |
| Memória | Recuperação de senha antiga entre mil fatos; contexto recente limitado | Aprovado |
| Persistência | Fechar/reabrir o servidor com o mesmo SQLite preserva a campanha | Aprovado |
| Campanhas | Segregação de proprietários e ausência de relações/fatos na nova campanha | Aprovado |
| Regeneração | Substitui resposta sem duplicar prática, histórico ou relações | Aprovado |
| Concorrência | Segundo envio simultâneo recebe 409 | Aprovado |
| Estado inválido/falhas | Erro Gemini preserva data e revisão | Aprovado |
| Adaptador Gemini | Endpoint, cabeçalho secreto, JSON, esquema e leitura de candidato | Aprovado com transporte substituído |
| Erros da API | 429, interrupção de segurança, JSON inválido, rede e ausência de chave | Aprovado |
| Segurança HTTP | CSRF de outra origem rejeitado; `.env` não servido | Aprovado |
| Backup | Exportação inclui o estado integral e progresso | Aprovado |

Os casos agrupados acima são verificações dentro dos 13 testes, não 19 testes independentes. Respostas controladas validam o código, não a inteligência do modelo.

## Conferência no navegador

Executada no navegador remoto de desenvolvimento, em resolução desktop:

- Carregamento da interface colorida, com balões, comandos adjacentes e calendário fixo.
- Abrir Nova campanha, preencher com Akira Hayama, confirmar e selar a ficha.
- Exibir Akira aos seis anos, em Konoha, com condições e habilidades descritivas.
- Enviar fala para Hiruzen sem chave: aviso correto de configuração, nenhum turno inventado e trecho mantido na fila para nova tentativa.
- Atualizar a página: campanha e ficha persistem.
- Abrir Ficha: campos somente para leitura, identidade e idade inicial preservadas.

Não foi executado teste em aparelho Android físico nem em viewport móvel. O CSS inclui adaptação para telas estreitas, mas a compatibilidade móvel integral permanece a validar. Não houve medição de acessibilidade, carga ou estabilidade de campanhas de longa duração.

## Problemas encontrados e corrigidos

1. Uma variável de relacionamento sombreava a resposta do modelo e impedia a aplicação dos turnos. Corrigida; testes de motor, HTTP e concorrência passaram.
2. O teste de segredo inicialmente confundia o nome público da variável de configuração com a chave secreta. Ajustado para verificar que o cliente não contém o cabeçalho de autenticação do provedor.
3. O servidor ignorava o argumento de porta usado pela ferramenta de prévia. Corrigido suporte a `--port`; a interface então foi aberta e conferida no navegador.

## Teste real com Gemini: pendente

`npm run test:live` foi invocado e terminou com código 2 e a mensagem de chave ausente. Nenhuma chamada autenticada foi feita. Não há confirmação de disponibilidade do modelo na conta do usuário, latência real, qualidade de interpretação, fidelidade de Hiruzen ou continuidade narrativa em várias sessões.

Para completar esta etapa, configure GEMINI_API_KEY no servidor, execute `npm run test:live` e realize conversas, treino, combate e saltos de tempo usando a interface. Não envie a chave pelo HTML. O teste real consome cota da conta configurada.

## Publicação: preparada, não executada

Dockerfile, variáveis de exemplo, `.gitignore`, workflow GitHub Actions e instruções em português estão no projeto. Não foi criado repositório externo ou serviço de hospedagem. O endereço da prévia é temporário e não constitui publicação para uso no celular.

## Atualização: hospedagem gratuita e convites

A suíte foi ampliada: **17 testes aprovados, zero falhas**. Os quatro novos testes cobrem acesso bloqueado sem convite, convite do responsável, emissão de convites para testadores, restrição do painel administrativo, cancelamento imediato, cookies forjados, resgate cross-site, falha fechada sem segredos e validade da sessão do responsável após reinício. A configuração gratuita foi validada com o esquema oficial da Render, sem disco ou serviços pagos. A validação real com Gemini continua pendente da chave do usuário. Convites dos testadores usam armazenamento temporário e podem desaparecer em reinícios, assim como as campanhas. A referência anterior a ausência de controle de acesso foi superada por esta atualização; ainda não há contas com identidade verificada nem sincronização entre dispositivos.
