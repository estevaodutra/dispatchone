

## Corrigir: Item "Em Ligação" na fila não corresponde ao lead sendo discado

### Diagnóstico

O popup mostra "André" (call_log agendado de "FN | Abandono de Funil"), mas na fila o item #4 "Sem nome" (de outra campanha) aparece com badge "Em Ligação". São leads diferentes.

O que acontece:
1. O `processScheduledCallLogs` processa "André" diretamente da `call_logs` — **sem tocar na `call_queue`**
2. O item #4 na `call_queue` ficou com `status: 'in_call'` de uma execução anterior, cujo callback de status (`call-status`) não removeu corretamente o item (possivelmente falha no webhook de callback, ou o `call_log_id` não bateu)
3. Como há apenas 1 operador, não é possível haver duas ligações simultâneas — o item #4 é **stale**

### Solução

**Arquivo: `supabase/functions/queue-processor/index.ts` (dentro de `processGlobalTick`, após heal_stuck_operators)**

Adicionar um passo de limpeza de itens `in_call` stale na `call_queue`. Antes de processar a fila:

1. Buscar todos os itens da `call_queue` com `status = 'in_call'` para a empresa
2. Para cada um que tem `call_log_id`, verificar se o `call_log` associado já tem status terminal (`completed`, `no_answer`, `failed`, `cancelled`, `busy`, `voicemail`, `timeout`)
3. Se sim → deletar o item da fila (limpeza de stale)
4. Se o item `in_call` não tem `call_log_id` e foi criado há mais de 10 minutos → deletar também (safety net)

Isso garante que itens "fantasma" não fiquem na fila confundindo o operador.

### Arquivos alterados

- **`supabase/functions/queue-processor/index.ts`**: Adicionar função `healStaleInCallItems(supabase, companyId)` e chamá-la em `processGlobalTick` logo após `heal_stuck_operators`

