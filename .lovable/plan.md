

# Corrigir Atribuicoes Duplicadas de Operadores

## Problema

As RPCs atomicas ja existem no banco de dados e sao usadas no `dialNow` e no `queue-executor`. Porem, existem **5 locais no frontend** (`useCallPanel.ts`) e **1 no OperatorsPanel** que ainda fazem `SELECT + UPDATE` manual na tabela `call_operators`, contornando as protecoes atomicas. Isso permite que operadores sejam liberados/atribuidos de forma nao-atomica, criando inconsistencias.

## Locais com Codigo Manual (a corrigir)

### 1. `cancelCallMutation` (linha ~222)
Faz `.update({ status: "available", current_call_id: null })` direto no operador.
**Correcao:** Substituir por `supabase.rpc('release_operator', { p_call_id: callId, p_force: true })`

### 2. `bulkUpdateOperatorMutation` (linha ~287)
Libera operador manualmente ao reatribuir chamadas stuck.
**Correcao:** Substituir por `supabase.rpc('release_operator', { p_call_id: callId, p_force: true })`

### 3. `bulkEnqueueMutation` (linha ~358)
Faz `SELECT .in("current_call_id", ids)` seguido de `UPDATE .in("id", ...)` para liberar operadores em lote.
**Correcao:** Iterar pelos IDs e chamar `release_operator` para cada um, ou criar uma query por call_id

### 4. `registerActionMutation` (linha ~588)
Faz `SELECT .eq("current_call_id", callId)` seguido de `UPDATE .in("id", ...)`.
**Correcao:** Substituir por `supabase.rpc('release_operator', { p_call_id: callId, p_force: true })`

### 5. `OperatorsPanel.tsx` toggle off durante `on_call` (linha ~211)
Faz update manual de `current_call_id: null`.
**Correcao:** Chamar `release_operator` RPC com `p_force: true` antes de setar offline

## Detalhes Tecnicos

### Arquivo: `src/hooks/useCallPanel.ts`

**cancelCallMutation** -- Trocar:
```text
.from("call_operators")
.update({ status: "available", current_call_id: null, current_campaign_id: null })
.eq("id", entry.operatorId)
```
Por:
```text
await supabase.rpc('release_operator', { p_call_id: callId, p_force: true })
```

**bulkUpdateOperatorMutation** -- Mesma troca para cada chamada stuck.

**bulkEnqueueMutation** -- Trocar o bloco `SELECT .in() + UPDATE .in()` por um loop que chama `release_operator` para cada `callId`:
```text
for (const id of ids) {
  await supabase.rpc('release_operator', { p_call_id: id, p_force: true });
}
```

**registerActionMutation** -- Trocar o bloco `SELECT .eq("current_call_id") + UPDATE .in()` por:
```text
await supabase.rpc('release_operator', { p_call_id: callId, p_force: true })
```

### Arquivo: `src/components/call-panel/OperatorsPanel.tsx`

No handler de toggle off durante `on_call`, chamar `release_operator` RPC com force antes de setar offline.

## Resultado Esperado

Apos essas correcoes, **todas** as transicoes de estado de operadores passarao pelas RPCs atomicas, eliminando a possibilidade de atribuicoes duplicadas por race condition em qualquer fluxo do sistema.

