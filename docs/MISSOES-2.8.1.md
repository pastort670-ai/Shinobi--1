# Shinobi 2.8.1 — Registro de missões resistente a variações da narração

## Falha recorrente e causa
O Shinobi 2.8.0, embora já recuperasse algumas conclusões de Missões e Memórias Marcantes, ainda dependia de padrões rígidos do texto narrativo e de um campo **opcional** do Gemini. Concluir uma missão não garante que uma frase tenha exatamente a forma “Kaien concluiu a missão rank D”. Em outras histórias, o NPC responsável aprova um relatório, reconhece os objetivos cumpridos ou confirma o resultado da missão sem repetir o rank. A ficha, então, podia permanecer zerada.

Havia ainda um problema de associação: uma missão de outro NPC mencionada durante a história podia influenciar o rank da missão ativa do protagonista. Missões sucessivas do mesmo rank precisavam ser diferenciadas, mesmo quando ocorrem no mesmo dia.

## Correções
1. **Confirmações narrativas equivalentes**: o reconciliador reconhece aceitação/aprovação de relatório final e objetivos atingidos, sempre exigindo evidência do vínculo com a missão do protagonista ou de sua equipe. Uma afirmação isolada do jogador não conta.
2. **Atribuição estável**: rastreia a missão aceita e seu rank a partir de cenas vinculadas ao protagonista. Tarefas atribuídas a Kakashi e outros NPCs não substituem uma atribuição de Kaien.
3. **Eventos estruturados**: o Gemini é instruído a enviar `missionAssignment` e `missionCompletion` ao atribuir ou concluir uma missão confirmada. Os eventos com título, rank e evidência literal são validados e persistem em mensagens aceitas, constituindo rastros independentes da interface. A reconciliação usa apenas informações compatíveis com a história — não aceita eventos contraditórios ou sem evidência textual.
4. **Reconstituição retrospectiva**: as missões anteriores podem ser recuperadas ao abrir a ficha, por narrações aceitas, Memórias Marcantes salvas e pendências de missão marcadas `done` com texto comprobatório. Isso não reescreve o passado nem reinicia a ficha.
5. **Deduplicação com contexto**: conclusões repetidas da mesma atribuição não multiplicam contadores; duas missões distintas recebidas em sequência contam individualmente. Missões no hospital e na biblioteca, por exemplo, não são confundidas por ocorrerem no mesmo dia e terem o mesmo rank.
6. **Proteção contra falso positivo**: atribuições e conclusões de NPCs, tarefas burocráticas que não encerraram a missão, planos futuros e missões ainda em andamento não contam.

## Limites
O histórico pessoal da campanha de Kaien não foi acessado nesta implementação. Os testes reproduzem formas plausíveis das situações narradas pelo jogador. Se a conclusão real não estiver em uma cena aceita, nem em uma Memória Marcante salva ou tarefa concluída, a versão não pode inventá-la. Um exemplo do desfecho exato, ou um backup exportado, permitirá testar e verificar uma situação específica que ainda escape às regras.

## Segurança da campanha atual
A Render gratuita usa SQLite no sistema de arquivos efêmero. **Implantar uma nova versão pode apagar a instância do banco**. A atualização foi preparada e testada separadamente para não interromper a campanha em andamento. O usuário deve exportar a campanha em JSON (Mais opções → Exportar) e confirmar a existência do arquivo antes do novo deploy. O backup local do navegador pode ajudar, mas não é garantia de recuperação.

## Verificação
`test/mission-ledger-2-8-1.test.js` cobre aprovações de relatórios, missões sem rank, conclusão por objetivos, duas missões D no mesmo dia, repetição do mesmo relatório, missões de NPCs, tarefas propostas, Memórias Marcantes, status `done`, registros explícitos, regeneração e preservação da campanha. A suíte existente inclui testes da primeira falha de Kaien com missão nos armazéns.
