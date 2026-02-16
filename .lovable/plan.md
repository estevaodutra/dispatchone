
# Corrigir disparo de webhook nas acoes pos-ligacao

## Problema

A acao "Dispara webhook externo" no dialogo "Registrar Acao" usa `fetch()` diretamente do navegador (linha 79 de `useCallLeads.ts`). Isso causa dois problemas:

1. **CORS**: O navegador bloqueia requisicoes cross-origin para APIs externas (n8n, etc.) que nao enviam headers CORS
2. **Erro silenciado**: O `.catch(() => {})` engole qualquer falha, entao o usuario nao recebe feedback

## Solucao

Rotear a chamada webhook por uma Edge Function existente ou nova, eliminando o problema de CORS (server-to-server nao tem restricao CORS).

### Arquivo: `supabase/functions/webhook-proxy/index.ts` (novo)

Criar uma Edge Function simples que recebe a URL e o payload, e faz o POST server-side:

```typescript
// Recebe { url, payload } no body
// Faz fetch server-side para a URL
// Retorna o resultado
```

### Arquivo: `supabase/config.toml`

Adicionar configuracao para desabilitar JWT verification (a funcao valida o user via header):

```toml
[functions.webhook-proxy]
verify_jwt = false
```

### Arquivo: `src/hooks/useCallLeads.ts`

Substituir o `fetch()` direto (linhas 71-84) por `supabase.functions.invoke("webhook-proxy")`:

```typescript
case "webhook": {
  const url = config.url as string;
  if (!url) break;
  const { data: lead } = await supabase
    .from("call_leads")
    .select("*")
    .eq("id", leadId)
    .single();
  
  const { error: proxyError } = await supabase.functions.invoke("webhook-proxy", {
    body: {
      url,
      payload: { lead, campaignId, actionType },
    },
  });
  
  if (proxyError) {
    throw new Error(`Webhook falhou: ${proxyError.message}`);
  }
  break;
}
```

Isso resolve o CORS e tambem garante feedback de erro ao operador.

## Arquivos modificados

| Arquivo | Mudanca |
|---|---|
| `supabase/functions/webhook-proxy/index.ts` | Nova Edge Function para proxy de webhooks server-side |
| `supabase/config.toml` | Configuracao verify_jwt = false para webhook-proxy |
| `src/hooks/useCallLeads.ts` | Substituir fetch() direto por supabase.functions.invoke("webhook-proxy") com tratamento de erro |
