

## Corrigir: Item "Em Ligação" fantasma permanece na fila

### Causa raiz

Dois problemas no `healStaleInCallItems`:

1. **Posicionamento**: A chamada a `healStaleInCallItems` (linha 228) está **depois** do early return "No active queues" (linha 212). Quando nenhuma campanha está `running`, o processador retorna antes de executar a limpeza. O item stale nunca é removido.

2. **Lista de status terminais incompleta**: O array `terminalStatuses` não inclui status como `voicemail_rescheduled`, `cancelled_rescheduled`, `no_answer_rescheduled` — que são status finais no contexto do item de fila.

### Solução

**Arquivo: `supabase/functions/queue-processor/index.ts`**

1. Mover a chamada `healStaleInCallItems` para **antes** do early return em `processGlobalTick` (entre a verificação de activeStates e o return)
2. Expandir `terminalStatuses` para incluir todos os status que indicam que a chamada já foi processada: adicionar `voicemail_rescheduled`, `cancelled_rescheduled`, `no_answer_rescheduled`, `voicemail`, `answered`, `completed_rescheduled`

