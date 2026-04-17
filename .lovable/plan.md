

## Plano: Seleção múltipla e re-execução de leads

### Objetivo
Permitir selecionar leads do histórico (24h ou ciclo) e disparar a ação configurada novamente para os selecionados — útil quando alguns falharam ou para re-enviar webhook a leads específicos.

### Alterações

**1. `supabase/functions/group-execution-processor/index.ts`**
- Adicionar suporte a payload `{ listId, leadIds: string[] }` para execução seletiva
- Quando `leadIds` for fornecido: buscar apenas esses leads (independente de status), resetar para `pending`, executar `executeAction` para cada, atualizar status individual
- Não atualizar `current_cycle_id` / `last_executed_at` da lista (re-execução pontual não rotaciona ciclo)
- Quando `leadIds` ausente: comportamento atual (lista inteira pendente)

**2. `src/hooks/useGroupExecutionList.ts`**
- Adicionar mutation `executeLeads` que invoca `group-execution-processor` com `{ listId, leadIds }`
- Invalida query de leads ao concluir

**3. `src/components/group-campaigns/tabs/ExecutionListTab.tsx`** — `ExecutionListDetail`
- Estado `selectedLeadIds: Set<string>`
- Adicionar coluna checkbox no `TableHeader` (select all da página atual) e em cada `TableRow`
- Botão "Executar Selecionados (N)" no header do card, ao lado de "Executar Agora"
  - Aparece somente quando `selectedLeadIds.size > 0`
  - Confirmação via `AlertDialog` reutilizando padrão existente
- Limpar seleção após execução bem-sucedida
- Manter "Executar Agora" inalterado (executa apenas pendentes do ciclo)

### Comportamento

- Usuário marca leads específicos (executados, falhados ou pendentes) → clica "Executar Selecionados" → backend reprocessa esses leads → toast de sucesso → lista atualiza via realtime mostrando novos status
- Funciona em listas 24h (cumulativas) e cíclicas
- Select-all marca apenas a página visível (consistente com paginação padrão do app)

