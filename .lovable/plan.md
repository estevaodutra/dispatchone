

# Fix: Operador travado como "Em ligação" com chamada em status inconsistente

## Diagnostico

O operador "Mauro Dutra" esta com status `on_call` e `current_call_id` apontando para um call_log com status `waiting_operator`. Isso e um estado inconsistente: o operador foi reservado mas a chamada nunca progrediu para `dialing`.

A funcao `heal_stuck_operators` nao resolve isso porque so verifica status terminais (`completed`, `failed`, etc.) e o timeout de 10 minutos. O status `waiting_operator` nao e terminal nem ativo — e um limbo.

## Solucao

Atualizar a RPC `heal_stuck_operators` para tambem liberar operadores cujo `current_call_id` aponta para chamadas em status nao-ativo (`waiting_operator`, `ready`, `scheduled`). Esses status indicam que a chamada nunca iniciou de fato.

### Migration SQL

Adicionar um Case 5 na funcao `heal_stuck_operators`:

```sql
CREATE OR REPLACE FUNCTION public.heal_stuck_operators(...)
-- Dentro do WHERE, adicionar:
OR
-- Case 5: call in non-active state (never actually started)
EXISTS (
  SELECT 1 FROM call_logs cl
  WHERE cl.id = op.current_call_id
    AND cl.call_status IN ('waiting_operator', 'ready', 'scheduled')
)
```

Isso libera imediatamente operadores vinculados a chamadas que nunca sairam do estagio de pre-discagem.

### Correcao imediata dos dados

Executar um UPDATE direto para corrigir o estado atual do operador travado, sem esperar pelo proximo ciclo de manutencao.

### Arquivos alterados

| Tipo | Descricao |
|------|-----------|
| Migration SQL | Atualizar RPC `heal_stuck_operators` para tratar status `waiting_operator`, `ready`, `scheduled` |

Nenhuma alteracao de frontend necessaria — o ciclo de manutencao ja roda a cada 15 segundos e vai resolver automaticamente apos a correcao da RPC.

