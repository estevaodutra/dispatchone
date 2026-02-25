

## Diagnóstico: Tentativas não estão sendo contabilizadas (sempre mostra 1/3)

### Causa raiz (dois problemas)

**Problema 1 — `call-dial` nunca define `attempt_number` nem `max_attempts`**

Quando o endpoint `call-dial` cria um `call_log` (linhas 457-471), ele **não define** `attempt_number` nem `max_attempts`. Ambos ficam como `null` no banco. O frontend exibe `attemptNumber: db.attempt_number ?? 1` e `maxAttempts: db.max_attempts ?? 1`, mostrando sempre "1/3" (onde 3 vem do fallback no `useOperatorCall`).

**Problema 2 — Chamadas que falham fora do endpoint `call-status` não disparam retry**

A lógica de retry (criar novo `call_log` com `attempt_number + 1`) só existe dentro de `call-status/index.ts` (linhas 556-650). Porém, quando uma chamada é cancelada por:
- **Self-healing** no `queue-executor` (marca `failed` diretamente no banco, linha 221)
- **Botão "Cancelar chamada"** no frontend (`cancelDialing` em `useOperatorCall.ts`)

...esses caminhos atualizam o status para `failed` **sem passar pelo endpoint `call-status`**, então o código de retry nunca executa e nenhuma nova tentativa é agendada.

### Solução

#### 1. `call-dial` — definir `attempt_number` e `max_attempts` na criação

**Arquivo:** `supabase/functions/call-dial/index.ts`

Ao criar um novo `call_log` (linha 459), adicionar:
```typescript
attempt_number: 1,
max_attempts: campaign.retry_count || 3,  // precisa incluir retry_count no SELECT da campanha
```

Ao atualizar um log existente (linha 440), preservar o attempt_number atual (não resetar).

Também expandir o `SELECT` da campanha (linha 305) para incluir `retry_count`:
```typescript
.select('id, name, status, user_id, dial_delay_minutes, company_id, retry_count')
```

#### 2. `queue-executor` — disparar retry após self-healing de dialing stuck

**Arquivo:** `supabase/functions/queue-executor/index.ts`

No bloco de self-healing de stuck dialing (linhas 216-224), após marcar o log como `failed`, adicionar lógica de retry similar à de `call-status`:
- Buscar `attempt_number` e `max_attempts` do log
- Buscar `retry_count` e `retry_interval_minutes` da campanha
- Se `currentAttempt < retryCount`, criar novo `call_log` com `attempt_number + 1` e `call_status: 'scheduled'`
- Atualizar o lead para `pending`
- Marcar o log original como `failed_rescheduled`

#### 3. Frontend `cancelDialing` — disparar retry

**Arquivo:** `src/hooks/useOperatorCall.ts`

Após cancelar a chamada no `cancelDialing`, invocar o endpoint `call-status` (em vez de atualizar diretamente) para que a lógica de retry execute:
```typescript
await supabase.functions.invoke('call-status', {
  body: {
    external_call_id: currentCall.id,
    status: 'failed',
    error_message: 'Cancelado: provedor não respondeu'
  }
});
```
Ou, alternativamente, manter a atualização direta mas chamar `reschedule-failed-calls` depois.

### Arquivos impactados

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/call-dial/index.ts` | Definir `attempt_number: 1` e `max_attempts` ao criar log; incluir `retry_count` no SELECT da campanha |
| `supabase/functions/queue-executor/index.ts` | Adicionar lógica de retry no self-healing de stuck dialing |
| `src/hooks/useOperatorCall.ts` | No `cancelDialing`, usar `call-status` endpoint ou invocar `reschedule-failed-calls` |

