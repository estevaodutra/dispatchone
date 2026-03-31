

## Plano: Parar execuções quando sequência for desativada

### Problema
Quando o usuário desativa uma sequência (toggle para "Inativa"), execuções já pausadas (`sequence_executions` com `status = 'paused'`) continuam sendo retomadas pelo scheduler. O bloco "PROCESS PAUSED EXECUTIONS" (linha 295) do `process-scheduled-messages` **não verifica** se a sequência pai ainda está `active = true`.

### Correção (2 pontos)

**1. Edge Function `process-scheduled-messages/index.ts` — Verificar `active` antes de retomar**

No loop de paused executions (linha 307), antes de retomar cada execução:
- Buscar a sequência pai (`message_sequences`) pelo `execution.sequence_id`
- Se `active = false`, marcar a execução como `cancelled` em vez de retomá-la
- Logar a decisão

**2. Hook `useSequences.ts` — Cancelar execuções pausadas ao desativar**

Quando `updates.active === false`, adicionar lógica no `updateSequenceMutation` para:
- Atualizar todas as `sequence_executions` com `status = 'paused'` e `sequence_id = id` para `status = 'cancelled'`
- Isso garante cancelamento imediato sem depender do próximo ciclo do scheduler

### Arquivos afetados

| Arquivo | Ação |
|---------|------|
| `supabase/functions/process-scheduled-messages/index.ts` | Checar `active` da sequência antes de retomar pausadas |
| `src/hooks/useSequences.ts` | Cancelar execuções pausadas ao desativar sequência |

