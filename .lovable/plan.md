
# Corrigir Erro de Foreign Key ao Salvar Sequencias

## Problema

A funcao `saveAllSteps` (em `useDispatchSteps.ts`) apaga todos os steps existentes e recria-os ao salvar. Porem, a tabela `dispatch_sequence_logs` possui uma foreign key (`step_id`) apontando para `dispatch_sequence_steps.id`. Quando existem logs referenciando steps, o DELETE falha com:

```
update or delete on table "dispatch_sequence_steps" violates foreign key constraint
```

## Solucao

Alterar a foreign key para usar `ON DELETE SET NULL`. Assim, quando steps forem deletados, o campo `step_id` nos logs sera definido como NULL em vez de bloquear a operacao. Isso e seguro porque `step_id` ja e nullable na tabela `dispatch_sequence_logs`.

### Mudanca no banco de dados

Uma migration SQL para:

1. Remover a constraint existente `dispatch_sequence_logs_step_id_fkey`
2. Recriar com `ON DELETE SET NULL`

```sql
ALTER TABLE dispatch_sequence_logs
  DROP CONSTRAINT dispatch_sequence_logs_step_id_fkey;

ALTER TABLE dispatch_sequence_logs
  ADD CONSTRAINT dispatch_sequence_logs_step_id_fkey
  FOREIGN KEY (step_id) REFERENCES dispatch_sequence_steps(id)
  ON DELETE SET NULL;
```

Nenhuma alteracao de codigo e necessaria. O fluxo de salvar sequencias voltara a funcionar normalmente.
