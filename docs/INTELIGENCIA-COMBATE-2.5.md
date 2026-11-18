# SHINOBI 2.5.0 — Inteligência comprovada e combate mais exigente

## Problemas
- Inteligência dependia de atualizações opcionais do Gemini: estudar teoria, analisar conflitos e elaborar planos não bastavam para que o atributo deixasse de exibir “Não avaliado”.
- Combates contra grupos ou inimigos experientes podiam terminar em vitória automática e sem desgaste, mesmo para personagens iniciantes.

## Inteligência: efeito retroativo na campanha existente
`src/intelligence-evidence.js` avalia fatos **já aceitos** no histórico de narrações do Gemini, no desenvolvimento e nas Memórias Marcantes salvas. Só credita estudo teórico, investigação ou estratégia atribuídos ao protagonista. Mensagens escritas apenas pelo jogador, desejos de estudar, tentativas frustradas ou feitos dos NPCs não são suficientes.

A ficha reconstrói a avaliação **ao abrir**, sem exigir novo personagem, recomeçar a campanha ou alterar silenciosamente a origem. Uma nova cena aceita pode aprimorar a avaliação; classificações superiores já validadas nunca são reduzidas. A nota histórica é deliberadamente conservadora (máximo 3,5 sem avaliação adicional), e a interface descreve quantos estudos e planos embasaram o resultado. A nota é uma adaptação interna do RPG, não uma estatística oficial de Naruto.

## Combate
`src/combat-difficulty.js` gera antes da narração uma leitura de risco a partir de patentes confirmadas, experiência existente, quantidade de inimigos descrita e ações táticas concretas. O Gemini recebe essa avaliação no contexto e instruções reforçadas no sistema.

Depois da resposta do Gemini, o motor verifica se foi descrita uma vitória implausível. Contra grupos e patentes muito superiores, uma vitória fácil de um iniciante **sem estratégia demonstrada** pode ser vetada e transformada em pressão ou necessidade de retirada/ajuda, sem atribuir ações voluntárias ao jogador. Propostas de missões concluídas, técnicas aprendidas ou promoções derivadas desse resultado indevido também são removidas. O desgaste de energia cresce em condições desfavoráveis mesmo sem vitória.

Uma estratégia com isca, cobertura, terreno, separação do grupo, defesa ou coordenação **pode** melhorar as chances, sem garantir sucesso. Um duelo equilibrado não deve ser bloqueado arbitrariamente; o jogador mantém suas escolhas. A IA evita descrições gráficas de violência.

## Campanhas atuais e armazenamento
A ficha passa a avaliar a Inteligência de uma campanha **já existente**, desde que os registros pertinentes ainda constem do histórico. Nenhum dado da campanha de um usuário foi acessado pelos desenvolvedores: os testes usam uma campanha fictícia semelhante.

A Render gratuita armazena SQLite num contêiner potencialmente efêmero. Uma publicação pode apagar a cópia no servidor. Nesta versão, `public/app.js` tenta restaurar automaticamente o backup do **mesmo aparelho/navegador**, mas somente se o servidor estiver sem campanha e o ID do backup coincidir com o ID anteriormente ativo. Encerrar voluntariamente uma campanha limpa essa referência. O backup local não é garantia: dados do navegador limpos ou outro navegador podem impossibilitar a restauração. **Exportar um arquivo JSON** é a proteção mais confiável.

## Testes
`test/intelligence-combat.test.js` cobre estudos históricos, estratégias, falsos registros, preservação de avaliações, campanhas em andamento, desvantagem numérica, superioridade de patente, vitória com plano, energia, técnicas indevidas, ajuda de aliados e restauração local. O CI também executa os testes antigos e a interface móvel.

## Limites conhecidos
- Avaliações dependem de evidência textual suficientemente clara; alusões vagas à inteligência continuam sem nota.
- Dificuldade de combate é determinística e conservadora; o motor ainda não é um simulador físico de cada técnica e cada oponente.
- O sistema não reescreve cenas antigas. O rigor adicional se aplica **às próximas lutas**; o histórico antigo serve apenas para avaliação retrospectiva.
