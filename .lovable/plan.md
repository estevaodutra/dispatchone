

## Plano: Adicionar opção "Execução Imediata" na Lista de Execução

### Objetivo
Incluir uma terceira opção de agendamento — "Execução imediata" — que processa cada lead assim que ele é capturado, sem aguardar o fim da janela ou um horário agendado.

### Alterações

**1. `src/components/group-campaigns/dialogs/ExecutionListConfigDialog.tsx`**
- Adicionar opção `immediate` no RadioGroup de "Agendamento da Execução" (ícone `Zap`, label "Execução imediata")
- Atualizar tipo do state `execScheduleType` para incluir `"immediate"`
- Adicionar texto descritivo: "Cada lead será processado imediatamente ao ser capturado."
- Atualizar `onSave` para aceitar `execution_schedule_type: "immediate"`

**2. `src/hooks/useGroupExecutionList.ts`**
- Atualizar o tipo `execution_schedule_type` na interface `GroupExecutionList` e nos parâmetros de `createList`/`updateList` para incluir `"immediate"`

**3. `supabase/functions/group-execution-processor/index.ts`**
- No filtro de listas prontas para execução, tratar `execution_schedule_type === "immediate"` — sempre incluir na execução (sem filtro de janela/horário)

**4. `supabase/functions/webhook-inbound/index.ts`** (ou função que captura eventos)
- Quando um lead é inserido em uma lista com `execution_schedule_type === "immediate"`, invocar o `group-execution-processor` imediatamente passando `list_id`

### Arquivos
- `src/components/group-campaigns/dialogs/ExecutionListConfigDialog.tsx`
- `src/hooks/useGroupExecutionList.ts`
- `supabase/functions/group-execution-processor/index.ts`
- Função de ingestão de eventos (webhook-inbound ou equivalente) — para trigger imediato

