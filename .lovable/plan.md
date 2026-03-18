

## Fix: Reclassificação em lote não alcança eventos incorretos

### Problema
A reclassificação em lote processa no máximo 1000 eventos ordenados por `id ASC`. Se o evento incorreto (`4d6709dc`) não está entre os primeiros 1000, ele nunca é alcançado. Os 1000 processados já estavam corretos, por isso o resultado foi "reclassified: 0".

### Solução

**`supabase/functions/reclassify-events/index.ts`**

1. Quando chamado sem filtros (`onlyPending`/`onlyUnknown`), priorizar eventos que provavelmente estão errados:
   - Filtrar por `event_type = 'image_message'` primeiro (os que foram incorretamente classificados), depois processar o restante
   
2. Alternativa mais simples e eficaz: **aumentar o limite de 1000 para 5000** e adicionar um filtro inteligente — na reclassificação geral, excluir eventos com `processing_status = 'processed'` E `classification = 'identified'` que já passaram pela versão mais recente (usar um campo como `processed_at` recente como indicador).

3. **Abordagem escolhida** (menor risco): Quando nenhum filtro é passado, filtrar apenas eventos que tenham `event_type IN ('image_message', 'unknown', 'text_message')` — os tipos que historicamente foram mal classificados. Isso garante que os 1000 slots sejam usados em eventos que realmente precisam de revisão.

### Mudança concreta

No loop de batch (linha ~617), quando `!onlyPending && !onlyUnknown`, adicionar filtro:
```typescript
// Priorizar eventos potencialmente mal classificados
if (!onlyPending && !onlyUnknown) {
  query = query.in("event_type", ["image_message", "unknown", "text_message"]);
}
```

Isso faz com que a reclassificação foque nos eventos que podem estar errados, em vez de desperdiçar os 1000 slots em eventos já corretos (como `read_by_me`, `message_status`, etc.).

### Arquivo

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/reclassify-events/index.ts` | Filtrar batch por tipos potencialmente incorretos |

