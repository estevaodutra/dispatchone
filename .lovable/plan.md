

## Manter lead na fila com status "Em Ligação" durante a chamada

### Problema atual
Quando o `queue-processor` disca um lead, ele **deleta** o item da `call_queue` imediatamente (linhas 287 e 573). O lead some da aba "Fila" e aparece apenas em "Em Andamento". O callback (`call-status`) não tem noção da `call_queue`.

### Solução

**1. Backend: `queue-processor/index.ts`** — Em vez de deletar o item, atualizar o status para `'in_call'` e salvar o `call_log_id` associado:
- Linha 287: trocar `delete` por `update({ status: 'in_call', call_log_id: callLog.id })`
- Linha 573: mesma alteração no fluxo legacy per-campaign

**2. Migração SQL** — Adicionar coluna `call_log_id UUID` na tabela `call_queue` para vincular o item ao call_log ativo. Atualizar o `queue_get_next_v2` para continuar ignorando itens `in_call` (já filtra por `status = 'waiting'`, OK).

**3. Backend: `call-status/index.ts`** — Após processar um status terminal (completed, no_answer, failed, busy, etc.), deletar o item correspondente da `call_queue` usando o `call_log_id`:
```sql
DELETE FROM call_queue WHERE call_log_id = callLog.id
```

**4. Frontend: `CallPanel.tsx`** — Na aba "Fila":
- Buscar items com status `'waiting'` E `'in_call'`
- Itens com `status = 'in_call'` exibem badge "🔄 Em Ligação" na linha, com estilo visual diferenciado (ex: fundo azul sutil)
- A contagem da fila inclui ambos os status

**5. Frontend: `useCallQueue.ts`** — Ajustar a query de items para incluir `status IN ('waiting', 'in_call')` em vez de apenas `'waiting'`.

### Resumo do fluxo novo

```text
call_queue (waiting) 
  → queue-processor disca 
  → call_queue (in_call) + call_log_id 
  → callback retorna status terminal 
  → call-status deleta de call_queue
```

O lead permanece visível na fila com indicação visual de que está em ligação, e só sai quando o resultado chega pelo callback.

