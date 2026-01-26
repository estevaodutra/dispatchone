

## Problema Identificado

Existem **26 eventos** onde `classification = 'identified'` mas `processing_status = 'pending'`. Isso acontece porque:

1. A condicao `hasChanged` na funcao `reclassify-events` **so verifica** se `event_type` ou `classification` mudaram
2. Se o evento ja esta classificado corretamente, mas com `processing_status` errado, ele **nao e atualizado**

## Solucao

Modificar a condicao `hasChanged` para tambem verificar a inconsistencia entre `classification` e `processing_status`.

## Arquivos a Modificar

| Arquivo | Linha | Acao |
|---------|-------|------|
| `supabase/functions/reclassify-events/index.ts` | 545-548 | Expandir condicao `hasChanged` |

## Mudanca Tecnica

### Atual (linhas 545-548):
```typescript
// Check if classification changed
const hasChanged = 
  event.event_type !== classification.eventType ||
  event.classification !== classification.classification;
```

### Proposto:
```typescript
// Check if classification changed OR if processing_status is inconsistent
const expectedStatus = classification.classification === "identified" ? "processed" : "pending";
const hasChanged = 
  event.event_type !== classification.eventType ||
  event.classification !== classification.classification ||
  event.processing_status !== expectedStatus;
```

## Resultado Esperado

Apos o deploy e executar "Reclassificar Tudo":
- Eventos com `classification: identified` e `processing_status: pending` serao corrigidos para `processing_status: processed`
- Os **26 eventos** inconsistentes serao atualizados

## Beneficios

1. Corrige todos os eventos atuais com status inconsistente
2. Previne futuros problemas caso haja alguma inconsistencia
3. Garante sincronizacao permanente entre `classification` e `processing_status`

