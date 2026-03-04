

## ✅ Manter lead na fila com status "Em Ligação" durante a chamada — IMPLEMENTADO

### Fluxo implementado

```text
call_queue (waiting) 
  → queue-processor disca 
  → call_queue (in_call) + call_log_id 
  → callback retorna status terminal 
  → call-status deleta de call_queue
```

### Alterações feitas

1. **Migração SQL** — Adicionada coluna `call_log_id UUID` na tabela `call_queue`
2. **queue-processor** — Substituído `delete` por `update({ status: 'in_call', call_log_id })` nas linhas 287 e 573
3. **call-status** — Adicionado `DELETE FROM call_queue WHERE call_log_id = callLog.id` em status terminais
4. **useCallQueue.ts** — Query agora busca `status IN ('waiting', 'in_call')`
5. **CallPanel.tsx** — Badge "🔄 Em Ligação" exibido para itens `in_call`, ações desabilitadas durante a ligação
