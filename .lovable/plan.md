

## Corrigir ação de retentativas não executada — campo `url` vs `webhook_url`

### Diagnóstico

Os logs confirmam que a ação **é invocada** corretamente quando as retentativas excedem o limite:

```
[call-status] Max retries exceeded (3/3)
[call-status] Executing exceeded action: 7e935f8e...
[execute-call-action] type=webhook config={"url":"https://api.datacrazy.io/..."}
[execute-call-action] Result: {"action_type":"webhook","skipped":true,"reason":"Missing webhook_url"}
```

O problema é um **mismatch de campo**: a aba Ações salva a URL do webhook como `url` no config, mas a Edge Function `execute-call-action` procura pelo campo `webhook_url`. Como não encontra, retorna `skipped: true` e a ação nunca é executada.

### Solução

**Arquivo: `supabase/functions/execute-call-action/index.ts`**

Na seção `case "webhook"` (linha 117), alterar para aceitar ambos os campos:

```typescript
// ANTES:
const webhookUrl = actionConfig.webhook_url as string;

// DEPOIS:
const webhookUrl = (actionConfig.webhook_url || actionConfig.url) as string;
```

Isso mantém compatibilidade com ações que já usam `webhook_url` (como `custom_message`) e corrige ações do tipo `webhook` que salvam como `url`.

### Arquivo alterado
1. **`supabase/functions/execute-call-action/index.ts`** — linha 117, aceitar `url` como fallback para `webhook_url`

