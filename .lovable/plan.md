

## Plano: Corrigir hasChanged para backfill de metadados

### Problema raiz

O `hasChanged` (linha 199-202) só compara `event_type`, `classification` e `processing_status`. Para ~236k eventos onde o classificador retorna o **mesmo tipo** já salvo, `hasChanged = false` e o update nunca acontece — `matched_rule`, `direction`, `confidence` permanecem null/default indefinidamente.

### Dados confirmados

| event_type | count | Tipo correto? | matched_rule |
|---|---|---|---|
| image_message | 130,698 | Sim (body.image presente) | null |
| message_received | 41,042 | Sim (body.status=RECEIVED) | null |
| message_read | 22,604 | Sim | null |
| played | 22,039 | Sim | null |
| unknown | 515 | Não — vão ser corrigidos | null |

### Mudança (2 linhas)

**Arquivo:** `supabase/functions/reclassify-events/index.ts`

1. **Linha 153** — Adicionar `matched_rule` ao select:
```typescript
.select("id, source, raw_event, event_type, classification, processing_status, matched_rule")
```

2. **Linhas 199-202** — Adicionar condição de backfill:
```typescript
const hasChanged =
  event.event_type !== classification.eventType ||
  event.classification !== classification.classification ||
  event.processing_status !== expectedStatus ||
  !event.matched_rule;  // backfill: sempre atualizar se matched_rule está vazio
```

Mesma correção no select do single event (linha 58).

### Resultado esperado

Após deploy e execução dos batches:
- ~515 `unknown` → corrigidos para tipo real
- ~236k eventos com tipo correto → recebem `matched_rule`, `direction`, `confidence`
- Todos os 237k eventos terão `matched_rule IS NOT NULL`

