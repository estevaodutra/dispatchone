

# Corrigir Discagem em Massa: Fila Sequencial por Operador

## Problema

O botao "Discar" em massa executa `dialNow` em loop rapido para todas as ligacoes selecionadas. Embora use `await`, cada `dialNow` apenas dispara o webhook e retorna -- nao espera a chamada terminar. Resultado: todas as ligacoes sao disparadas quase simultaneamente.

## Solucao

Substituir a logica de loop direto por um enfileiramento real: as ligacoes selecionadas sao preparadas como `ready` e o sistema de fila (`queue-executor`) processa uma por vez, respeitando round-robin de operadores e intervalos de cooldown.

## Fluxo Proposto

```text
Usuario seleciona 5 ligacoes -> Clica "Discar em Massa"
       |
       v
  Atualiza status das 5 para "ready" no banco
  (operator_id = NULL para atribuicao automatica)
       |
       v
  Inicia/retoma a fila da campanha via queue-executor
       |
       v
  queue-executor processa uma por vez:
    -> Busca operador disponivel (round-robin)
    -> Disca para o proximo lead "ready"
    -> Aguarda intervalo de cooldown
    -> Proximo lead
```

## Alteracoes Tecnicas

### 1. `src/pages/CallPanel.tsx` (botao "Discar" em massa)

Substituir o loop `for (const e of toDial) { await dialNow(e.id); }` por:

- Agrupar as ligacoes selecionadas por `campaignId`
- Para cada grupo:
  - Atualizar em batch o status para `ready` e `scheduled_for = now()` (via mutation)
  - Chamar o `queue-executor` com action `tick` para iniciar o processamento (ou garantir que a fila da campanha esteja rodando)
- Exibir toast informando quantas ligacoes foram enfileiradas
- A fila do `queue-executor` cuida do resto (uma por vez, round-robin, cooldown)

### 2. `src/hooks/useCallPanel.ts` (nova mutation)

Criar `bulkEnqueueMutation`:
- Recebe `{ callIds: string[] }`
- Agrupa por `campaign_id`
- Para cada campanha, faz UPDATE em batch: `call_status = 'ready', scheduled_for = now(), operator_id = NULL`
- Garante que `queue_execution_state` da campanha esteja com status `running` (upsert)

### 3. Nenhuma alteracao no `queue-executor`

A edge function ja processa leads com status `scheduled`/`ready` um por vez com round-robin. A unica mudanca e que agora as ligacoes selecionadas entram na fila como `ready` e o executor as processa sequencialmente.

## Resultado

- As ligacoes selecionadas entram na fila de processamento
- O sistema disca uma por vez, atribuindo operador via round-robin
- Respeita intervalos de cooldown entre chamadas
- Se nenhum operador estiver disponivel, aguarda ou pausa conforme configuracao da campanha

