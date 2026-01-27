

## Correção: Priorizar Eventos Pendentes na Reclassificação

### Problema Identificado

A query do batch processing ordena por `received_at DESC` e limita a 1000 registros. Isso significa que:

- Os **39 eventos `unknown/pending`** são antigos e ficam fora do limite de 1000
- Os **26 eventos `identified` mas `pending`** também podem estar fora
- Por isso "Reclassificar Tudo" processa 1000 eventos mas altera 0

### Solução

Alterar a query do batch para priorizar eventos que precisam de correção:

```text
Ordenação: 
1. Primeiro: eventos com classification = 'pending' OU processing_status != expectedStatus
2. Depois: por received_at DESC
```

Mas como SQL não permite ordenação condicional complexa facilmente, a solução mais simples é:

**Opção A (Recomendada):** Remover o limite de 1000 quando `onlyPending` ou `onlyUnknown` estiver ativo

**Opção B:** Fazer múltiplas queries - primeiro os pending/unknown, depois os recentes

### Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/reclassify-events/index.ts` | Mudar a query para processar eventos `pending`/`unknown` primeiro, ou processar todos quando houver filtro ativo |

### Mudança Técnica

```typescript
// Linha 597-602 - Query atual
let query = supabase
  .from("webhook_events")
  .select("id, source, raw_event, event_type, classification, processing_status")
  .eq("user_id", user.id);

// Se não tem filtros específicos, priorizar pendentes
if (!onlyPending && !onlyUnknown) {
  // Primeiro processar os pending/unknown (até 1000)
  query = query
    .or("classification.eq.pending,processing_status.eq.pending")
    .order("received_at", { ascending: false })
    .limit(1000);
} else {
  // Com filtros, aplicar filtros e aumentar limite
  if (onlyPending) {
    query = query.eq("classification", "pending");
  }
  if (onlyUnknown) {
    query = query.eq("event_type", "unknown");
  }
  query = query
    .order("received_at", { ascending: false })
    .limit(5000); // Aumentar limite quando tem filtro
}
```

### Alternativa Mais Simples

Mudar a ordenação padrão para priorizar `classification = 'pending'` primeiro:

```typescript
// Ordenar para que pending venham primeiro
query = query
  .order("classification", { ascending: true }) // 'pending' < 'identified' alfabeticamente
  .order("received_at", { ascending: false })
  .limit(1000);
```

### Resultado Esperado

Ao clicar "Reclassificar Tudo":
- Os 39 eventos `unknown/pending` serão processados primeiro
- Os 26 eventos `identified/pending` também serão corrigidos
- Resultado: ~65 eventos alterados em vez de 0

