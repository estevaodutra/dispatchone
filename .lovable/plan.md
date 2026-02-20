
# Corrigir chamadas travadas em "Discando"

## Problema

Existem dezenas de chamadas travadas no status "Discando" (dialing) que nunca foram atendidas -- provavelmente de antes da correcao do `operator_unavailable`. O botao "Cancelar" em massa nao funciona para elas porque so aceita chamadas com status `scheduled` ou `ready`.

## Solucao

### Arquivo: `src/pages/CallPanel.tsx` (linha 689)

Expandir o filtro do botao "Cancelar" em massa para incluir tambem chamadas com status `dialing` e `ringing`:

```typescript
// De:
const toCancel = paginatedEntries.filter(e => selectedIds.has(e.id) && ["scheduled", "ready"].includes(e.callStatus));

// Para:
const toCancel = paginatedEntries.filter(e => selectedIds.has(e.id) && ["scheduled", "ready", "dialing", "ringing"].includes(e.callStatus));
```

### Arquivo: `src/hooks/useCallPanel.ts` -- mutacao `cancelCall`

Verificar que a mutacao `cancelCall` tambem libera o operador vinculado (limpa `current_call_id`, reseta status para `available`) e reverte o lead para `pending` quando uma chamada em `dialing` e cancelada. Isso garante que os operadores travados sejam liberados junto com o cancelamento.

Com essa mudanca, o usuario pode selecionar todas as chamadas "Discando" e cancelar em massa, liberando os operadores e limpando a fila.
