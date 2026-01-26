

## Objetivo
Adicionar classificacao para o status "READ_BY_ME" no payload Z-API, classificando como `read_by_me`.

## Analise do Payload

```json
{
  "body": {
    "type": "MessageStatusCallback",
    "status": "READ_BY_ME",
    "ids": ["3EB0C550890974274E67B8"]
  }
}
```

Este e um callback de status de mensagem indicando que **voce leu** a mensagem recebida.

## Arquivos a Modificar

| Arquivo | Linha | Acao |
|---------|-------|------|
| `supabase/functions/webhook-inbound/index.ts` | ~226 | Adicionar `READ_BY_ME` |
| `supabase/functions/reclassify-events/index.ts` | ~218 | Adicionar `READ_BY_ME` |
| `src/pages/WebhookEvents.tsx` | ~34 | Adicionar `read_by_me` |
| `src/hooks/useWebhookEvents.ts` | ~51 | Adicionar `read_by_me` |

## Mudanca Tecnica

### Edge Functions (webhook-inbound e reclassify-events)

Apos o bloco de `READ`, adicionar:

```typescript
if (bodyStatus === "READ_BY_ME") {
  return {
    eventType: "read_by_me",
    eventSubtype: "READ_BY_ME",
    classification: "identified",
  };
}
```

### UI - WebhookEvents.tsx (EVENT_TYPES)

**De:**
```typescript
"message_status", "message_reaction", "message_revoked", "message_received", "message_read",
```

**Para:**
```typescript
"message_status", "message_reaction", "message_revoked", "message_received", "message_read", "read_by_me",
```

### UI - useWebhookEvents.ts (EVENT_CATEGORIES)

**De:**
```typescript
messages: [
  "text_message", "image_message", "video_message", "audio_message",
  "document_message", "sticker_message", "location_message", "contact_message",
  "message_status", "message_reaction", "message_revoked", "message_received", "message_read",
  "played",
],
```

**Para:**
```typescript
messages: [
  "text_message", "image_message", "video_message", "audio_message",
  "document_message", "sticker_message", "location_message", "contact_message",
  "message_status", "message_reaction", "message_revoked", "message_received", "message_read", "read_by_me",
  "played",
],
```

## Resultado Esperado

Eventos com payload:
```json
{
  "body": {
    "type": "MessageStatusCallback",
    "status": "READ_BY_ME"
  }
}
```

Serao classificados como:
- `event_type`: `read_by_me`
- `event_subtype`: `READ_BY_ME`
- `classification`: `identified`
- `processing_status`: `processed`

## Apos Implementacao

1. Edge Functions serao redeployadas automaticamente
2. Novos eventos com `body.status === "READ_BY_ME"` serao identificados
3. Use "Reclassificar Todos" para corrigir eventos antigos

