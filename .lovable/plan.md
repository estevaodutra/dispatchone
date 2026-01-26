

# Plano: Adicionar Classificacao de Evento "played audio"

## Contexto

O sistema atual nao identifica eventos de audio reproduzido no WhatsApp. Quando um audio e reproduzido pelo destinatario, o evento e classificado como "unknown".

## Estrutura do Payload (Z-API via n8n)

```text
raw_event: {
  body: {
    type: {
      status: "PLAYED"    <-- indicador de reproducao
    },
    instanceId: "3E249...",
    ...
  }
}
```

## Logica de Deteccao

- **Condicao**: Verificar se `body.type.status === "PLAYED"`
- **event_type**: `played audio`
- **event_subtype**: `PLAYED`
- **classification**: `identified`

---

## Arquivos a Modificar

| Arquivo | Acao |
|---------|------|
| `supabase/functions/webhook-inbound/index.ts` | Adicionar deteccao de "played audio" na funcao classifyZApiEvent |
| `supabase/functions/reclassify-events/index.ts` | Adicionar mesma deteccao para reclassificacao |

---

## Mudancas Tecnicas

### 1. Atualizar funcao `classifyZApiEvent` em `webhook-inbound/index.ts`

Adicionar verificacao para `body.type.status === "PLAYED"` APOS a verificacao de reaction e ANTES das verificacoes de mensagem (linha 87):

```typescript
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

// Check for played audio events (audio/video played)
const bodyType = (body?.type || rawEvent.type) as Record<string, unknown> | undefined;
const typeStatus = bodyType?.status as string | undefined;

if (typeStatus === "PLAYED") {
  return {
    eventType: "played audio",
    eventSubtype: "PLAYED",
    classification: "identified",
  };
}

// Check if it's a message.received event...
```

### 2. Atualizar funcao `classifyZApiEvent` em `reclassify-events/index.ts`

Adicionar a mesma verificacao APOS a verificacao de reaction (linha 80):

```typescript
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

// Check for played audio events (audio/video played)
const bodyType = (body?.type || rawEvent.type) as Record<string, unknown> | undefined;
const typeStatus = bodyType?.status as string | undefined;

if (typeStatus === "PLAYED") {
  return {
    eventType: "played audio",
    eventSubtype: "PLAYED",
    classification: "identified",
  };
}

// Check message type in various locations...
```

---

## Ordem de Verificacao na funcao

A deteccao de "played audio" sera feita:
1. Apos verificar o mapeamento direto de eventos (`ZAPI_EVENT_MAP`)
2. Apos verificacao de reactions
3. Antes da verificacao de tipos de mensagem

---

## Exemplos de Classificacao

| Payload | event_type | event_subtype |
|---------|------------|---------------|
| `body.type.status = "PLAYED"` | `played audio` | `PLAYED` |

---

## Beneficios

1. **Visibilidade**: Eventos de reproducao aparecerao corretamente no painel
2. **Filtragem**: Usuarios poderao filtrar por tipo "played audio"
3. **Analytics**: Possibilidade de rastrear quantos audios foram reproduzidos
4. **Confirmacao de leitura**: Indica que o destinatario de fato ouviu a midia

