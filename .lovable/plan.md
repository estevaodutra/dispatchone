

## Plano: Corrigir URL do webhook e usar webhook-proxy

### Problema
1. O `ExtractLeadsDialog` envia requisições diretamente do browser (`fetch(webhookUrl)`) em vez de usar a Edge Function `webhook-proxy`, causando problemas de CORS
2. A URL usada é a da categoria "groups" (`/webhook/groups`), mas o correto é `https://n8n-n8n.nuwfic.easypanel.host/webhook/events_sent`

### Correções em `src/components/leads/ExtractLeadsDialog.tsx`

**1. Substituir `fetch()` direto por `supabase.functions.invoke("webhook-proxy")`** — tanto em `fetchGroups()` (linha ~245) quanto em `extractMembers()` (linha ~303):

```typescript
// Antes:
const response = await fetch(webhookUrl, { method: "POST", ... });

// Depois:
const webhookUrl = "https://n8n-n8n.nuwfic.easypanel.host/webhook/events_sent";
const { data, error } = await supabase.functions.invoke("webhook-proxy", {
  body: { url: webhookUrl, payload },
});
```

**2. Ajustar parsing da resposta** — o `webhook-proxy` retorna `{ data }` diretamente em vez de um `Response` object, então o parsing de JSON muda:
- Remover `response.text()` / `JSON.parse()` 
- Usar `data` diretamente do retorno do invoke

**3. Adicionar import do supabase client:**
```typescript
import { supabase } from "@/integrations/supabase/client";
```

