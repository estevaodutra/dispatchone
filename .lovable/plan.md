

## Objetivo
Adicionar classificação para o status "RECEIVED" no payload Z-API, classificando como `message_received`.

## Análise do Payload

```json
{
  "body": {
    "type": "MessageStatusCallback",
    "status": "RECEIVED"
  }
}
```

Este é um callback de status de mensagem indicando que a mensagem foi **recebida** pelo destinatário.

## Arquivos a Modificar

| Arquivo | Linha | Acao |
|---------|-------|------|
| `supabase/functions/webhook-inbound/index.ts` | 203-209 | Adicionar `RECEIVED` |
| `supabase/functions/reclassify-events/index.ts` | ~120 | Adicionar `RECEIVED` |

## Mudanca Tecnica

**De (linhas 199-209):**
```typescript
// Check for played events (audio/video played by recipient)
// Z-API sends status directly in body.status when body.type === "MessageStatusCallback"
const bodyStatus = body?.status as string | undefined;

if (bodyStatus === "PLAYED") {
  return {
    eventType: "played",
    eventSubtype: "PLAYED",
    classification: "identified",
  };
}
```

**Para:**
```typescript
// Check for message status callbacks (PLAYED, RECEIVED, etc.)
// Z-API sends status directly in body.status when body.type === "MessageStatusCallback"
const bodyStatus = body?.status as string | undefined;

if (bodyStatus === "PLAYED") {
  return {
    eventType: "played",
    eventSubtype: "PLAYED",
    classification: "identified",
  };
}

if (bodyStatus === "RECEIVED") {
  return {
    eventType: "message_received",
    eventSubtype: "RECEIVED",
    classification: "identified",
  };
}
```

## Adicionar ao EVENT_TYPES (UI)

Sera necessario adicionar `message_received` ao array de tipos de eventos em:
- `src/pages/WebhookEvents.tsx` (EVENT_TYPES array)
- `src/hooks/useWebhookEvents.ts` (getEventTypeColor function)

## Resultado Esperado

Eventos com payload:
```json
{
  "body": {
    "type": "MessageStatusCallback",
    "status": "RECEIVED"
  }
}
```

Serao classificados como:
- `event_type`: `message_received`
- `event_subtype`: `RECEIVED`
- `classification`: `identified`
- `processing_status`: `processed`

## Apos Implementacao

1. Edge Functions serao redeployadas automaticamente
2. Novos eventos com `body.status === "RECEIVED"` serao identificados
3. Use "Reclassificar Todos" para corrigir eventos antigos

