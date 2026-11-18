# SHINOBI — IA especialista Naruto (primeira implementação)

## Responsabilidades

O **Gemini continua sendo o único narrador**. O módulo local `src/shinobi-specialist.js` não escreve cenas nem controla escolhas do jogador. Seu papel é fornecer ao Gemini informações de apoio: lore, contexto temporal, relações, memórias e restrições de ficha. O motor de campanha continua sendo a autoridade para persistência e regras.

## Base de conhecimento

- `src/specialist-knowledge.js`: **187 registros curtos e originais**, organizados em sete categorias: mundo/hierarquia (38), técnicas/chakra (37), clãs (21), personagens (36), organizações (13), cronologia (18) e construção de mundo (24).
- Cada registro possui ID estável, título, descrição resumida, termos de busca, idade mínima aproximada de Naruto, categoria e URL para verificação.
- Resumos foram escritos especificamente para orientar o jogo. As URLs não significam que cada frase aparece literalmente na página vinculada; são **pontos de partida para conferência**, não citações por frase.
- Recuperação por termos normalizados, com pesos, limite por categoria e filtro de época; apenas os registros mais relevantes seguem no contexto de cada turno.
- Conhecimento prévio da própria campanha e divergências confirmadas têm precedência sobre material genérico.

## Fontes e acesso externo

O projeto **preserva** `src/external-lore.js`: consulta opcional, limitada e com cache à Wikipédia em português, para assuntos compatíveis. Respostas externas são tratadas como dados não confiáveis, não como ordens; o narrador não deve reproduzir grandes trechos nem transformar teorias ou spoilers em fatos.

Referências para expandir e verificar os registros:
- Site oficial: https://naruto-official.com/en/about
- Resumos do anime clássico: https://naruto-official.com/en/anime/naruto1
- Resumos de Shippuden: https://naruto-official.com/en/anime/naruto2
- Reportagem oficial sobre a primeira fase: https://naruto-official.com/en/news/01_1282

Não foi habilitada uma busca aberta pela internet nem uma importação automática de páginas. Isso deve ser acrescentado de forma segura e auditável, caso seja necessário.

## Contexto fornecido ao Gemini

A função `buildSpecialistBrief(c,i)` fornece:
1. Até oito fatos de Naruto relevantes para o turno, filtrados pelo calendário.
2. Diretrizes para construção de mundo, com NPCs originais possíveis e limites de coerência.
3. Memórias **salvas**, promessas pendentes e relações pertinentes à cena.
4. Sinais sobre ficha travada e jutsus registrados, com proibição de criar conquistas sem evidência.
5. Indicação de lacunas de conhecimento e política para consultar fontes externas.

O especialista não grava alterações nem atribui automaticamente técnicas ou promoções. O narrador ainda produz as propostas estruturadas, e o motor valida e aplica mudanças aceitas.

## Testes e limites

- `test/shinobi-specialist.test.js` verifica volume e unicidade da base, relevância, filtro temporal, não mutação da campanha, memórias, ficha e contexto do Gemini.
- Os testes existentes continuam sendo executados por `npm test`.
- **Não é ainda um modelo de linguagem treinado por nós**, nem um agente que aprende sem supervisão. É o primeiro núcleo especializado, determinístico e utilizável.
- Não há ainda validação manual extensa de cada registro contra volumes/capítulos do mangá; marcos de datas não explicitamente confirmadas devem continuar aproximados.
- A base é somente leitura nesta entrega, sem embeddings, banco vetorial ou sincronização automática com fontes oficiais.
- Dependência de armazenamento seguro para campanhas permanece: o banco SQLite local de um serviço sem volume persistente não garante retenção após reinstalação.

## Próximas evoluções possíveis

1. Aumentar a base por lotes verificados, com referências mais precisas, versões e distinção entre mangá, anime e material complementar.
2. Criar busca semântica, caso haja evidência de que a busca por palavras não recupera os fatos certos.
3. Adicionar avaliação formal para sugestões de memórias, mudanças de ficha e registros por NPC, sempre com rastreabilidade e validação do motor.
4. Criar consulta externa com lista de fontes permitidas e verificações de idioma, confiança, contexto temporal, tamanho e cache.
5. Medir qualidade em campanhas longas reais antes de publicar em produção.

**Segurança de publicação:** esta implementação foi criada em uma ramificação separada. Não substitui automaticamente o serviço atual na Render.
