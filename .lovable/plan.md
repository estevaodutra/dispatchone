
# Plano: Enriquecer Payload de Resposta de Enquete

## Situação Atual

No `handle-poll-response`, a ação `call_webhook` já envia um payload estruturado quando `forwardRawBody` está desativado:

```json
{
  "event": "poll_vote",
  "poll": {
    "id": "uuid",
    "question": "Qual seu status?",
    "options": ["Despachado", "Recebido", "Atrasado"]
  },
  "vote": {
    "option_index": 1,
    "option_text": "Recebido"
  },
  "respondent": { ... },
  "group": { "jid": "..." },
  ...
}
```

**Problema:** Quando `forwardRawBody` está **ativo**, o sistema envia apenas o payload original do Z-API, sem incluir o conteúdo da enquete (question + options).

---

## Solução Proposta

Modificar a lógica da ação `call_webhook` para **sempre** incluir os dados da enquete e da resposta, mesmo quando `forwardRawBody` está ativo:

### Estrutura do Payload Atualizado

**Quando `forwardRawBody = false` (payload estruturado):**
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
  "respondent": { ... },
  "group": { ... },
  "instance": { ... }
}
```

**Quando `forwardRawBody = true` (payload enriquecido):**
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
  "raw_event": {
    // Payload original completo do Z-API/n8n
    "body": { "pollVote": {...}, ... },
    ...
  }
}
```

---

## Mudanças Técnicas

### Arquivo: `supabase/functions/handle-poll-response/index.ts`

Atualizar o bloco `case "call_webhook":` (linhas ~532-610):

```typescript
case "call_webhook": {
  const webhookUrl = actionConfig.config.webhookUrl as string;
  
  if (!webhookUrl) {
    actionResult = { error: "No webhook URL configured" };
    break;
  }

  console.log(`[HandlePollResponse] Calling webhook: ${webhookUrl}`);

  // Sempre construir payload estruturado base com poll + vote
  const basePayload = {
    event: "poll_vote",
    poll: {
      id: typedPoll.id,
      question: typedPoll.question_text,
      options: typedPoll.options,
    },
    vote: {
      option_index: response.option_index,
      option_text: response.option_text || typedPoll.options[response.option_index] || "",
    },
    respondent: {
      phone: respondent.phone,
      name: respondent.name || null,
      jid: respondent.jid || `${respondent.phone}@s.whatsapp.net`,
    },
    group: {
      jid: group_jid,
    },
    campaign_id: typedPoll.campaign_id,
    sequence_id: typedPoll.sequence_id,
    node_id: typedPoll.node_id,
    timestamp: timestamp || new Date().toISOString(),
  };

  // Incluir instance se configurado
  if (actionConfig.config.includeInstance !== false && instance) {
    basePayload.instance = {
      id: instance.id,
      name: instance.name,
      phone: instance.phone || "",
      provider: instance.provider,
    };
  }

  let webhookPayload: Record<string, unknown>;

  // Se forwardRawBody ativo, incluir raw_event junto com dados estruturados
  if (actionConfig.config.forwardRawBody && body._raw_event) {
    webhookPayload = {
      ...basePayload,
      raw_event: body._raw_event,
    };
    console.log(`[HandlePollResponse] Including raw_event in payload`);
  } else {
    webhookPayload = basePayload;
  }

  // ... resto do código (headers, fetch, etc.)
}
```

---

## Comparação Antes/Depois

| Cenário | Antes | Depois |
|---------|-------|--------|
| `forwardRawBody = false` | ✅ poll + vote incluídos | ✅ Sem mudança |
| `forwardRawBody = true` | ❌ Só raw_event (sem poll/vote) | ✅ poll + vote + raw_event |

---

## Benefícios

1. **Consistência**: Todos os webhooks recebem `poll.question`, `poll.options` e `vote` estruturados
2. **Flexibilidade**: Quando `forwardRawBody` está ativo, o `raw_event` é adicionado como campo extra
3. **Compatibilidade**: Sistemas externos podem usar os campos estruturados sem precisar parsear o raw payload

---

## Resumo de Arquivos

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/handle-poll-response/index.ts` | Refatorar bloco `call_webhook` para sempre incluir poll + vote |
