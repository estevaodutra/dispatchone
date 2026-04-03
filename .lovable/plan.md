

## Plano: Adicionar agendamento de execução na Lista de Execução

### Contexto
Atualmente a execução ocorre automaticamente quando a janela de tempo expira (`current_window_end <= now()`). O usuário quer poder agendar **quando** a execução dos leads pendentes deve rodar — por exemplo, todo dia às 10h, ou em um horário específico.

### Alterações

**1. Migration — Novas colunas em `group_execution_lists`**
```sql
ALTER TABLE public.group_execution_lists
  ADD COLUMN execution_schedule_type text NOT NULL DEFAULT 'window_end',
  ADD COLUMN execution_scheduled_time text,
  ADD COLUMN execution_days_of_week integer[];
```
- `execution_schedule_type`: `"window_end"` (comportamento atual — executa ao fim da janela) | `"scheduled"` (executa em horário fixo)
- `execution_scheduled_time`: horário fixo para execução (ex: `"10:00"`)
- `execution_days_of_week`: dias da semana (0=Dom, 1=Seg...6=Sáb), null = todos os dias

**2. `src/components/group-campaigns/dialogs/ExecutionListConfigDialog.tsx`**
- Adicionar seção "Agendamento da Execução" após a seção de "Ação ao Executar"
- RadioGroup com duas opções:
  - "Ao fim da janela" — executa automaticamente quando a janela de tempo encerra (padrão atual)
  - "Horário agendado" — executa em horário fixo, exibe campo de hora e checkboxes para dias da semana
- Propagar os novos campos no `onSave` e preencher via `existing` no `useEffect`

**3. `src/hooks/useGroupExecutionList.ts`**
- Adicionar `execution_schedule_type`, `execution_scheduled_time`, `execution_days_of_week` na interface `GroupExecutionList`
- Incluir os novos campos nos mutations `createList` e `updateList`

**4. `supabase/functions/group-execution-processor/index.ts`**
- Ajustar a query de busca de listas prontas:
  - Para `execution_schedule_type = "window_end"`: manter lógica atual (`current_window_end <= now()`)
  - Para `execution_schedule_type = "scheduled"`: verificar se o horário agendado já passou hoje e se o dia da semana é permitido
- Após execução, recalcular `current_window_start/end` sem alterar o schedule

### Arquivos
- Migration SQL (nova)
- `src/components/group-campaigns/dialogs/ExecutionListConfigDialog.tsx`
- `src/hooks/useGroupExecutionList.ts`
- `supabase/functions/group-execution-processor/index.ts`

