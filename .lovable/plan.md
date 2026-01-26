
# Plano: Corrigir Classificacao de Eventos "ReceivedCallback"

## Problema Identificado

O payload Z-API via n8n tem esta estrutura:

```text
raw_event: {
  body: {
    text: {
      message: "Vc está criando pelo Gemini?"
    }
  },
  type: "ReceivedCallback",   <-- Campo 'type' no nivel raiz
  phone: "120363...group",
  status: "RECEIVED"
}
```

### Causa Raiz

A logica de classificacao busca o nome do evento em:
- `rawEvent.event`
- `rawEvent.eventType`

Mas NAO busca em `rawEvent.type` onde o valor "ReceivedCallback" esta localizado.

Alem disso, no `webhook-inbound`, a logica para mensagens recebidas espera chaves como `conversation` ou `extendedTextMessage`, mas o payload tem `body.text.message`.

---

## Arquivos a Modificar

| Arquivo | Acao |
|---------|------|
| `supabase/functions/webhook-inbound/index.ts` | Atualizar classifyZApiEvent para detectar body.text e rawEvent.type |
| `supabase/functions/reclassify-events/index.ts` | Atualizar classifyZApiEvent para detectar body.text e rawEvent.type |

---

## Mudancas Tecnicas

### 1. Atualizar `webhook-inbound/index.ts`

Modificar a funcao `classifyZApiEvent` para:
1. Incluir `rawEvent.type` na busca do eventName
2. Detectar mensagens de texto em `body.text.message`

```typescript
function classifyZApiEvent(rawEvent: Record<string, unknown>): ClassificationResult {
  const event = rawEvent.event as string | undefined;
  const eventType = rawEvent.eventType as string | undefined;
  const rawType = rawEvent.type as string | undefined;  // NOVO
  const eventName = event || eventType || rawType;      // INCLUIR rawType
  
  // Check direct mapping first (ReceivedCallback -> text_message)
  if (eventName && ZAPI_EVENT_MAP[eventName]) {
    return {
      eventType: ZAPI_EVENT_MAP[eventName],
      eventSubtype: eventName,
      classification: "identified",
    };
  }
  
  // ... codigo existente de reaction e played ...
  
  // Check for text message in body.text (n8n Z-API format)
  const body = rawEvent.body as Record<string, unknown> | undefined;
  const bodyText = body?.text as Record<string, unknown> | undefined;
  if (bodyText?.message !== undefined) {
    return {
      eventType: "text_message",
      eventSubtype: "ReceivedCallback",
      classification: "identified",
    };
  }
  
  // ... resto do codigo ...
}
```

### 2. Adicionar "ReceivedCallback" ao ZAPI_EVENT_MAP em webhook-inbound

Adicionar o mapeamento que ja existe no reclassify-events:

```typescript
const ZAPI_EVENT_MAP: Record<string, string> = {
  // ... existentes ...
  "ReceivedCallback": "text_message",  // NOVO
};
```

### 3. Atualizar `reclassify-events/index.ts`

Aplicar a mesma logica:
1. Incluir `rawEvent.type` na busca do eventName
2. Detectar mensagens de texto em `body.text.message`

```typescript
function classifyZApiEvent(rawEvent: Record<string, unknown>): ClassificationResult {
  const event = rawEvent.event as string | undefined;
  const eventType = rawEvent.eventType as string | undefined;
  const rawType = rawEvent.type as string | undefined;  // NOVO
  const eventName = event || eventType || rawType;      // INCLUIR rawType
  
  // ... resto da logica igual ...
  
  // Check for text message in body.text (n8n Z-API format)
  const body = rawEvent.body as Record<string, unknown> | undefined;
  const bodyText = body?.text as Record<string, unknown> | undefined;
  if (bodyText?.message !== undefined) {
    return {
      eventType: "text_message",
      eventSubtype: "text",
      classification: "identified",
    };
  }
  
  // ... resto do codigo ...
}
```

---

## Ordem de Verificacao Atualizada

1. Mapeamento direto de eventos (ZAPI_EVENT_MAP) - agora inclui rawEvent.type
2. Verificacao de reactions
3. Verificacao de played events
4. **NOVO**: Verificacao de body.text.message
5. Verificacao de message types (conversation, imageMessage, etc.)
6. Verificacao de group actions
7. Verificacao de button/list responses
8. Fallback para unknown

---

## Resultado Esperado

| Payload | event_type | event_subtype |
|---------|------------|---------------|
| `type: "ReceivedCallback"` | `text_message` | `ReceivedCallback` |
| `body.text.message: "..."` | `text_message` | `text` |

---

## Beneficios

1. Eventos com `type: "ReceivedCallback"` serao classificados corretamente
2. Mensagens com estrutura `body.text.message` serao identificadas
3. Reclassificacao ira corrigir eventos existentes marcados como "unknown"
