## Problema

A atualização anterior alterou o payload na edge function `execute-call-action`, mas o `CallActionDialog` **nunca chama essa função** — ele monta o payload localmente e dispara via `webhook-proxy` diretamente. Por isso o payload continua no formato antigo (`{ event, lead, campaign, ... }`).

Local exato (`src/components/operator/CallActionDialog.tsx`, linhas ~241–291):

- `custom_message` → `supabase.functions.invoke("webhook-proxy", { url, payload: {event, call_id, lead, campaign, ...} })`
- `webhook` → `supabase.functions.invoke("webhook-proxy", { url, payload: { lead, campaignId, actionType } })`

## Solução

Substituir as duas chamadas locais para que o disparo da automação passe pela edge function `execute-call-action`, que já monta o novo payload aninhado (`account / lead / campaign / operator / call.actions`) e envia como array `[payload]`.

### Mudança em `src/components/operator/CallActionDialog.tsx`

Dentro de `executeAutomation(actionId)`, para os tipos `custom_message` **e** `webhook`, trocar o invoke de `webhook-proxy` por:

```ts
const { error: fnError } = await supabase.functions.invoke("execute-call-action", {
  body: {
    action_id: actionId,
    lead_id: currentData.leadId,
    campaign_id: currentData.campaignId,
  },
});
if (fnError) {
  toast({ title: "Webhook falhou", description: fnError.message, variant: "destructive" });
}
```

- Remover a busca local de `leadData` e a montagem do payload antigo (não são mais necessárias — a edge function refaz a busca).
- Manter intactos os ramos `start_sequence`, `add_tag` e `update_status`.

### Garantia de que o `custom_message` chega no payload

Hoje a edge function lê `call_logs.custom_message` do log mais recente para popular `call.actions.text`. O `CallActionDialog` já grava esse valor em `call_logs.custom_message` antes de disparar a automação (no `handleSave`, antes de `executeAutomation`), então o texto correto será capturado.

Verificar no fluxo de `handleSave` que a inserção/atualização do `call_logs` (com `custom_message` preenchido) acontece **antes** do `await executeAutomation(...)`. Se não estiver, ajustar a ordem para garantir.

### Sem alterações em

- `supabase/functions/execute-call-action/index.ts` (já está com o novo formato)
- `webhook-proxy` (deixa de ser usado por essas duas ações; segue funcionando para outros usos)
- Banco de dados / RLS / tipos

## Validação

1. Disparar uma ação `webhook` no `CallActionDialog`.
2. Conferir nos logs de `execute-call-action` que o body enviado segue o shape:
   ```json
   [{
     "account": {...}, "lead": {...}, "campaign": {...},
     "operator": {...},
     "call": { "id":"...", "status":"...", "attempts":..., "duration":..., "cost":null, "recording":"...",
               "actions": { "id":"...", "name":"...", "text":"..." } }
   }]
   ```
3. Repetir para `custom_message` e confirmar que `call.actions.text` traz o texto da mensagem personalizada.

## Arquivos afetados

- `src/components/operator/CallActionDialog.tsx` (única alteração)
