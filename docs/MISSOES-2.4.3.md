# Shinobi 2.4.3 — Memórias Marcantes também contam missões

## Falha reproduzida pelo usuário
A ficha mostrava 0 missões em todas as categorias, embora a aba Memórias Marcantes registrasse que **Kaien concluiu uma missão de rank D nos armazéns** e retornou ao Hokage. Havia várias memórias sobre a mesma missão.

## Causa
A versão 2.4.2 reconciliava `c.messages` e entradas do Databook, mas ignorava `c.memories`. Portanto, campanhas com registros confirmados em Memórias Marcantes — especialmente quando a mensagem original não estava disponível — podiam continuar zeradas.

## Solução
- Recuperar conclusões comprovadas de `memories` com `status === 'saved'`, tanto em `databookView` como na persistência do turno.
- Identificar rank D/C/B/A/S, sem supor classificação onde ela não foi registrada.
- Deduplicar descrições da mesma missão guardadas em várias memórias. A avaliação de Kaien dos screenshots resulta em **1 missão de rank D**, não em três.
- Ignorar propostas de missão e a conclusão de burocracia antes da atribuição, assim como sucessos exclusivos de NPCs, frases negadas e memórias não salvas.
- Evitar efeito colateral na simples leitura da ficha; a fonte original salva continua sendo a memória, e um registro memorizado descartado não deve continuar contando.
- Compatível com backups e histórico de campanhas anteriores. Não inventa missões ausentes de todas as fontes.

## Verificação
`test/mission-reconciliation.test.js` incorpora explicitamente uma campanha fictícia Kaien com as cinco descrições das imagens, além de testes de memórias descartadas, missões diferentes com mesmo rank, atualização de classificação, exclusão e proteção contra duplicações.

A implementação não consulta as campanhas privadas do usuário — o teste reproduz apenas os registros textuais mostrados nas capturas.

## Publicação e backup
O serviço atual usa hospedagem gratuita Render e armazenamento de campanha potencialmente temporário. Publicar uma versão pode reiniciar o contêiner e afetar dados não exportados. Faça backup por **Mais opções → Exportar campanha** antes da atualização. Os backups locais também podem ser recuperados no navegador, mas podem desaparecer com a limpeza dos dados do aparelho.
