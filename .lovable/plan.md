# Plano

A aba está vazia porque a tela tenta buscar `message_sequences` com `group_campaigns(name)`, mas o backend responde erro `PGRST200` dizendo que não existe relacionamento entre essas tabelas no cache da API. Eu confirmei também que este grupo (`FN | Grupo Captação`) ainda tem 5 sequências gravadas no banco, então os dados não sumiram.

## O que vou fazer

1. Ajustar o hook `useSequences` para não depender desse join com `group_campaigns(name)` no carregamento principal das sequências.
2. Manter o filtro por `group_campaign_id` para a aba da campanha continuar listando normalmente as sequências do grupo atual.
3. Preservar o nome da campanha apenas onde ele for realmente necessário, usando uma estratégia segura que não quebre a listagem quando o relacionamento não estiver disponível.
4. Validar que a aba `Sequências` volte a mostrar as 5 sequências já existentes nesse grupo e que os seletores que usam `useSequences("all")` continuem funcionando.

## Detalhes técnicos

- Arquivo principal: `src/hooks/useSequences.ts`
- Problema atual:
  - query: `select("*, group_campaigns(name)")`
  - erro retornado pela API: `Could not find a relationship between 'message_sequences' and 'group_campaigns'`
- Evidência no banco:
  - `message_sequences` possui 5 registros para `group_campaign_id = d035c387-023d-4d64-b1e4-1aae269b3de7`
  - não existe foreign key ativa em `message_sequences` apontando para `group_campaigns`
- Abordagem mais segura agora:
  - remover a dependência do join quebrado no hook para restaurar a UI imediatamente
  - se necessário, buscar nomes de campanha separadamente em uma segunda consulta apenas para o modo `all`

## Resultado esperado

- A aba `Sequências` deixa de aparecer vazia.
- As sequências existentes voltam a ser exibidas.
- A opção de acionar sequência de outra campanha continua funcionando sem derrubar a listagem.