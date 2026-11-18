# SHINOBI 2.8.0 — Ficha, Memória, Cronologia e Calendário mais limpos

## Problema relatado
O usuário não pediu para reduzir a quantidade de destinos do menu: a dificuldade era **o excesso de textos e painéis dentro de Ficha, Memória e Cronologia**, além da aparência confusa do calendário. O objetivo é mostrar o essencial no celular e conservar todo o histórico acessível sob demanda.

## Referências de UX estudadas
- Nielsen Norman Group — Progressive Disclosure: https://www.nngroup.com/articles/progressive-disclosure/ . Prioriza informação necessária para a tarefa atual; detalhes mais raros ficam atrás de um controle simples.
- Apple Human Interface Guidelines — Pickers: https://developer.apple.com/design/human-interface-guidelines/pickers . Um calendário embutido, legível e com seleção clara é adequado a datas.
- Android Material Components — DatePicker: https://github.com/material-components/material-components-android/blob/master/docs/components/DatePicker.md . Navegação de mês com seleção única, indicação clara da data e controles táteis.
- Referência visual: disposição compacta de meses, grade de sete dias, círculo para o dia atual e marcações discretas de eventos nos apps de calendário contemporâneos.

Essas referências fundamentam decisões gerais de design, mas não fornecem código copiado. Todo HTML, CSS e SVG desta versão foi adaptado ao Shinobi.

## Ficha ninja
- O gráfico de oito eixos **passou a conter o nome e a avaliação de cada atributo no próprio desenho**.
- A segunda coluna com oito cartões e barras de progresso foi retirada da apresentação visível; suas informações continuam disponíveis para acessibilidade no texto descritivo do SVG e no elemento auxiliar oculto.
- É possível alternar **nota numérica** e **descrição**, ambas mostradas no gráfico. Sem evidência suficiente, a indicação é um travessão, não um valor inventado.
- Condições de energia e chakra aparecem primeiro em duas linhas compactas.
- Missões, jutsus, ficha de origem, treinamento e histórico de avaliações permanecem na mesma aba, mas em painéis recolhidos por padrão.
- As estruturas da campanha e os atributos internos **não são alterados** por esta revisão.

## Memória
- Mostra inicialmente até quatro Memórias Marcantes mais recentes, cada uma como título e prévia de até 96 caracteres.
- Tocar em uma memória mostra a descrição completa; registros antigos ficam sob **Ver mais**.
- Relacionamentos, compromissos, consequências e histórico completo ficam em painéis recolhidos com contadores.
- Os registros originais continuam no backend; não ocorre apagamento, filtragem destrutiva nem limitação de memória do narrador.
- Textos longos são expandidos apenas quando o jogador quer os detalhes.

## Cronologia
- A era atual e a próxima era ficam em uma síntese curta.
- Outras eras são exibidas numa lista recolhida; o jogador pode expandir uma era para ver a explicação disponível.
- Marcos ocorridos são organizados em títulos e datas, com detalhes expandidos ao toque. Os mais antigos ficam sob **Ver mais**.
- Não revela previamente detalhes de épocas futuras.

## Calendário
- Grade de mês/semana com cabeçalho **Dom, Seg, Ter, Qua, Qui, Sex, Sáb**.
- Dia atual com preenchimento sólido; dia selecionado com contorno; acontecimentos e mudanças de era como pontos pequenos.
- Setas para avançar/voltar um mês e botão **Hoje** para regressar à data da campanha.
- Seleção do dia mostra apenas os eventos daquele dia; descrições completas abrem ao toque.
- Navegação por todos os anos e meses continua disponível dentro de **Ir para outro mês ou ano**.
- **Próximos acontecimentos** continuam acessíveis, mas recolhidos por padrão.
- Percorrer datas **não avança o tempo da história**, pois o calendário permanece um leitor de informações, não um comando de tempo.

## Compatibilidade e segurança
A versão só modifica `public/index.html`, `public/app.js`, `public/style.css`, os testes da interface e os números de versão. O banco de dados, as memórias, a progressão e as regras de combate não sofrem migração.

Na Render gratuita, o SQLite do servidor pode ser efêmero. **Exportar a campanha em JSON antes de qualquer atualização continua importante**, mesmo com a tentativa de recuperação por backup do mesmo navegador.

## Testes
`test/ui-compact-2-8.test.js` cobre acessibilidade do gráfico, controle de notas, painéis recolhidos, integridade de dados, navegação no calendário, eventos por dia e resumos de cronologia. Os antigos testes de UI foram atualizados somente quando exigiam elementos removidos intencionalmente no novo design.

## Limitações
- Testes automatizados e smoke test móvel verificam estrutura, funcionamento e compatibilidade, mas usabilidade real depende da experiência durante uma campanha.
- Num navegador muito estreito, nomes longos dos oito atributos podem exigir ajustes finos de tipografia.
- A navegação principal e o compositor da história permanecem como antes; esta entrega concentra-se na **densidade informacional interna** das três seções.
