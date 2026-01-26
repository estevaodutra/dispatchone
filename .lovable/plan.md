

## Correção: Detecção de eventos PLAYED

### Problema Identificado
A lógica atual tenta acessar `body.type.status`, mas no payload Z-API o `body.type` é uma **string** (`"MessageStatusCallback"`), não um objeto. O campo `status` está diretamente em `body.status`.

**Código atual (errado):**
```typescript
const bodyType = body?.type as Record<string, unknown> | undefined;
const typeStatus = bodyType?.status as string | undefined;
if (typeStatus === "PLAYED") { ... }
```

**Payload real:**
```json
{
  "body": {
    "type": "MessageStatusCallback",
    "status": "PLAYED"
  }
}
```

### Solucao
Mudar para verificar `body.status === "PLAYED"` diretamente.

---

## Arquivos a Modificar

| Arquivo | Linha | Acao |
|---------|-------|------|
| `supabase/functions/webhook-inbound/index.ts` | 167-177 | Corrigir logica |
| `supabase/functions/reclassify-events/index.ts` | ~120 | Corrigir logica |

---

## Mudanca no webhook-inbound/index.ts

**De (linhas 167-177):**
```typescript
// Check for played events (audio/video played by recipient)
const bodyType = body?.type as Record<string, unknown> | undefined;
const typeStatus = bodyType?.status as string | undefined;

if (typeStatus === "PLAYED") {
  return {
    eventType: "played",
    eventSubtype: "PLAYED",
    classification: "identified",
  };
}
```

**Para:**
```typescript
// Check for played events (audio/video played by recipient)
// Z-API sends status directly in body.status when body.type === "MessageStatusCallback"
const bodyStatus = body?.status as string | undefined;

if (bodyStatus === "PLAYED") {
  return {
    eventType: "played",
    eventSubtype: "PLAYED",
    classification: "identified",
  };
}
```

---

## Mudanca no reclassify-events/index.ts

Aplicar a mesma correcao na funcao `classifyZApiEvent` (linhas 120-134):

**De:**
```typescript
const bodyType = body?.type as Record<string, unknown> | undefined;
const typeStatus = bodyType?.status as string | undefined;

if (typeStatus === "PLAYED") { ... }
```

**Para:**
```typescript
const bodyStatus = body?.status as string | undefined;

if (bodyStatus === "PLAYED") { ... }
```

---

## Resultado Esperado

Eventos com o payload:
```json
{
  "body": {
    "type": "MessageStatusCallback",
    "status": "PLAYED"
  }
}
```

Serao classificados como:
- `event_type`: `played`
- `event_subtype`: `PLAYED`
- `classification`: `identified`
- `processing_status`: `processed`

---

## Depois da Implementacao

1. As Edge Functions serao redeployadas automaticamente
2. Novos eventos PLAYED serao identificados corretamente
3. Use o botao "Reclassificar Todos" para corrigir eventos antigos

