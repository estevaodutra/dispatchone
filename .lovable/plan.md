

## Problema

O sistema tem uma **desconexão fundamental** entre dois fluxos de discagem:

1. **Fila (`call_queue`)** — usada pelo `queue-processor`. O `CreateQueueDialog` insere itens aqui, o processador consome e deleta após discar.
2. **Reagendamento (`call_logs`)** — a edge function `reschedule-failed-calls` cria novos `call_logs` com status `scheduled`, mas **nunca os reinsere na `call_queue`**.

Resultado: após a fila inicial ser consumida, as chamadas reagendadas (213 "ready" + 205 "scheduled" call_logs) ficam orphãs — nenhum mecanismo as coloca de volta na `call_queue` para o `queue-processor` discar.

O loop de polling do `bulkEnqueue` (useCallPanel linha 323) tenta forçar ticks para call_logs "ready", mas o queue-processor só lê da `call_queue` (que está vazia) e retorna "Queue empty".

## Correção

Modificar o `queue-processor` para, **quando a `call_queue` estiver vazia**, buscar call_logs elegíveis (status `ready` ou `scheduled` com `scheduled_for <= now`) e processá-los diretamente.

### `supabase/functions/queue-processor/index.ts` — função `processTick`

Após o passo 4 ("Get next from call_queue"), quando `entry` é null (fila vazia), adicionar lógica de fallback:

```text
// 4b. Fallback: check for ready/scheduled call_logs
if (!entry) {
  const { data: readyLog } = await supabase
    .from('call_logs')
    .select('id, campaign_id, lead_id, user_id, attempt_number, max_attempts')
    .eq('campaign_id', campaignId)
    .in('call_status', ['ready', 'scheduled'])
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!readyLog) {
    // Truly nothing to process → stop
    await supabase.from('queue_execution_state')
      .update({ status: 'stopped' })
      .eq('campaign_id', campaignId);
    return { success: true, action: 'completed', reason: 'Queue empty' };
  }

  // Process this existing call_log directly:
  // - Reserve operator (RPC)
  // - Update call_log to 'dialing'
  // - Fire webhook
  // - Update queue_execution_state
}
```

### Detalhes da lógica de fallback:

1. **Buscar call_log elegível**: `call_status IN ('ready', 'scheduled')` AND `scheduled_for <= now()`, ordenado por `scheduled_for ASC`
2. **Reservar operador**: usar a mesma RPC `reserve_operator_for_call` com o `call_log.id` existente
3. **Atualizar call_log**: setar `operator_id`, `call_status = 'dialing'`, `started_at = now()`
4. **Buscar dados do lead**: fazer join com `call_leads` para obter `phone` e `name`
5. **Disparar webhook**: mesma lógica `fireDialWebhook` já existente
6. **Atualizar queue_execution_state**: incrementar `calls_made`, atualizar `last_dial_at`
7. **NÃO deletar da call_queue** (pois não veio de lá)
8. **NÃO criar novo call_log** (pois já existe)

### Busca do lead phone/name

O call_log tem `lead_id` mas não tem `phone` diretamente. O fallback precisa buscar:
```sql
SELECT phone, name FROM call_leads WHERE id = readyLog.lead_id
```

### Resumo das mudanças:

- **1 arquivo**: `supabase/functions/queue-processor/index.ts`
- Adicionar ~40 linhas de fallback na função `processTick`, após a verificação de `call_queue` vazia
- Reutilizar `fireDialWebhook` e `reserve_operator_for_call` existentes

