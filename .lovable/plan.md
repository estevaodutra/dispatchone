

## Problema

O evento `54002eae` já está salvo corretamente como `poll_response` no banco de dados, mas o modal na UI continua mostrando `image_message`. Isso acontece porque o React Query retorna dados cacheados da lista (que tinha o valor antigo) antes da refetch por ID completar.

## Causa raiz

O `useWebhookEventById` usa `queryKey: ["webhook-event", id]`, que é diferente da lista (`["webhook-events", ...]`). Porém, quando o usuário clica numa linha, o React Query pode servir dados stale instantaneamente enquanto a refetch acontece em background. Se o modal renderiza antes da refetch completar, mostra o valor antigo.

Além disso, após o "Reclassificar Tudo", a lista em si não é atualizada (a cache da lista mantém `image_message`), então mesmo que o `useWebhookEventById` busque o dado correto, a lista continua mostrando o tipo antigo.

## Solução

### 1. Forçar dados frescos no `useWebhookEventById`
- Em `src/hooks/useWebhookEvents.ts`, adicionar `staleTime: 0` ao hook `useWebhookEventById` para garantir que sempre busque do banco.

### 2. Invalidar cache da lista após reclassificação
- Em `src/pages/WebhookEvents.tsx`, no `handleReclassifyAll`, após o loop, invalidar explicitamente o query cache da lista de eventos usando `queryClient.invalidateQueries`.

### 3. Invalidar cache ao abrir modal
- Quando `selectedEventId` muda, invalidar o cache do evento individual para forçar refetch.

### Arquivos

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useWebhookEvents.ts` | Adicionar `staleTime: 0` no `useWebhookEventById` |
| `src/pages/WebhookEvents.tsx` | Invalidar queries após reclassificação e ao abrir modal |

