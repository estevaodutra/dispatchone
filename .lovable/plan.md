
# Bloqueio contra operador com multiplas chamadas simultaneas

## Problema

O operador "Mauro" aparece em 2 chamadas simultaneas com status "Discando". A protecao atual funciona apenas na tabela `call_operators` (indice unico em `current_call_id` e trigger `check_operator_not_busy`), mas a tabela `call_logs` nao tem nenhuma restricao -- permitindo que logs antigos fiquem "presos" em status ativo enquanto o operador recebe uma nova chamada.

## Causa Raiz

Quando o `queue-executor` ou `dialNow` reserva um operador para uma nova chamada, o RPC `reserve_operator_for_call` atualiza `current_call_id` no operador, mas **nao cancela** logs anteriores desse operador que ainda estao em status ativo (`dialing`, `ringing`, etc).

## Solucao: Defesa em 3 camadas

### Camada 1 -- RPC `reserve_operator_for_call` (prevencao)

Antes de reservar o operador, o RPC deve cancelar automaticamente qualquer `call_log` ativo anterior desse operador. Isso garante que no momento da reserva, nao exista log ativo concorrente.

Adicionar ao inicio da funcao:
- `UPDATE call_logs SET call_status = 'cancelled' WHERE operator_id = v_operator.id AND call_status IN ('dialing','ringing','answered','in_progress') AND id != p_call_id`

### Camada 2 -- Trigger na tabela `call_logs` (barreira de banco)

Criar um trigger `BEFORE INSERT OR UPDATE` em `call_logs` que impede atribuir um `operator_id` se ja existir outro log ativo para aquele operador. Isso funciona como rede de seguranca caso algum caminho de codigo fure a Camada 1.

```text
BEFORE INSERT OR UPDATE ON call_logs
FOR EACH ROW
  IF NEW.operator_id IS NOT NULL
     AND NEW.call_status IN ('dialing','ringing','answered','in_progress')
  THEN
    IF EXISTS (
      SELECT 1 FROM call_logs
      WHERE operator_id = NEW.operator_id
        AND id != NEW.id
        AND call_status IN ('dialing','ringing','answered','in_progress')
    ) THEN
      -- Cancela os logs antigos em vez de bloquear
      UPDATE call_logs
      SET call_status = 'cancelled'
      WHERE operator_id = NEW.operator_id
        AND id != NEW.id
        AND call_status IN ('dialing','ringing','answered','in_progress');
    END IF;
  END IF;
```

O trigger opta por **cancelar automaticamente** os logs antigos (em vez de rejeitar o novo), porque rejeitar poderia travar a fila inteira se um log ficar preso.

### Camada 3 -- Frontend `dialNow` (prevencao no codigo)

No hook `useCallPanel`, antes de chamar o RPC `reserve_operator_for_call`, adicionar uma query que cancela call_logs ativos do operador que sera reservado. Isso reduz a chance de conflito antes mesmo de chegar ao banco.

## Arquivos Modificados

1. **Migration SQL** -- Alterar `reserve_operator_for_call` e criar trigger `trg_enforce_single_active_call`
2. **`src/hooks/useCallPanel.ts`** -- Adicionar limpeza preventiva no `dialNow`
3. **`supabase/functions/queue-executor/index.ts`** -- Adicionar limpeza preventiva antes de cada reserva

## Detalhes Tecnicos

### Migration SQL

```text
-- 1. Atualizar RPC reserve_operator_for_call
--    Adicionar UPDATE call_logs SET cancelled apos selecionar o operador, antes de reservar

-- 2. Criar trigger
CREATE OR REPLACE FUNCTION enforce_single_active_call()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.operator_id IS NOT NULL
     AND NEW.call_status IN ('dialing','ringing','answered','in_progress')
  THEN
    UPDATE call_logs
    SET call_status = 'cancelled',
        ended_at = NOW()
    WHERE operator_id = NEW.operator_id
      AND id != NEW.id
      AND call_status IN ('dialing','ringing','answered','in_progress');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_single_active_call
  BEFORE INSERT OR UPDATE ON call_logs
  FOR EACH ROW
  EXECUTE FUNCTION enforce_single_active_call();
```

### Codigo Frontend/Edge

Adicionar antes de cada chamada ao RPC:
```text
await supabase.from('call_logs')
  .update({ call_status: 'cancelled', ended_at: new Date().toISOString() })
  .eq('operator_id', operatorId)
  .in('call_status', ['dialing','ringing','answered','in_progress'])
  .neq('id', currentCallId);
```
