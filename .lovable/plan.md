
## Plano: Lista 24h cumulativa exibe histórico processado

### Problema
A lista "Entrada de Lead" é configurada como **24h cumulativa** (window 00:00→23:59) com execução **imediata**. Os leads `group_join` são capturados corretamente (28+ registros no banco, todos com status `executed`), mas a UI mostra "0 leads no ciclo" e "Nenhum lead capturado neste ciclo ainda".

**Causa**: O hook `useListLeads` filtra por `cycle_id = current_cycle_id`. Em listas 24h, cada lead acabou recebendo um `cycle_id` diferente (pelo histórico de execuções anteriores), então só aparecem os do ciclo atual — que costuma ficar vazio porque cada lead novo é processado imediatamente.

### Solução

Para listas **24h cumulativas**, exibir o histórico completo das **últimas 24 horas**, ignorando `cycle_id`. Para listas com janela normal, manter o comportamento atual (filtro por `cycle_id`).

### Alterações

**1. `src/hooks/useGroupExecutionList.ts`** — `useListLeads`
- Adicionar parâmetro `isFulltime: boolean`
- Quando `isFulltime = true`: query por `list_id` apenas, com filtro `created_at >= now() - 24h`, ignorando `cycle_id`
- Quando `isFulltime = false`: comportamento atual (`list_id` + `cycle_id`)

**2. `src/components/group-campaigns/tabs/ExecutionListTab.tsx`** — `ExecutionListDetail`
- Passar `isFulltime` para `useListLeads`
- Atualizar contador "Total de leads" para usar `leads.length` (todos das últimas 24h) em vez de `pendingLeads.length` quando fulltime
- Manter botão "Executar Agora" desabilitado quando não há `pending` (já correto)
- Adicionar coluna mostrando hora completa (`dd/MM HH:mm`) em vez de só `HH:mm` para listas 24h, já que abrange dia inteiro

### Comportamento resultante

- Lista "Entrada de Lead" passa a exibir os 28+ leads das últimas 24h, com seus status (`executed`, `pending`, `failed`)
- Card "Total de leads" mostra o total acumulado em 24h
- Cada novo `group_join` aparece em tempo real (já existe Realtime subscription)
- Listas com janela normal (não-24h) continuam isoladas por ciclo, sem mudança

### Fora de escopo

- Não vamos alterar a lógica de `cycle_id` no `group-execution-processor` (já está correta para fulltime — só atualiza `last_executed_at`). A discrepância de cycle_ids no histórico é resíduo de execuções antigas.
