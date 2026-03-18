

## Corrigir: Build error + Item "Em Ligação" persistente na fila

### Problema 1: Build error em `call-status/index.ts`

Na linha 284, o `select` do `callLog` não inclui `company_id`. Na linha 626, o `select` do `campaignData` também não inclui `company_id`. Ambos são referenciados na linha 656.

**Correção:**
- Linha 284: adicionar `company_id` ao select → `'id, campaign_id, lead_id, operator_id, started_at, ended_at, call_status, company_id'`
- Linha 626: adicionar `company_id` ao select → `'retry_count, retry_interval_minutes, retry_exceeded_behavior, retry_exceeded_action_id, company_id'`

### Problema 2: Item "Em Ligação" fantasma persiste

A remoção do item da fila em `call-status` (linha 553) usa apenas `call_log_id`. Se o `call_log_id` no queue item não corresponder ao log processado pelo callback, o item nunca é removido.

Além disso, `healStaleInCallItems` só roda no `global_tick` — que depende do loop do frontend estar ativo. Se o loop parou, a limpeza não acontece.

**Correção em `call-status/index.ts` (linha 550-554):**

Adicionar fallback de remoção por `lead_id` + `campaign_id` quando a remoção por `call_log_id` não encontra nada:

```ts
const ALL_TERMINAL = ['completed', 'no_answer', 'voicemail', 'failed', 'busy', 'not_found', 'cancelled', 'timeout'];
if (ALL_TERMINAL.includes(mappedStatus)) {
  // Primary: delete by call_log_id
  const { data: deleted } = await supabase
    .from('call_queue')
    .delete()
    .eq('call_log_id', callLog.id)
    .select('id');

  // Fallback: if nothing was deleted, try by lead_id + campaign_id + status in_call
  if ((!deleted || deleted.length === 0) && callLog.lead_id && callLog.campaign_id) {
    await supabase
      .from('call_queue')
      .delete()
      .eq('lead_id', callLog.lead_id)
      .eq('campaign_id', callLog.campaign_id)
      .eq('status', 'in_call');
  }
}
```

**Correção em `healStaleInCallItems` (`queue-processor/index.ts`):**

Adicionar verificação de itens `in_call` sem `call_log_id` com mais de **5 minutos** (reduzir de 10 para 5) e também verificar itens `in_call` cujo `call_log` tenha status ativo mas com `ended_at` preenchido (indicando que o callback chegou mas a fila não foi limpa).

### Arquivos alterados

1. **`supabase/functions/call-status/index.ts`**: Fix select fields + fallback de remoção por lead_id/campaign_id
2. **`supabase/functions/queue-processor/index.ts`**: Reduzir timeout de orphan items + verificar `ended_at`

