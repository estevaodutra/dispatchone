
# Plano: Enriquecer Payload de Resposta de Enquete

## ✅ IMPLEMENTADO

A ação `call_webhook` no `handle-poll-response` agora **sempre** inclui os dados estruturados da enquete e do voto, mesmo quando `forwardRawBody` está ativo.

---

## Mudança Realizada

### Antes
- `forwardRawBody = false`: Enviava payload estruturado (poll + vote + respondent)
- `forwardRawBody = true`: Enviava **apenas** o raw_event original

### Depois
- `forwardRawBody = false`: Envia payload estruturado (sem mudança)
- `forwardRawBody = true`: Envia payload estruturado **+ raw_event** como campo adicional

---

## Estrutura do Payload Atualizado

```json
{
  "event": "poll_vote",
  "poll": {
    "id": "uuid",
    "question": "Qual seu status de entrega?",
    "options": ["Despachado", "Recebido, em separação", "Atrasado"]
  },
  "vote": {
    "option_index": 1,
    "option_text": "Recebido, em separação"
  },
  "respondent": {
    "phone": "5512982402981",
    "name": "João Silva",
    "jid": "5512982402981@s.whatsapp.net"
  },
  "group": {
    "jid": "120363376787776025-group"
  },
  "campaign_id": "...",
  "sequence_id": "...",
  "node_id": "...",
  "timestamp": "2025-02-02T10:30:00.000Z",
  "instance": { ... },
  "raw_event": { ... }  // Apenas quando forwardRawBody = true
}
```

---

## Arquivo Modificado

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/handle-poll-response/index.ts` | Refatorado bloco `call_webhook` (linhas 532-613) |
