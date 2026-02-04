

# Plano: Integrar Webhook de Ligacoes no Endpoint call-dial

Modificar o endpoint `call-dial` existente para chamar o webhook configurado na categoria "Ligacoes" (calls) apos registrar a ligacao no banco, permitindo que o n8n dispare a ligacao via API4com.

---

## Visao Geral

O endpoint `call-dial` ja:
- Valida API Key
- Busca campanha por nome
- Busca/cria lead
- Busca operador ativo
- Cria registro em `call_logs`
- Atualiza status do lead

Falta adicionar:
- Buscar webhook configurado na categoria "calls"
- Chamar o webhook com payload padronizado
- Retornar resultado do webhook na resposta

---

## Alteracoes

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/call-dial/index.ts` | Adicionar busca e chamada do webhook de ligacoes |

---

## Logica a Adicionar (apos criar call_log)

```text
[Apos criar call_log]
      |
      v
[Buscar webhook_configs onde category = "calls"]
      |
      v
[Webhook ativo?]
      |--- Sim: Chamar webhook com payload padronizado
      |         └── Registrar resultado no response
      |--- Nao: Logar que nenhum webhook esta configurado
      |
      v
[Retornar resposta com dados do webhook]
```

---

## Payload do Webhook

```json
{
  "action": "call.dial",
  "call": {
    "id": "uuid-da-ligacao",
    "status": "dialing"
  },
  "campaign": {
    "id": "uuid-da-campanha",
    "name": "FN | Carrinho Abandonado"
  },
  "lead": {
    "id": "uuid-do-lead",
    "phone": "5512983195531",
    "name": "Ebonocleiton"
  },
  "operator": {
    "id": "uuid-do-operador",
    "name": "Joao Silva",
    "extension": "1001"
  }
}
```

---

## Resposta Atualizada (201)

```json
{
  "success": true,
  "call_id": "uuid-da-ligacao",
  "status": "dialing",
  "campaign": { ... },
  "lead": { ... },
  "operator": { ... },
  "webhook": {
    "called": true,
    "url": "https://n8n.../webhook/calls",
    "status": 200,
    "response": { ... }
  }
}
```

Ou se nao houver webhook:

```json
{
  "success": true,
  ...
  "webhook": {
    "called": false,
    "reason": "no_webhook_configured"
  }
}
```

---

## Codigo a Adicionar

Apos a linha 510 (apos criar call_log), adicionar:

1. **Buscar configuracao de webhook:**
```typescript
const { data: webhookConfig } = await supabase
  .from('webhook_configs')
  .select('url, is_active')
  .eq('user_id', userId)
  .eq('category', 'calls')
  .maybeSingle();
```

2. **Construir payload padronizado:**
```typescript
const webhookPayload = {
  action: 'call.dial',
  call: {
    id: callLog.id,
    status: 'dialing'
  },
  campaign: {
    id: campaign.id,
    name: campaign.name
  },
  lead: {
    id: lead.id,
    phone: lead.phone,
    name: lead.name || lead_name || null
  },
  operator: {
    id: operator.id,
    name: operator.operator_name,
    extension: operator.extension
  }
};
```

3. **Chamar webhook se configurado:**
```typescript
let webhookResult = { called: false, reason: 'no_webhook_configured' };

if (webhookConfig?.is_active && webhookConfig?.url) {
  try {
    const webhookResponse = await fetch(webhookConfig.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload)
    });
    
    const webhookData = await webhookResponse.text();
    webhookResult = {
      called: true,
      url: webhookConfig.url,
      status: webhookResponse.status,
      response: webhookData
    };
  } catch (error) {
    webhookResult = {
      called: true,
      url: webhookConfig.url,
      error: error.message
    };
  }
}
```

4. **Incluir resultado na resposta:**
```typescript
const responseBody = {
  success: true,
  call_id: callLog.id,
  status: 'dialing',
  campaign: { ... },
  lead: { ... },
  operator: { ... },
  webhook: webhookResult
};
```

---

## Fluxo Completo Atualizado

```text
[POST /call-dial]
      |
      v
[Valida API Key]
      |
      v
[Busca campanha por nome]
      |
      v
[Busca/cria lead]
      |
      v
[Busca operador ativo]
      |
      v
[Cria registro em call_logs]
      |
      v
[Atualiza status do lead]
      |
      v
[Busca webhook da categoria "calls"]
      |
      v
[Chama webhook API4com se configurado]
      |
      v
[Retorna resposta com dados da ligacao + resultado do webhook]
```

---

## Observacoes

- Se o webhook nao estiver configurado, a ligacao ainda e registrada no banco
- O resultado do webhook e incluido na resposta para visibilidade
- O n8n recebe o payload e faz a chamada real para a API4com
- Erros no webhook nao impedem o sucesso da operacao (fail-safe)

