

## Plano: Lista 24h — Sem card "Janela" e Modo Cumulativo

### Problema
Listas configuradas como "Tempo Integral (24h)" mostram um card de "Janela" (00:00 → 23:59) e "Janela fecha em" que não fazem sentido, já que a janela está sempre aberta. Além disso, ao executar, o ciclo é resetado gerando um novo `cycle_id`, o que limpa os leads acumulados. Para listas 24h, o comportamento correto é cumulativo: leads são acumulados indefinidamente e só saem quando executados.

### Detecção de Fulltime
Uma lista é "fulltime" quando `window_type === "fixed"` e `window_start_time` é `"00:00"` e `window_end_time` é `"23:59"`. Essa verificação já existe no dialog de config.

### Alterações

**`src/components/group-campaigns/tabs/ExecutionListTab.tsx`**

1. Adicionar helper `isFulltime(list)` que detecta lista 24h
2. No grid de métricas do `ExecutionListDetail`:
   - Esconder o card "Janela fecha em" (countdown) para listas fulltime
   - Substituir o card "Janela" por "Modo: Cumulativo" (ícone Infinity ou similar)
   - Manter cards "Leads no ciclo" e "Ação configurada"
3. Ajustar label: se fulltime, mostrar "Total de leads" em vez de "Leads no ciclo"

**`supabase/functions/group-execution-processor/index.ts`**

1. Após executar os leads, verificar se a lista é fulltime (start=00:00, end=23:59)
2. Se fulltime: **não** gerar novo `cycle_id` — manter o mesmo ciclo, apenas atualizar `last_executed_at`
3. Se não fulltime: comportamento atual (novo ciclo + nova janela)

Isso garante que listas com janela específica resetam o ciclo normalmente, enquanto listas 24h acumulam leads continuamente.

