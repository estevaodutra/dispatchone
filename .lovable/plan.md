

## Corrigir: Erro ao reagendar a partir do diálogo de lead na fila

### Diagnóstico
O console mostra: `invalid input syntax for type uuid: ""`. O `CallActionDialog` é aberto com `callId=""` quando o lead vem da fila (linha 1685 de `CallPanel.tsx`). O `InlineReschedule` tenta fazer `UPDATE call_logs WHERE id = ""`, que falha.

### Solução

**Arquivo: `src/components/operator/CallActionDialog.tsx` (linha ~459)**

Condicionar a renderização do `InlineReschedule` para só aparecer quando `currentData.callId` é um UUID válido (não vazio). Quando o callId está vazio (lead na fila, sem call_log), não faz sentido reagendar — não existe registro de ligação para atualizar.

Alterar de:
```tsx
<InlineReschedule callId={currentData.callId} />
```
Para:
```tsx
{currentData.callId && <InlineReschedule callId={currentData.callId} />}
```

Isso oculta a seção de reagendamento quando não há ligação ativa, evitando o erro.

