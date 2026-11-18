# SHINOBI 2.4.0 — Ficha estilo Naruto Databook

## Objetivo
Ficha no formato dos oito atributos dos databooks: **Ninjutsu, Taijutsu, Genjutsu, Inteligência, Força, Velocidade, Resistência e Selos de mão**. O gráfico octogonal original foi construído com SVG e se adapta à tela do celular, com legendas e opção de exibir notas de **0,5 a 5**.

## Preservação do Shinobi
- Idade original, nome, origem e as demais características travadas da criação permanecem intactas.
- Energia e reservas de chakra continuam separadas dos atributos, sem confundir stamina com reserva atual.
- Avaliações desconhecidas exibem **Não avaliado**, sem uma nota fictícia para um personagem que ainda não demonstrou a habilidade.
- Os 3 parâmetros já existentes (ninjutsu, taijutsu e genjutsu) são estimados a partir do progresso interno aceito do motor; se não houver progresso mensurado, não são tratados como fracasso.
- Os outros 5 podem receber avaliações apenas com sugestão do narrador, incluindo trecho literal da nova cena que identifique uma ação ou conquista do protagonista. O motor verifica essa evidência e limita alterações (máximo 2 atualizações por turno; nota inicial no máximo 2,5; aumento máximo 0,5 por nova avaliação).
- A ficha exibe descrições por padrão; a opção numérica é uma preferência local no aparelho.
- Um histórico registra quando avaliações mudam, sem inventar valores para turnos antigos.

## Missões
A ficha separa as contagens de **D, C, B, A e S**. O novo registro soma uma missão apenas se o narrador fornecer evidência literal de conclusão de missão com rank explícito atribuída ao personagem; não conta planos, pedidos, missões alheias ou tarefas sem rank. Como versões anteriores não acompanhavam esse registro estruturado, as missões anteriores não são presumidas retroativamente. O contador zero significa **nenhuma conclusão registrada pelo módulo**, não necessariamente nenhuma missão na biografia.

## IA especialista e narrador
O Gemini continua como narrador principal. Ele pode sugerir avaliações e missões por campos opcionais em JSON; o motor valida antes de salvar. A IA especialista desenvolvida na versão 2.3.0 permanece ativa e consulta os novos dados da ficha quando prepara o contexto.

## Compatibilidade e reversão
O módulo `src/databook.js` trabalha também com campanhas antigas que não tenham `databook`. A avaliação é reconstruída sem modificar a campanha apenas por abrir a ficha. Novos registros ficam salvos no estado da campanha, permitindo backup/importação por JSON e regeneração a partir do checkpoint anterior.

## Limites e testes
- As escalas internas são adaptações de RPG inspiradas nos databooks, **não** notas oficiais atribuídas por Kishimoto aos personagens criados.
- O cálculo por progressão existente é aproximado e pode ser aprimorado depois de testes de jogabilidade.
- A atualização de rankings e de missões não envolve consulta ao vivo de fontes oficiais; a biblioteca já existente continua sendo a base de conhecimento do mundo.
- Testes automatizados: `test/databook.test.js` cobre atributos, escala, isolamento de NPCs, evidências, progresso, compatibilidade, missões e recuperação.
- O serviço gratuito Render utiliza armazenamento temporário. Fazer backup da campanha antes de atualizações é recomendado.
