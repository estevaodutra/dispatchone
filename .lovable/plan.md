

# Plano: Corrigir Formato do Payload no n8n

## O Problema

O endpoint `webhook-inbound` espera receber:

```json
{
  "source": "z-api",
  "instance_id": "ID_DA_INSTANCIA",
  "raw_event": { ...payload original do Z-API... }
}
```

Mas o n8n está enviando o payload diretamente sem encapsular, resultando em erro 400.

---

## Solucao 1: Configurar o n8n (Recomendado)

No workflow do n8n, antes de enviar para o DispatchOne, use um node **Set** ou **Code** para transformar o payload:

### Node "Set" no n8n:

Configurar os campos:
- `source`: `z-api` (string fixa)
- `instance_id`: `{{ $json.instanceId }}` (ou o campo que voce usa)
- `raw_event`: `{{ $json }}` (payload completo original)

### Node "Code" no n8n (JavaScript):

```javascript
return {
  json: {
    source: "z-api",
    instance_id: $input.first().json.instanceId || "default_instance",
    raw_event: $input.first().json
  }
};
```

---

## Solucao 2: Tornar o Endpoint Mais Flexivel (Alternativa)

Modificar a Edge Function para aceitar tambem o payload direto da Z-API, detectando automaticamente o formato.

### Logica:

```typescript
// Se nao tiver instance_id e raw_event, assumir que e payload direto
if (!body.instance_id && !body.raw_event) {
  // Tentar extrair instance_id de outros campos
  const instanceId = body.instanceId || body.instance || "unknown";
  
  // O body inteiro e o raw_event
  return {
    source: "z-api",
    instance_id: instanceId,
    raw_event: body
  };
}
```

### Campos da Z-API para instance_id:

A Z-API envia o campo `instanceId` no payload. Podemos usar isso automaticamente.

---

## Arquivos a Modificar

| Arquivo | Acao |
|---------|------|
| `supabase/functions/webhook-inbound/index.ts` | Adicionar deteccao automatica de formato |

---

## Mudancas na Edge Function

```typescript
// Antes de validar campos obrigatorios:

let payload: InboundPayload;

// Detectar se e formato encapsulado ou direto
if (body.raw_event && body.instance_id) {
  // Formato esperado (encapsulado)
  payload = body as InboundPayload;
} else {
  // Payload direto do provedor - encapsular automaticamente
  const instanceId = (body as any).instanceId || 
                     (body as any).instance || 
                     (body as any).phone ||
                     "unknown";
  
  payload = {
    source: "z-api",  // Default
    instance_id: instanceId,
    raw_event: body
  };
  
  console.log("[webhook-inbound] Auto-wrapped payload");
}
```

---

## Beneficios da Solucao 2

1. **Compatibilidade**: Funciona tanto com payload encapsulado quanto direto
2. **Menos configuracao**: n8n pode simplesmente repassar o payload
3. **Flexibilidade**: Detecta instance_id de varios campos comuns

---

## Campos comuns da Z-API para instance_id:

| Campo | Descricao |
|-------|-----------|
| `instanceId` | ID da instancia no Z-API |
| `phone` | Numero do telefone da instancia |
| `instance` | Outro formato de ID |

---

## Recomendacao

**Implementar a Solucao 2** - tornar o endpoint flexivel para aceitar ambos os formatos. Isso facilita a integracao com o n8n e outros sistemas.

