

## Problema: Ações pós-retentativa nunca são executadas

### Diagnóstico

Quando o limite de retentativas é atingido, tanto `call-status/index.ts` quanto `reschedule-failed-calls/index.ts` tentam invocar a Edge Function `execute-message` com este payload:

```json
{
  "action_id": "uuid-da-ação",
  "lead_id": "uuid-do-lead",
  "campaign_id": "uuid-da-campanha",
  "trigger": "retry_exceeded"
}
```

Porém, `execute-message` é o motor de **campanhas de grupo WhatsApp** — ele espera `{ campaignId, groupIds, sequenceId }`. O payload com `action_id` é completamente ignorado, e a ação nunca é executada.

A lógica correta de execução de ações (`start_sequence`, `add_tag`, `webhook`, `update_status`) existe apenas no **frontend** (`useCallLeads.ts → executeActionAutomation`), que não é acessível pelo servidor.

### Solução

Criar uma nova Edge Function **`execute-call-action`** que replica a lógica de `executeActionAutomation` no servidor:

1. Recebe `{ action_id, lead_id, campaign_id }`
2. Busca a ação em `call_script_actions` para obter `action_type` e `action_config`
3. Executa conforme o tipo:
   - **`start_sequence`**: invoca `execute-dispatch-sequence` ou `trigger-sequence`
   - **`add_tag`**: atualiza `call_leads.custom_fields.tags`
   - **`webhook`**: invoca `webhook-proxy`
   - **`update_status`**: atualiza `call_leads.status`
4. Atualizar `call-status/index.ts` e `reschedule-failed-calls/index.ts` para invocar `execute-call-action` em vez de `execute-message`

### Arquivos

1. **`supabase/functions/execute-call-action/index.ts`** (novo) — lógica server-side de execução de ações
2. **`supabase/functions/call-status/index.ts`** — trocar `execute-message` → `execute-call-action`
3. **`supabase/functions/reschedule-failed-calls/index.ts`** — trocar `execute-message` → `execute-call-action`

