
# Corrigir referencia ambigua de operator_id na RPC

## Causa Raiz

A funcao `reserve_operator_for_call` retorna `TABLE(success boolean, operator_id uuid, operator_name text, operator_extension text, error_code text)`. A coluna `operator_id` no retorno cria uma variavel PL/pgSQL com o mesmo nome da coluna `call_logs.operator_id`. Quando a funcao faz:

```text
UPDATE call_logs
SET call_status = 'cancelled', ended_at = NOW()
WHERE operator_id = v_operator.id  -- AMBIGUO!
```

O PostgreSQL nao consegue distinguir se `operator_id` e a coluna da tabela ou a variavel de retorno. Isso causa erro em TODA execucao da RPC, impedindo qualquer reserva de operador. A fila fica parada em "aguardando operador" mesmo com operadores disponiveis.

## Solucao

Executar uma migration SQL para recriar a funcao `reserve_operator_for_call` com todas as referencias a `operator_id` qualificadas com o nome da tabela (`call_logs.operator_id`).

### Alteracoes na funcao:

Trocar todas as ocorrencias de `operator_id` desqualificado por `call_logs.operator_id` nos UPDATE statements:

Linha 1 (dentro do bloco do operador preferido):
```text
-- DE:
WHERE operator_id = v_operator.id
-- PARA:
WHERE call_logs.operator_id = v_operator.id
```

Linha 2 (dentro do bloco de operador generico):
```text
-- DE:
WHERE operator_id = v_operator.id
-- PARA:
WHERE call_logs.operator_id = v_operator.id
```

### Arquivo modificado

1. **Migration SQL** -- Recriar `reserve_operator_for_call` com referencias qualificadas

Nenhuma alteracao em arquivos do frontend ou edge functions e necessaria.
