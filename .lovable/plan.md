

## Corrigir ligações presas em "Em Ligação" infinitamente

### Diagnóstico

A função `healStaleInCallItems` no `queue-processor` limpa itens da `call_queue` com status `in_call` **apenas** quando o `call_log` associado tem status terminal ou `ended_at` preenchido. Porém, se o provedor nunca envia o callback (call-status), o `call_log` permanece em `dialing`/`ringing`/`in_progress` para sempre, e consequentemente o item na fila fica como "Em Ligação" infinitamente.

A RPC `heal_stuck_operators` libera o operador após 10 min, mas **não** marca o `call_log` como `failed` nem remove o item da fila.

### Solução

Adicionar lógica de timeout na `healStaleInCallItems` para tratar `call_logs` ativos por tempo excessivo:

**Arquivo: `supabase/functions/queue-processor/index.ts`**

Na função `healStaleInCallItems`, após o loop existente, adicionar uma segunda verificação:
- Buscar itens `in_call` cujo `call_log` está em status ativo (`dialing`, `ringing`, `answered`, `in_progress`) com `started_at` há mais de 10 minutos
- Para esses call_logs: marcar como `failed` com nota "Timeout: provedor não respondeu", preencher `ended_at`
- Liberar o operador via RPC `release_operator`
- Reverter o lead para `waiting`
- Deletar o item da fila
- Invocar `reschedule-failed-calls` para que a retentativa funcione

Também adicionar limpeza direta de `call_logs` órfãos (sem item na fila) que estão em status ativo por mais de 10 minutos, para cobrir o caso onde o item da fila já foi removido mas o log permanece ativo.

### Alterações

1. **`supabase/functions/queue-processor/index.ts`** — expandir `healStaleInCallItems` com timeout de 10 min para call_logs ativos sem callback

