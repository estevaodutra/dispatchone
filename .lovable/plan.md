
# Plano: Adicionar Classificacao de Evento "reaction"

## Contexto

O sistema atual nao identifica eventos de reacao do WhatsApp. Quando um usuario reage a uma mensagem com emoji (como "👍" ou "❤️"), o evento e classificado como "unknown".

## Estrutura do Payload (Z-API via n8n)

```text
raw_event: {
  body: {
    reaction: {
      reactionBy: "179250594320603",
      referencedMessage: {
        messageId: "3EB0BAF5EC9486EA12A256",
        ...
      },
      time: 1769451458000,
      value: "👍"   <-- emoji da reacao
    },
    type: "ReceivedCallback",
    instanceId: "3E249...",
    ...
  }
}
```

## Logica de Deteccao

- **Condicao**: Verificar se `body.reaction.value` existe
- **event_type**: `reaction`
- **event_subtype**: O valor do emoji (ex: "👍", "❤️")
- **classification**: `identified`

---

## Arquivo a Modificar

| Arquivo | Acao |
|---------|------|
| `supabase/functions/webhook-inbound/index.ts` | Adicionar deteccao de reaction na funcao classifyZApiEvent |

---

## Mudancas Tecnicas

### 1. Atualizar funcao `classifyZApiEvent`

Adicionar verificacao para `reaction.value` ANTES da verificacao de mensagem:

```typescript
function classifyZApiEvent(rawEvent: Record<string, unknown>): ClassificationResult {
  const event = rawEvent.event as string | undefined;
  const eventType = rawEvent.eventType as string | undefined;
  const eventName = event || eventType;
  
  // Check direct mapping first
  if (eventName && ZAPI_EVENT_MAP[eventName]) {
    return {
      eventType: ZAPI_EVENT_MAP[eventName],
      eventSubtype: eventName,
      classification: "identified",
    };
  }
  
  // Check for reaction events (n8n wraps in body)
  const body = rawEvent.body as Record<string, unknown> | undefined;
  const reaction = (body?.reaction || rawEvent.reaction) as Record<string, unknown> | undefined;
  
  if (reaction?.value !== undefined) {
    return {
      eventType: "reaction",
      eventSubtype: String(reaction.value),
      classification: "identified",
    };
  }
  
  // ... resto da funcao existente
}
```

### 2. Ordem de Verificacao

A deteccao de reaction sera feita:
1. Apos verificar o mapeamento direto de eventos (`ZAPI_EVENT_MAP`)
2. Antes da verificacao de tipos de mensagem (`MESSAGE_TYPE_MAP`)

---

## Exemplos de Classificacao

| Payload | event_type | event_subtype |
|---------|------------|---------------|
| `reaction.value = "👍"` | `reaction` | `👍` |
| `reaction.value = "❤️"` | `reaction` | `❤️` |
| `reaction.value = ""` (remocao) | `reaction` | `` |

---

## Beneficios

1. **Visibilidade**: Reacoes aparecerao corretamente no painel de eventos
2. **Filtragem**: Usuarios poderao filtrar por tipo "reaction"
3. **Analytics**: Possibilidade de contar reacoes por tipo de emoji
4. **Automacao**: Triggers podem ser configurados para reagir a reacoes especificas

