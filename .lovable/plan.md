
# Operadores Atomicos: Eliminar Race Conditions e Stuck States

## Resumo

Implementar operacoes atomicas no banco de dados para atribuicao e liberacao de operadores, resolver cooldowns de forma independente da fila, e adicionar self-healing automatico. Isso elimina race conditions, operadores presos e ligacoes duplicadas.

## Fase 1: Funcoes RPC no Banco de Dados (Migration)

Criar 5 funcoes PostgreSQL atomicas e 1 indice unico:

### 1.1 Indice UNIQUE parcial em `current_call_id`
Impede fisicamente que dois operadores sejam atribuidos a mesma chamada.

```sql
CREATE UNIQUE INDEX idx_operator_unique_call
ON call_operators (current_call_id)
WHERE current_call_id IS NOT NULL;
```

### 1.2 `reserve_operator_for_call(p_call_id, p_campaign_id, p_preferred_operator_id)`
- Usa `FOR UPDATE SKIP LOCKED` para travar a linha atomicamente
- Define status como `'on_call'` (nao usar `dialing` como status separado do operador -- o `dialing` ja existe como status do `call_log`, manter simples)
- Verifica `current_call_id IS NULL` como double-check
- Retorna `success, operator_id, operator_name, operator_extension, error_code`

### 1.3 `release_operator(p_call_id, p_force)`
- Busca operador por `current_call_id`
- Calcula intervalo (pessoal > campanha > padrao 30s)
- Define status para `cooldown` ou `available`
- Limpa `current_call_id`, `current_campaign_id`
- Seta `last_call_ended_at`

### 1.4 `resolve_cooldowns()`
- Atualiza operadores em `cooldown` cujo tempo ja expirou para `available`
- Independente de qualquer fila ou tick

### 1.5 `heal_stuck_operators(p_stuck_threshold_minutes)`
- Libera operadores `on_call` cujo `current_call_id` aponta para chamada terminada ou inexistente
- Libera operadores `on_call` ha mais de N minutos (padrao 10)
- Retorna lista de operadores liberados

### 1.6 Trigger `check_operator_not_busy`
- `BEFORE UPDATE` em `call_operators`
- Impede atribuir `current_call_id` se operador ja tem outro `current_call_id` diferente
- Levanta excecao explicita

## Fase 2: Atualizar Queue-Executor (Edge Function)

### Arquivo: `supabase/functions/queue-executor/index.ts`

Substituir a logica de atribuicao direta por chamadas RPC:

- **Atribuicao**: Trocar o bloco de `SELECT available operators` + `UPDATE call_operators` por `supabase.rpc('reserve_operator_for_call', { p_call_id, p_campaign_id })`
- **Self-healing**: Trocar o bloco manual (linhas 154-186) por `supabase.rpc('heal_stuck_operators', { p_stuck_threshold_minutes: 10 })`
- **Cooldown**: Trocar o bloco manual (linhas 189-208) por `supabase.rpc('resolve_cooldowns')`
- Manter a logica de round-robin e webhook intacta

## Fase 3: Atualizar Call-Status (Edge Function)

### Arquivo: `supabase/functions/call-status/index.ts`

Substituir a logica de liberacao (linhas 518-555) por:

```
supabase.rpc('release_operator', { p_call_id: callLog.id })
```

Remove o calculo manual de intervalo e a query com guard de `current_call_id`.

## Fase 4: Atualizar dialNow no Frontend

### Arquivo: `src/hooks/useCallPanel.ts`

Na mutacao `dialNow` (linhas 425-597):
- Substituir a busca e atribuicao manual de operador por `supabase.rpc('reserve_operator_for_call', { p_call_id, p_campaign_id })`
- Se a RPC retornar `no_operator_available`, enfileirar como `waiting_operator`
- Se o webhook falhar, chamar `supabase.rpc('release_operator', { p_call_id, p_force: true })` para rollback

## Fase 5: Resolucao Independente de Cooldown

### Arquivo: `src/hooks/useQueueExecution.ts`

Adicionar chamada a `resolve_cooldowns()` no loop global `tickAll`, garantindo que cooldowns sejam resolvidos mesmo quando nenhuma campanha esta ativa:

- No `useQueueExecutionSummary`, chamar `supabase.rpc('resolve_cooldowns')` e `supabase.rpc('heal_stuck_operators')` a cada tick (15s), independente de haver campanhas ativas

## Fase 6: Toggle de Operador durante Cooldown

### Arquivo: `src/components/call-panel/OperatorsPanel.tsx`

- Remover restricao `isToggleDisabled` para cooldown (permitir toggle OFF durante cooldown)
- Manter restricao apenas para `!operator.isActive`
- Ao alternar OFF durante `on_call`, mostrar confirmacao e forcar liberacao
- Ao alternar ON durante `cooldown`, forcar status para `available`

## Diagrama do Novo Fluxo

```text
+-----------+     toggle ON     +------------+
|  OFFLINE  | ----------------> | AVAILABLE  | <----+
+-----------+                   +------------+      |
      ^                              |              |
      |                  RPC atomico |              |
      | toggle OFF       (reserve)   |              |
      | (qualquer                    v              |
      |  estado)              +------------+        |
      +---------------------- |  ON_CALL   |        |
                              +------------+        |
                                    |               |
                      chamada termina               |
                      RPC: release_operator         |
                                    |               |
                              +----------+          |
                      SIM <-- | interval |          |
                       |      | > 0?     | --> NAO--+
                       v      +----------+
                +------------+
                |  COOLDOWN  |
                +------------+
                       |
          resolve_cooldowns() (15s)
          ou toggle forcado
                       |
                       +-------------------------->+
```

```text
SELF-HEALING (roda a cada 15s, independente da fila):

  - Cooldown expirado -> available (resolve_cooldowns)
  - on_call sem chamada ativa -> available (heal_stuck)
  - on_call ha > 10 min -> available (heal_stuck)
```

## Garantias

| Problema | Solucao | Garantia |
|----------|---------|----------|
| Race condition | FOR UPDATE SKIP LOCKED | Uma operacao por operador |
| Operador em 2 chamadas | UNIQUE index + trigger | Impossivel no banco |
| Cooldown preso | resolve_cooldowns() independente | Resolve sem fila ativa |
| Operador stuck | heal_stuck_operators() | Liberacao automatica |
| Guard silencioso | RPC com FOR UPDATE | Sempre libera ou retorna erro |
| Toggle travado | Sempre habilitado | Admin tem controle total |
| Webhook falha | Rollback via release_operator | Operador volta a available |
