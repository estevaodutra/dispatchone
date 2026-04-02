

## Plano: Mostrar "Criar Grupo" apenas em sequências agendadas

### Problema
A opção "Criar Grupo" aparece para todos os tipos de sequência, mas só faz sentido em sequências com gatilho de agendamento (`scheduled_once`, `scheduled_recurring`, `manual`).

### Solução
Passar o `triggerType` para o `NewMessageDialog` e filtrar o item `group_create` da categoria "Gestão de Grupo" quando o gatilho não for de agendamento.

### Alterações

**1. `src/components/group-campaigns/sequences/NewMessageDialog.tsx`**
- Adicionar prop `triggerType?: string` na interface
- Filtrar `group_create` de `CATEGORIES` quando `triggerType` não for `"scheduled_once"`, `"scheduled_recurring"` ou `"manual"`

**2. `src/components/group-campaigns/sequences/TimelineSequenceBuilder.tsx`**
- Passar `triggerType={triggerType}` ao `NewMessageDialog`

2 arquivos, ~5 linhas alteradas.

