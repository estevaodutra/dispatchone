

## Problema

O `fireDialWebhook` no `queue-executor` busca o webhook na tabela `webhook_configs` filtrando por `user_id` do dono da campanha. Mas o webhook de ligações é **global da DispatchOne** — existe apenas uma configuração (do usuário `3b6be6fe...`) que deve ser usada para **todas** as campanhas, independente de quem as criou.

O mesmo problema existe no `call-dial` (Edge Function).

Resultado atual: campanhas de outros usuários (como `7848b4ff...`) não encontram webhook → operador fica preso em "dialing" → loop infinito.

## Solução

Alterar `fireDialWebhook` no `queue-executor` e a seção de webhook no `call-dial` para buscar o webhook de calls **sem filtrar por user_id** — simplesmente pegar qualquer configuração ativa da categoria `calls`.

### 1. `supabase/functions/queue-executor/index.ts` — `fireDialWebhook`

Substituir a busca por `user_id` do campaign owner (linhas 583-598) por uma busca global:

```typescript
// Before (broken):
const { data: webhookConfig } = await supabase
  .from('webhook_configs')
  .select('url, is_active')
  .eq('user_id', campaignOwnerId)
  .eq('category', 'calls')
  .maybeSingle();

// After (global):
const { data: webhookConfig } = await supabase
  .from('webhook_configs')
  .select('url, is_active')
  .eq('category', 'calls')
  .eq('is_active', true)
  .limit(1)
  .maybeSingle();
```

Isso também elimina a query extra para buscar o `campaignOwnerId` (linhas 584-591), simplificando a função.

### 2. `supabase/functions/call-dial/index.ts` — seção webhook

Mesma mudança: remover o filtro `.eq('user_id', userId)` na busca do webhook (linha ~353):

```typescript
// Before:
const { data: webhookConfig } = await supabase
  .from('webhook_configs')
  .select('url, is_active')
  .eq('user_id', userId)
  .eq('category', 'calls')
  .maybeSingle();

// After:
const { data: webhookConfig } = await supabase
  .from('webhook_configs')
  .select('url, is_active')
  .eq('category', 'calls')
  .eq('is_active', true)
  .limit(1)
  .maybeSingle();
```

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/queue-executor/index.ts` | Remover filtro `user_id` e query extra do campaign owner na resolução do webhook |
| `supabase/functions/call-dial/index.ts` | Remover filtro `user_id` na busca do webhook de calls |

