

## Plano: Delegar chamada Z-API ao n8n webhook

### O que muda

A função `sync-group-members` vai substituir a chamada direta à Z-API (linhas 54-79) por um POST ao webhook do n8n `https://n8n-n8n.nuwfic.easypanel.host/webhook/groups`, enviando os dados da instância e do grupo. O n8n faz a chamada Z-API e retorna a lista de participantes.

### Payload que o sync-group-members vai enviar ao n8n

```json
{
  "action": "group.metadata",
  "instanceId": "INSTANCE_EXTERNAL_ID",
  "instanceToken": "INSTANCE_EXTERNAL_TOKEN",
  "groupJid": "120363427443466552@g.us"
}
```

### Resposta que o n8n DEVE retornar

O n8n precisa retornar um JSON com um array `participants`. Cada participante deve ter pelo menos `phone` (telefone real). Campos opcionais: `id`, `name`, `short`, `isAdmin`, `isSuperAdmin`.

```json
{
  "participants": [
    {
      "phone": "5511999887766",
      "id": "5511999887766@c.us",
      "name": "João Silva",
      "short": "João",
      "isAdmin": true,
      "isSuperAdmin": false
    },
    {
      "phone": "5521988776655",
      "id": "5521988776655@c.us",
      "name": "Maria",
      "short": "Maria",
      "isAdmin": false,
      "isSuperAdmin": false
    }
  ]
}
```

Esse é exatamente o formato que a Z-API retorna no endpoint `GET /group-metadata/{groupJid}`. Basta o n8n fazer o proxy e retornar o JSON da Z-API diretamente.

### Alteração no código

**`supabase/functions/sync-group-members/index.ts`**

- Remover a chamada direta à Z-API (linhas 54-79) e o `ZAPI_CLIENT_TOKEN`
- Substituir por:
  ```typescript
  const n8nUrl = "https://n8n-n8n.nuwfic.easypanel.host/webhook/groups";
  const zapiGroupJid = groupJid.includes("-group")
    ? groupJid.replace("-group", "@g.us")
    : groupJid;

  const n8nResp = await fetch(n8nUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "group.metadata",
      instanceId: inst.external_instance_id,
      instanceToken: inst.external_instance_token,
      groupJid: zapiGroupJid,
    }),
  });
  ```
- O resto da lógica (parsing de `participants`, comparação com DB, upserts) permanece idêntico

### Resumo para configurar no n8n

1. Webhook trigger em `/webhook/groups`
2. Quando `action === "group.metadata"`: chamar Z-API `GET https://api.z-api.io/instances/{instanceId}/token/{instanceToken}/group-metadata/{groupJid}` com header `Client-Token`
3. Retornar o JSON da Z-API como resposta do webhook (o campo `participants` é obrigatório)

