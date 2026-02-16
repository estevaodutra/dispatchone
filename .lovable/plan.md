
# Adicionar botao e indicador de operadores no banner da Fila

## O que muda

O banner de status da fila vai ganhar duas melhorias:

1. **Indicador de operadores disponiveis** -- mostra quantos operadores estao online/disponiveis ao lado do status da fila (ex: "2 operadores disponiveis")
2. **Botao "Buscar operadores"** -- permite forcar uma atualizacao imediata do status dos operadores e da fila, resolvendo o problema de ficar preso em "aguardando operador" quando ja existem operadores disponiveis

## Como vai funcionar

O banner passara a exibir:
- O status atual da fila (como ja funciona)
- Um chip/badge mostrando quantos operadores estao disponiveis (ex: "3 disponiveis" em verde, ou "0 disponiveis" em vermelho)
- Um botao compacto "Buscar operadores" que ao ser clicado:
  - Invalida os caches de operadores e estado da fila
  - Forca uma re-busca imediata dos dados
  - Mostra feedback visual (spinner enquanto carrega)

## Detalhes tecnicos

### Arquivo: `src/pages/CallPanel.tsx`

**Componente `QueueStatusBanner`**:
- Receber `operators` (lista de operadores) e uma funcao `onRefresh` como props adicionais
- Calcular operadores disponiveis (`status === 'available'`)
- Exibir badge com contagem de operadores disponiveis
- Adicionar botao "Buscar operadores" com icone `RefreshCw` que chama `onRefresh`

**Componente principal `CallPanel`**:
- Usar o hook `useCallOperators` que ja esta importado para obter a lista de operadores
- Criar funcao `handleRefreshQueue` que invalida as queries `call_operators` e `queue_execution_state_all`
- Passar operadores e funcao de refresh para o `QueueStatusBanner`

### Arquivos modificados

| Arquivo | Mudanca |
|---|---|
| `src/pages/CallPanel.tsx` | Adicionar indicador de operadores e botao de refresh no `QueueStatusBanner`; passar dados de operadores do componente pai |

Nenhuma mudanca no backend e necessaria -- os dados de operadores ja estao disponiveis via `useCallOperators`.
