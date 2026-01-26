

# Plano: Sincronizar processing_status com classification

## Contexto

Atualmente o sistema tem dois campos separados:
- **classification**: "identified" ou "pending" (se o tipo foi reconhecido)
- **processing_status**: sempre "pending" (não há processador implementado)

## Proposta

Atualizar automaticamente o `processing_status` baseado na `classification`:
- Se `classification = "identified"` → `processing_status = "processed"`
- Se `classification = "pending"` → `processing_status = "pending"`

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `supabase/functions/webhook-inbound/index.ts` | Definir processing_status dinamicamente |
| `supabase/functions/reclassify-events/index.ts` | Atualizar processing_status junto com classification |

---

## Mudanças Técnicas

### 1. Atualizar `webhook-inbound/index.ts` (linha 380)

Substituir:
```typescript
processing_status: "pending",
```

Por:
```typescript
processing_status: classification.classification === "identified" ? "processed" : "pending",
```

### 2. Atualizar `reclassify-events/index.ts`

Na atualização do evento (aproximadamente linha 130), adicionar atualização do processing_status:

```typescript
const { error: updateError } = await supabase
  .from("webhook_events")
  .update({
    event_type: newClassification.eventType,
    event_subtype: newClassification.eventSubtype,
    classification: newClassification.classification,
    processing_status: newClassification.classification === "identified" ? "processed" : "pending",  // NOVO
  })
  .eq("id", event.id);
```

---

## Resultado Esperado

| classification | processing_status |
|----------------|-------------------|
| identified | processed |
| pending | pending |

---

## Benefícios

1. Os eventos identificados aparecerão como "processed" na UI
2. Apenas eventos realmente não reconhecidos ficarão como "pending"
3. Consistência visual no dashboard

