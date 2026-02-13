

# Corrigir Headers CORS da Edge Function execute-dispatch-sequence

## Problema

A Edge Function `execute-dispatch-sequence` funciona quando chamada diretamente (via curl/servidor), mas falha silenciosamente quando chamada pelo navegador via `supabase.functions.invoke`. Nenhum log aparece na Edge Function quando o disparo e acionado pelo Painel de Ligacoes.

## Causa Raiz

Os headers CORS da Edge Function estao incompletos. O Supabase JS client envia headers adicionais (`x-supabase-client-platform`, `x-supabase-client-platform-version`, etc.) que nao estao listados no `Access-Control-Allow-Headers`. Isso faz a requisicao preflight (OPTIONS) falhar no navegador, impedindo que a funcao seja chamada.

**Headers atuais (incompletos):**
```
"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
```

**Headers necessarios:**
```
"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version"
```

## Evidencias

- Edge Function tem ZERO logs quando acionada pelo Painel de Ligacoes
- Edge Function responde HTTP 200 quando chamada via curl (sem CORS enforcement)
- O `call_logs` mostra acoes registradas com `action_id` preenchido, mas sem nenhuma chamada a Edge Function
- Os dados da acao estao corretos: `campaignType: "dispatch"`, `sequenceId` e `campaignId` validos
- O codigo do front-end esta correto e deveria chamar a funcao

## Solucao

### Alteracao em `supabase/functions/execute-dispatch-sequence/index.ts`

Atualizar os headers CORS (linhas 3-6):

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
```

### Deploy

Redeployar a Edge Function `execute-dispatch-sequence`.

### Validacao

Apos o deploy, registrar uma acao no Painel de Ligacoes e verificar:
1. Logs da Edge Function mostram a execucao
2. Registro aparece em `group_message_logs`
3. Toast de confirmacao aparece na UI
