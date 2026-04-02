

## Plano: Resetar status dos cards à meia-noite

### Problema

Atualmente, o cálculo de status dos nós (`nodeStatuses`) considera **todos os logs** do período de 72h. Para sequências recorrentes, um nó que foi enviado ontem continua aparecendo como "sent" (verde) hoje, quando deveria voltar a "scheduled" (cinza) à meia-noite.

### Alteração

**Arquivo: `src/components/group-campaigns/sequences/TimelineSequenceBuilder.tsx`**

Na função `nodeStatuses` (linhas 75-117), ao verificar os logs de um nó, filtrar apenas os logs de **hoje** usando `isToday(parseISO(log.sentAt))`:

```tsx
// Antes:
const nodeLogs = seqLogs.filter(l => l.nodeOrder === node.nodeOrder);

// Depois:
const nodeLogs = seqLogs.filter(l => l.nodeOrder === node.nodeOrder && isToday(parseISO(l.sentAt)));
```

Assim, à meia-noite todos os logs são de "ontem" e nenhum nó terá status "sent" — todos voltam para "scheduled" automaticamente.

### Resumo
- 1 arquivo, 1 linha alterada
- Logs de dias anteriores são ignorados no cálculo de status visual
- Nenhuma mudança no backend — é puramente visual/frontend

