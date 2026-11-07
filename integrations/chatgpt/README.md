# Integração experimental SHINOBI ↔ ChatGPT

**Estado:** prova de conceito somente leitura. A versão em produção permanece intocada.

## O que foi implementado
- Ferramentas MCP `listar_campanhas`, `consultar_campanha` e `consultar_memorias`.
- Leitura direta do SQLite existente, sem chamadas ao Gemini ou à API da OpenAI.
- Isolamento por proprietário usando o hash do cookie já usado no servidor.
- Transporte MCP local por entrada/saída padrão (stdio). Não é um conector remoto instalável no ChatGPT.

## O que ainda NÃO funciona
- ChatGPT ainda não está conectado a este processo.
- Não há interface Shinobi dentro do ChatGPT.
- Não é possível enviar turnos ou salvar narrativa usando esta integração.
- O ChatGPT não executa automaticamente como narrador em segundo plano.

## Próxima etapa
Criar um servidor MCP remoto com autenticação OAuth, HTTPS e autorização de usuário, com ferramentas de leitura e escrita seguras. Testar primeiro em ambiente isolado. Depois construir interface com Apps SDK se houver suporte no plano/cliente. Não expor o banco nem um token administrativo na internet.

## Segurança
Não envie `SHINOBI_OWNER_HASH`, cookies, banco de dados ou chaves para GitHub. O hash deve ser obtido e configurado apenas no ambiente seguro. Não rode este experimento contra o banco de produção sem backup e controle de acesso. Não publique o processo stdio como serviço HTTP.

Este arquivo é um passo técnico inicial, não prova de compatibilidade com a interface de Apps do ChatGPT.
