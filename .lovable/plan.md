

## Alteração: Enviar Validação via Webhook n8n

### Visão Geral

Modificar a Edge Function `phone-validation` para enviar as informações da instância e do número para um webhook n8n, que fará a chamada ao Z-API e retornará o resultado.

---

### Fluxo Atualizado

```text
Cliente                     dispatchOne                      n8n Webhook
   │                             │                              │
   ├─► POST /phone-validation   │                              │
   │   { phone: "55119..." }    │                              │
   │                             │                              │
   │                             ├─► Buscar instância          │
   │                             │   conectada no DB           │
   │                             │                              │
   │                             ├─► POST webhook ────────────►│
   │                             │   {                          │
   │                             │     instance: {...},         │──► Z-API
   │                             │     phone: "55119..."        │
   │                             │   }                          │
   │                             │                              │
   │                             │◄──── response ───────────────│
   │                             │                              │
   │◄──── { exists, phone }     │                              │
```

---

### Alteração no Arquivo

**Arquivo:** `supabase/functions/phone-validation/index.ts`

**Mudanças:**
1. Substituir a chamada direta ao Z-API por uma chamada POST ao webhook n8n
2. Enviar payload com dados completos da instância e telefone

---

### Payload Enviado ao Webhook

```json
{
  "action": "validation.phone_exists",
  "instance": {
    "id": "uuid-da-instancia",
    "name": "Nome da Instância",
    "external_instance_id": "INSTANCE_ID_ZAPI",
    "external_instance_token": "TOKEN_ZAPI"
  },
  "phone": "5512983195531"
}
```

---

### Código da Alteração

```typescript
// Substituir o bloco de chamada ao Z-API (linhas 150-182) por:

const webhookUrl = 'https://n8n-n8n.nuwfic.easypanel.host/webhook-test/validation_phone';

console.log(`Sending phone validation to webhook: ${cleanPhone}`);

const webhookPayload = {
  action: 'validation.phone_exists',
  instance: {
    id: instance.id,
    name: instance.name,
    external_instance_id: instance.external_instance_id,
    external_instance_token: instance.external_instance_token
  },
  phone: cleanPhone
};

const webhookResponse = await fetch(webhookUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(webhookPayload)
});

if (!webhookResponse.ok) {
  const errorText = await webhookResponse.text();
  console.error('Webhook error:', webhookResponse.status, errorText);
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: 'WEBHOOK_ERROR',
        message: 'Erro ao consultar o webhook de validação.'
      }
    }),
    { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

const result = await webhookResponse.json();

console.log('Webhook response:', result);

return new Response(
  JSON.stringify({
    success: true,
    exists: result.exists === true || result.exists === 'true',
    phone: result.phone || cleanPhone,
    lid: result.lid || null,
    instance_used: instance.name
  }),
  { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
);
```

---

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/phone-validation/index.ts` | Substituir chamada Z-API por webhook n8n |

---

### Resultado Esperado

1. O endpoint `/phone-validation` envia os dados para o webhook n8n
2. O n8n recebe: instance (id, name, external_instance_id, external_instance_token) e phone
3. O n8n faz a chamada ao Z-API e retorna o resultado
4. O dispatchOne repassa a resposta ao cliente

