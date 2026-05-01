## Goal

Atualizar o payload enviado pelos disparos de webhook em **ações de chamada** (`execute-call-action`) para o novo formato aninhado solicitado, contendo blocos `account`, `lead`, `campaign`, `operator` e `call` (com `actions`).

## Formato alvo

O payload passa a ser um **array com um objeto** (como solicitado), no shape:

```json
[{
  "account":  { "id": "...", "name": "..." },
  "lead":     { "id": "...", "name": "...", "phone": "..." },
  "campaign": { "id": "...", "name": "..." },
  "operator": { "id": "...", "name": "...", "email": "..." },
  "call": {
    "id": "...", "status": "...", "attempts": 1,
    "duration": 0, "cost": null, "recording": "...",
    "actions": { "id": "...", "name": "...", "text": "..." }
  }
}]
```

## Mudanças

### 1. `supabase/functions/execute-call-action/index.ts`

- Criar uma função interna `buildActionPayload({ action, lead, campaign, operator, callLog, account, customMessage })` que monta o objeto no novo shape.
- Para os cases **`webhook`** e **`custom_message`**, antes do `fetch`, buscar dados extras necessários:
  - `call_leads` → `id, name, phone` (já é buscado).
  - `call_campaigns` → `id, name, company_id`.
  - `companies` (via `company_id`) → `id, name` para popular `account`.
  - `call_logs` mais recente do par lead+campaign → `id, call_status, attempt_number, duration_seconds, audio_url, custom_message, operator_id`.
  - `call_operators` (via `operator_id` do log) → `id, operator_name, email` (fallback `null` se ausente).
- Mapear no payload:
  - `call.status` ← `call_logs.call_status`
  - `call.attempts` ← `call_logs.attempt_number`
  - `call.duration` ← `call_logs.duration_seconds`
  - `call.recording` ← `call_logs.audio_url`
  - `call.cost` ← `null` (campo não existe hoje no schema)
  - `call.actions.id/name` ← `call_script_actions.id/name`
  - `call.actions.text` ← para `custom_message`, usa `call_logs.custom_message`; para `webhook`, usa `actionConfig.text` se existir, senão `""`.
- Enviar o body como **array com um objeto** (`JSON.stringify([payload])`) conforme requisitado.
- Manter o mesmo tratamento de resposta (`status_code`, `response_body` em erro) e a persistência do `automationNote` no `call_logs.notes`.

### 2. Compatibilidade

- O novo payload **substitui** o antigo (formato achatado com `event`, `lead_id`, `campaign_id`, `lead`, etc.). Como a mudança foi solicitada explicitamente pelo usuário, os webhooks externos (n8n etc.) precisarão consumir o novo schema.
- Os outros tipos de ação (`add_tag`, `update_status`, `start_sequence`) **não são alterados** — só afetam o banco/sequências.

### 3. Sem alterações de UI ou banco

- Nenhuma migração SQL.
- Nenhum componente React precisa mudar — o payload é interno do edge function.

## Arquivos afetados

- `supabase/functions/execute-call-action/index.ts` (única alteração)

## Validação

Após implementar, disparar uma ação de webhook a partir do `CallActionDialog` e conferir nos logs do edge function que o body enviado segue o novo shape, com `account.name` populado a partir da empresa da campanha e `operator` populado a partir do `call_logs` mais recente.
