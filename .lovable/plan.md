

## Plano: Adicionar evento "Saída do grupo" nos eventos monitoráveis

### Alteração

**`src/components/group-campaigns/dialogs/ExecutionListConfigDialog.tsx`**
- Adicionar `{ value: "group_leave", label: "Saída do grupo (group_leave)" }` ao array `EVENT_OPTIONS` (linha 39, após `group_join`)

Nenhuma outra alteração necessária — o webhook-inbound já classifica eventos `group_leave` e o array `monitored_events` é salvo dinamicamente.

