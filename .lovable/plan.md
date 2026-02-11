

# Alterar rotacao de operadores para round-robin sequencial

## Problema atual

O `queue-executor` seleciona o operador com maior tempo ocioso (`last_call_ended_at ASC`). Isso pode causar distribuicao desigual dependendo da duracao das chamadas.

## Nova logica

Round-robin sequencial simples:
1. Operador 1 recebe a ligacao
2. Operador 2 recebe a proxima
3. Operador 3 recebe a proxima
4. Quando todos ja receberam, volta para o Operador 1

## Como implementar

### `supabase/functions/queue-executor/index.ts` -- funcao `processTick`

Substituir a query atual que ordena por `last_call_ended_at` por uma logica baseada em um indice circular armazenado na tabela `queue_execution_state`.

**Logica:**

1. Buscar todos os operadores ativos e disponiveis, ordenados por `created_at ASC` (ordem fixa)
2. Ler o campo `current_operator_index` do `queue_execution_state` (novo campo, default 0)
3. Selecionar o operador na posicao `current_operator_index % total_operadores`
4. Apos atribuir a ligacao, incrementar `current_operator_index` no state

**Se o operador da vez nao estiver disponivel (em cooldown, on_call, paused):**
- Avanca para o proximo operador disponivel na sequencia circular
- Se nenhum estiver disponivel, aplica o comportamento `queue_unavailable_behavior` (wait/pause)

### Migracao de banco

Adicionar coluna `current_operator_index` na tabela `queue_execution_state`:

```sql
ALTER TABLE queue_execution_state
ADD COLUMN current_operator_index integer NOT NULL DEFAULT 0;
```

### Alteracoes no codigo

No `processTick`:

```text
ANTES:
  SELECT ... FROM call_campaign_operators
  WHERE status = 'available'
  ORDER BY last_call_ended_at ASC NULLS FIRST
  LIMIT 1

DEPOIS:
  1. SELECT todos operadores ativos ORDER BY created_at ASC
  2. Filtrar os com status 'available'
  3. Pegar o indice atual do state (current_operator_index)
  4. Iterar a partir desse indice no array circular ate achar um disponivel
  5. Atualizar current_operator_index = (indice_usado + 1) no state
```

No `startMutation` (hook `useQueueExecution.ts`):
- Resetar `current_operator_index: 0` ao iniciar a fila (ja faz upsert, basta incluir o campo)

### Tambem ajustar `useCallPanel.ts` (discagem manual)

Aplicar a mesma logica round-robin na discagem manual, usando o mesmo `current_operator_index` da campanha para manter consistencia entre discagem manual e automatica.

## Exemplo pratico

Operadores: A, B, C (ordenados por `created_at`)

| Ligacao | Index | Operador |
|---------|-------|----------|
| 1       | 0     | A        |
| 2       | 1     | B        |
| 3       | 2     | C        |
| 4       | 0     | A        |
| 5       | 1     | B        |

Se B estiver em cooldown na ligacao 5:
- Avanca para C (index 2), e o proximo index sera 0 (A)

