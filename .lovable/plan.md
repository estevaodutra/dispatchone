

## Objetivo
Adicionar classificacao para o status "READ" no payload Z-API, classificando como `message_read`.

## Analise do Payload

```json
{
  "body": {
    "type": "MessageStatusCallback",
    "status": "READ",
    "ids": ["3EB03E2342014BBAC03265", ...]
  }
}
```

Este e um callback de status de mensagem indicando que a mensagem foi **lida** pelo destinatario.

## Arquivos a Modificar

| Arquivo | Linha | Acao |
|---------|-------|------|
| `supabase/functions/webhook-inbound/index.ts` | ~214 | Adicionar `READ` |
| `supabase/functions/reclassify-events/index.ts` | ~206 | Adicionar `READ` |
| `src/pages/WebhookEvents.tsx` | ~34 | Adicionar `message_read` |
| `src/hooks/useWebhookEvents.ts` | ~51 | Adicionar `message_read` |

## Mudanca Tecnica

### Edge Functions (webhook-inbound e reclassify-events)

Apos o bloco de `RECEIVED`, adicionar:

```typescript
if (bodyStatus === "READ") {
  return {
    eventType: "message_read",
    eventSubtype: "READ",
    classification: "identified",
  };
}
```

### UI - WebhookEvents.tsx (EVENT_TYPES)

**De:**
```typescript
"message_status", "message_reaction", "message_revoked", "message_received",
```

**Para:**
```typescript
"message_status", "message_reaction", "message_revoked", "message_received", "message_read",
```

### UI - useWebhookEvents.ts (EVENT_CATEGORIES)

**De:**
```typescript
messages: [
  "text_message", "image_message", "video_message", "audio_message",
  "document_message", "sticker_message", "location_message", "contact_message",
  "message_status", "message_reaction", "message_revoked", "message_received",
  "played",
],
```

**Para:**
```typescript
messages: [
  "text_message", "image_message", "video_message", "audio_message",
  "document_message", "sticker_message", "location_message", "contact_message",
  "message_status", "message_reaction", "message_revoked", "message_received", "message_read",
  "played",
],
```

## Resultado Esperado

Eventos com payload:
```json
{
  "body": {
    "type": "MessageStatusCallback",
    "status": "READ"
  }
}
```

Serao classificados como:
- `event_type`: `message_read`
- `event_subtype`: `READ`
- `classification`: `identified`
- `processing_status`: `processed`

## Apos Implementacao

1. Edge Functions serao redeployadas automaticamente
2. Novos eventos com `body.status === "READ"` serao identificados
3. Use "Reclassificar Todos" para corrigir eventos antigos

