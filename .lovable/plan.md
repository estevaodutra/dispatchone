

## Corrigir: lead não fica com status "Em Ligação" na fila

### Problema
No `queue-processor`, o update de `call_queue` para `status: 'in_call'` acontece **depois** do `fireDialWebhook` (linhas 284→287 e 571→573). Isso causa dois problemas:

1. Se o webhook demora, o callback `call-status` pode chegar e deletar o item da `call_queue` **antes** do update para `in_call` ser executado.
2. Se o webhook falha ou retorna `operator_unavailable`, a função retorna cedo e o update nunca acontece.
3. O frontend faz refetch a cada 10s, e nesse intervalo o item ainda está com `status: 'waiting'` -- ou já foi deletado pelo callback.

### Solução

Mover o update de `call_queue` para `in_call` para **antes** do `fireDialWebhook`, em ambos os fluxos:

**1. `supabase/functions/queue-processor/index.ts` - fluxo global (linha ~284-287)**
- Mover `await supabase.from('call_queue').update({ status: 'in_call', call_log_id: callLog.id }).eq('id', entry.queue_id)` para **antes** de `fireDialWebhook`
- No `fireDialWebhook`, quando há falha ou `operator_unavailable`, reverter o status da `call_queue` para `waiting` (ou deletar)

**2. `supabase/functions/queue-processor/index.ts` - fluxo legacy (linha ~571-573)**
- Mesma alteração: mover update de `in_call` para antes do webhook
- Adicionar rollback no caso de falha

**3. `fireDialWebhook` - adicionar rollback do `call_queue`**
- Receber o `queueItemId` como parâmetro
- Nos blocos de erro (timeout, `operator_unavailable`), reverter `call_queue` para `waiting` ou deletar

### Fluxo corrigido
```text
queue item (waiting)
  → update call_queue → in_call + call_log_id  ← ANTES do webhook
  → fire webhook
    → sucesso: item permanece in_call
    → falha: rollback call_queue para waiting
  → callback chega → deleta call_queue
```

