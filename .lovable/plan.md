

## Problema Identificado

A detecção de imagem atual NÃO inclui o campo `body.photo` que o Z-API usa para enviar URLs de imagens.

**Payload do usuário:**
```json
{
  "body": {
    "photo": "https://pps.whatsapp.net/v/t61.24694-24/..."
  }
}
```

**Lógica atual (incompleta):**
```typescript
if (
  body?.image !== undefined ||
  body?.imageUrl !== undefined ||
  rawEvent.imageUrl !== undefined ||
  mimeType?.startsWith("image/")
) { ... }
```

O campo `body.photo` não está sendo verificado!

---

## Solução

Adicionar verificação para `body.photo` quando contém uma URL válida (começa com "https://").

---

## Arquivos a Modificar

| Arquivo | Linha | Ação |
|---------|-------|------|
| `supabase/functions/webhook-inbound/index.ts` | ~79-85 | Adicionar `body.photo` |
| `supabase/functions/reclassify-events/index.ts` | ~79-85 | Adicionar `body.photo` |

---

## Mudança Técnica

**De:**
```typescript
// Image detection
if (
  body?.image !== undefined ||
  body?.imageUrl !== undefined ||
  rawEvent.imageUrl !== undefined ||
  mimeType?.startsWith("image/")
) {
  return {
    eventType: "image_message",
    eventSubtype: mimeType || (body?.image ? "body.image" : "imageUrl"),
    classification: "identified",
  };
}
```

**Para:**
```typescript
// Image detection
const bodyPhoto = body?.photo as string | undefined;
const hasPhotoUrl = bodyPhoto && bodyPhoto.startsWith("https://");

if (
  body?.image !== undefined ||
  body?.imageUrl !== undefined ||
  rawEvent.imageUrl !== undefined ||
  hasPhotoUrl ||
  mimeType?.startsWith("image/")
) {
  return {
    eventType: "image_message",
    eventSubtype: mimeType || (body?.image ? "body.image" : (hasPhotoUrl ? "body.photo" : "imageUrl")),
    classification: "identified",
  };
}
```

---

## Resultado Esperado

Eventos com payload contendo:
```json
{
  "body": {
    "photo": "https://pps.whatsapp.net/..."
  }
}
```

Serão classificados como:
- `event_type`: `image_message`
- `event_subtype`: `body.photo`
- `classification`: `identified`
- `processing_status`: `processed`

---

## Após Implementação

1. Edge Functions serão redeployadas automaticamente
2. Novos eventos com `body.photo` serão identificados como imagem
3. Use "Reclassificar Todos" para corrigir eventos antigos

