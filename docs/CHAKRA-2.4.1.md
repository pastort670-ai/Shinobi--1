# SHINOBI 2.4.1 — Equilíbrio e recuperação de chakra

## Problema resolvido

Antes, o motor simplesmente somava o campo `chakraDelta` retornado pelo Gemini ao valor interno da reserva. Se o modelo descontasse chakra repetidamente ou não sugerisse valores positivos depois de descansar, o personagem permanecia esgotado.

Nesta versão, **o motor decide quanto chakra é efetivamente gasto ou recuperado** com base nos fatos da campanha. O Gemini permanece como narrador e propõe o custo de uma técnica, mas sua estimativa está sujeita a validação.

## Regras implementadas

- **Gastos dependem do personagem:** domínio de Ninjutsu/Genjutsu, experiência, talento excepcional, grande reserva e controle de chakra já estabelecidos podem reduzir o gasto. Um efeito poderoso continua exigente, mesmo com personagem muito habilidoso.
- **Somente uso confirmado é cobrado:** diálogo normal, deslocamento simples e jutsus executados apenas por NPCs não drenam a reserva do protagonista porque o modelo sugeriu um número negativo.
- **Recuperação por descanso comprovado:** quando a narração aceita confirma que o personagem dormiu, descansou ou meditou, as horas realmente transcorridas restauram chakra. Uma pausa breve restaura pouco; um sono longo restaura mais.
- **Proporcional ao esforço anterior:** o registro `chakraStrain` acompanha a exaustão causada por usos significativos. Após esforço muito intenso, a recuperação é gradual; usos leves se recuperam mais rápido.
- **Recuperação passiva:** quando horas passam em segurança, a reserva se recompõe lentamente mesmo se o Gemini retornar `chakraDelta: 0`. Jornadas de treinamento intenso recuperam menos que períodos tranquilos.
- **Sem regeneração gratuita durante combate:** turnos classificados como combate não recebem recuperação por descanso ou tempo passivo.
- **Bônus de reposição confirmada:** a narração pode conceder pequena reposição por ajuda explícita, limitada por turno. Menções ou intenções sem resultado confirmado não bastam.
- **Tempo sincronizado:** as taxas utilizam `actualTime`, inclusive interrupções de saltos temporais; horas não transcorridas não geram recuperação.
- **Ficha descritiva preservada:** o usuário continua vendo estados de chakra como “reserva reduzida” e “reserva completa”. O novo texto `chakraActivity` explica sucintamente a mudança sem revelar números internos.

## Compatibilidade

Campanhas antigas não possuem `chakraStrain`; o motor assume o valor inicial neutro quando o campo está ausente. A nova propriedade passa a ser salva junto à campanha. A regeneração reconstruída usa os turnos aceitos e mantém a semântica de regeneração/checkpoint existente.

## Validação

`test/chakra-recovery.test.js` cobre conversas, técnicas comuns/intensas, autonomia de NPCs, maior domínio de chakra, descanso, sono, passagem segura, treino, fadiga, efeito de cura, interrupções e compatibilidade com saves antigos.

Esta escala é uma **regra de equilíbrio para o RPG**, não uma fórmula extraída de um databook oficial. Precisará de observação em campanha real para calibrar as taxas.

A hospedagem Render gratuita usa banco local temporário; antes de novos testes, exportar backup de qualquer campanha importante.
