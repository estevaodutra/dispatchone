

# Plano: Corrigir Classificação de Poll Vote

## Problema Identificado

O payload com `body.pollVote` está sendo classificado como `message_received` porque:

1. O payload tem `body.status === "RECEIVED"`
2. A lógica de status vem **antes** da detecção de `pollVote`
3. O sistema retorna `message_received` sem verificar se é um voto de enquete

```json
{
  "body": {
    "type": "ReceivedCallback",
    "status": "RECEIVED",         // ← Detectado primeiro
    "pollVote": {                  // ← Nunca é verificado
      "options": [...],
      "pollMessageId": "..."
    }
  }
}
```

---

## Solução

Adicionar detecção de `body.pollVote` **no início** da função de classificação, junto com as outras detecções de alta prioridade (mídia, notificações de grupo).

---

## Mudanças Necessárias

### 1. Atualizar `webhook-inbound/index.ts`

Adicionar detecção de pollVote **após a detecção de sticker** (linha 147) e **antes** da detecção de notificações de grupo:

```typescript
// ==========================================
// POLL VOTE DETECTION (n8n/Z-API format)
// body.pollVote indicates a poll response
// ==========================================
const pollVote = body?.pollVote as Record<string, unknown> | undefined;
if (pollVote) {
  return {
    eventType: "poll_response",
    eventSubtype: "pollVote",
    classification: "identified",
  };
}
```

### 2. Atualizar `reclassify-events/index.ts`

Adicionar a mesma lógica de detecção na função duplicada (após linha 140):

```typescript
// POLL VOTE DETECTION
const pollVote = body?.pollVote as Record<string, unknown> | undefined;
if (pollVote) {
  return {
    eventType: "poll_response",
    eventSubtype: "pollVote",
    classification: "identified",
  };
}
```

---

## Resumo Técnico

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/webhook-inbound/index.ts` | Adicionar detecção de `body.pollVote` → `poll_response` |
| `supabase/functions/reclassify-events/index.ts` | Adicionar mesma detecção na lógica duplicada |

---

## Fluxo de Classificação Atualizado

```text
classifyZApiEvent(rawEvent)
  ↓
[1] Mídia (image, video, audio, document, sticker)
  ↓
[2] Poll Vote (body.pollVote) ← NOVO
  ↓
[3] Notificações de Grupo (body.notification)
  ↓
[4] Mapeamento Direto (ZAPI_EVENT_MAP)
  ↓
[5] Reaction (body.reaction)
  ↓
[6] Status (PLAYED, RECEIVED, READ, READ_BY_ME)
  ↓
[7] Texto (body.text.message)
  ↓
[8] unknown
```

---

## Resultado Esperado

Payloads com `body.pollVote` serão classificados como:
- `event_type`: `poll_response`
- `event_subtype`: `pollVote`
- `classification`: `identified`

Após a implementação, usar "Reclassificar Tudo" para reprocessar eventos existentes.

