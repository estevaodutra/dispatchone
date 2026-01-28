

## Atualizar Webhook URL para Validação de Telefone

### Alteração

Substituir a chamada direta ao Z-API por uma chamada POST ao webhook n8n de produção.

---

### Arquivo a Modificar

**`supabase/functions/phone-validation/index.ts`**

Substituir o bloco das linhas 150-193 (chamada ao Z-API) por chamada ao webhook:

**URL do Webhook:** `https://n8n-n8n.nuwfic.easypanel.host/webhook/events_sent`

**Payload a ser enviado:**
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
// Linhas 150-193 serão substituídas por:

const webhookUrl = 'https://n8n-n8n.nuwfic.easypanel.host/webhook/events_sent';

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

### Resultado

O endpoint `/phone-validation` enviará os dados da instância e telefone para o webhook n8n de produção, que processará a validação e retornará o resultado.

