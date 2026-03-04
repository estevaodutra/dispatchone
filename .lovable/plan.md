

## Mostrar todas as campanhas no dialog de remoção

### Problema
Linha 182: `campaignsWithQueue = campaigns.filter((c) => (queueCounts[c.id] || 0) > 0)` — só mostra campanhas que já têm itens na fila. Se a fila estiver vazia ou a query falhar, nenhuma campanha aparece para seleção.

### Solução
Mostrar **todas** as campanhas na lista, independente de terem itens na fila. Campanhas com 0 itens mostram "0 na fila" no badge. Isso permite ao usuário sempre ver e selecionar qualquer campanha.

### Alteração em `src/components/call-panel/RemoveFromQueueDialog.tsx`

**Linha 182**: Mudar de:
```typescript
const campaignsWithQueue = campaigns.filter((c) => (queueCounts[c.id] || 0) > 0);
```
Para:
```typescript
const campaignsWithQueue = campaigns;
```

**Linha 215**: Remover a condição `campaignsWithQueue.length > 0` — sempre mostrar a lista de campanhas (desde que `campaigns` tenha dados).

