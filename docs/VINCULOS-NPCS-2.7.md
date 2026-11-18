# Shinobi 2.7.0 — Relações importantes e continuidade dos NPCs

## Por que a atualização foi necessária
Na campanha de teste, a aba **Relações** estava acumulando personagens incidentais, inimigos passageiros e até uma guarnição com a qual o protagonista apenas cruzou. Em outra situação, um comerciante reapareceu com identidade diferente após o jogador retornar à mesma loja.

## Regras para a aba Relações
- Só mostrar **pessoas com vínculo pessoal relevante**: família, mentores, amizade consolidada, aliados importantes, parceiros e rivalidades duradouras.
- Simples presença, conversa, compra, venda, patrulha, encontro ocasional ou luta isolada **não** criam relacionamento.
- Guarnições, patrulhas, grupos, bandas de mercenários, adversários genéricos e lugares **não** são personagens individuais na aba.
- Uma pessoa incidental pode ganhar vínculo posteriormente, quando a história estabelecer uma relação significativa.
- A ficha exibe uma seleção limitada de vínculos (máximo 22) e reúne nomes equivalentes — por exemplo, `Hiruzen`, `Senhor Hiruzen` e `Hiruzen Sarutobi`.
- Vínculos antigos considerados incidentais são ocultados da aba. **Eles não são apagados imediatamente:** quando a campanha salva um novo turno, ficam no campo privado `relationArchive` para preservar o histórico. Conversas, memórias, fatos e compromissos originais não são reescritos.

## Identidade dos NPCs
- `src/relationship-engine.js` distingue vínculos importantes de conhecimentos privados sobre NPCs e reconcilia apelidos e títulos quando há identificação suficiente.
- O contexto do Gemini inclui `npcContinuity` em visitas a estabelecimentos já conhecidos: trechos das cenas anteriores, nomes dos vendedores identificados e fatos do comércio.
- O Gemini deve **reutilizar o nome e histórico do mesmo comerciante** quando o personagem retorna à mesma loja.
- Uma proteção adicional em `apply()` corrige a troca injustificada de nome em uma revisita quando existe um único comerciante identificado, e ajusta também os dados estruturados da resposta.
- A proteção **não** transforma dois comerciantes reais em um só: outra pessoa pode assumir o balcão se a narração indicar um novo empregado, substituição ou troca de proprietário.
- Comerciantes de lojas **diferentes** não são fundidos, e NPCs com nomes pessoais claramente diferentes não são fundidos só por trabalharem no mesmo lugar.
- A equivalência entre funções genéricas de estabelecimentos usa pistas de local; sem identificação confiável, o sistema prefere manter separados a inventar equivalências.

## NPCs incidentais continuam existindo
Os contatos ocasionais podem ser lembrados pelo histórico, fatos aceitos, `npcKnowledge` e `npcAgents`, quando pertinente. Apenas deixam de poluir o catálogo de relações ou as agendas individuais de grupos genéricos. A autonomia dos NPCs e suas obrigações permanece intacta.

## Campanha em andamento e limitações
A limpeza da **visualização** funciona imediatamente em campanhas antigas sem migração destrutiva. A normalização do estado privado acontece quando um novo turno é aceito. Isso preserva o personagem existente, suas memórias, progressão e eventos.

A proteção de identidade atua em casos bem definidos, mas não é um detector universal de qualquer troca sutil de identidade; episódios ambíguos devem ser revisados na campanha real.

A hospedagem gratuita Render continua usando um banco local temporário. **Exportar o JSON da campanha antes de atualizar** é a opção mais segura; o backup local do mesmo navegador oferece uma tentativa de recuperação, mas não é garantia.

## Testes
`test/relationship-npc-continuity.test.js` cobre guarnição e inimigos incidentais, combate sem vínculo, lojas distintas, reutilização de comerciante, novos funcionários, títulos/apelidos, relações importantes, leitura compatível com campanhas antigas e limites de conhecimento de NPC.
