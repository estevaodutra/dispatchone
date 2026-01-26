

# Plano: Adicionar "played" e "reaction" às Listas de Tipos de Evento

## Problema

As Edge Functions estão classificando eventos como "played" e "reaction", mas esses tipos não aparecem no filtro da UI porque não foram adicionados às listas de tipos de evento no frontend.

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `src/pages/WebhookEvents.tsx` | Adicionar "played" e "reaction" na lista EVENT_TYPES |
| `src/hooks/useWebhookEvents.ts` | Adicionar "played" e "reaction" nas categorias EVENT_CATEGORIES |

---

## Mudanças

### 1. `src/pages/WebhookEvents.tsx` (linha 31-40)

Adicionar os novos tipos à lista EVENT_TYPES:

```typescript
const EVENT_TYPES = [
  "text_message", "image_message", "video_message", "audio_message",
  "document_message", "sticker_message", "location_message", "contact_message",
  "message_status", "message_reaction", "message_revoked",
  "button_response", "list_response", "poll_response",
  "group_join", "group_leave", "group_promote", "group_demote", "group_update",
  "connection_status", "qrcode_update",
  "call_received",
  "reaction",    // NOVO
  "played",      // NOVO
  "unknown",
];
```

### 2. `src/hooks/useWebhookEvents.ts` (linha 47-58)

Adicionar os novos tipos às categorias apropriadas:

```typescript
const EVENT_CATEGORIES: Record<string, string[]> = {
  messages: [
    "text_message", "image_message", "video_message", "audio_message",
    "document_message", "sticker_message", "location_message", "contact_message",
    "message_status", "message_reaction", "message_revoked",
    "played",  // NOVO - indicador de áudio/vídeo reproduzido
  ],
  interactive: ["button_response", "list_response", "poll_response", "reaction"],  // NOVO
  groups: ["group_join", "group_leave", "group_promote", "group_demote", "group_update"],
  connection: ["connection_status", "qrcode_update"],
  calls: ["call_received"],
  pending: ["unknown"],
};
```

---

## Categorização dos Novos Tipos

| Tipo | Categoria | Justificativa |
|------|-----------|---------------|
| `played` | messages | Indica que o destinatário reproduziu uma mensagem de áudio/vídeo |
| `reaction` | interactive | É uma interação do usuário com uma mensagem (emoji) |

---

## Resultado

Após as mudanças:
1. Os tipos "played" e "reaction" aparecerão no dropdown de filtro
2. Os badges terão cores apropriadas baseadas na categoria
3. A função `getEventCategory()` retornará a categoria correta para os novos tipos

