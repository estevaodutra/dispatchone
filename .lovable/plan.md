

## Diagnóstico

O sistema possui **3 mecanismos internos** que alteram o status de ligações sem input externo:

1. **queue-executor 0b (linhas 187-204)**: Reverte call_logs em `dialing/ringing` sem operador para `ready` após 2 minutos
2. **queue-executor 0c (linhas 206-268)**: Marca call_logs em `dialing` com operador como `failed` após 3 minutos, libera operador, e agenda retry
3. **heal_stuck_operators RPC (Case 4)**: Libera operadores "stuck" baseado em tempo (>10 min sem atualização) — uma suposição temporal
4. **Frontend maintenance (useQueueExecution.ts linhas 150-151)**: Chama `heal_stuck_operators` a cada 10 segundos

Todos esses são "suposições" que conflitam com o princípio de que somente o provedor (via n8n → `/call-status`) deve atualizar status.

## Solução

Remover toda lógica que altera `call_status` por suposição. Manter apenas: reserva de operador, cooldown timer, e respostas diretas do webhook.

### 1. `supabase/functions/queue-executor/index.ts`

- **Remover bloco 0b inteiro (linhas 187-204)**: Não reverter orphan logs para `ready`. Se estão em `dialing` sem operador, o `/call-status` vai resolver.
- **Remover bloco 0c inteiro (linhas 206-268)**: Não marcar stuck dialing como `failed`. O provedor vai mandar o status real via callback.
- **Manter bloco 0 (heal_stuck_operators)**: Mas ajustar a RPC para remover o Case 4 (time-based).
- **Manter fireDialWebhook**: A resposta `operator_unavailable` é feedback real do provedor. Na falha de webhook (rede), liberar operador mas **não alterar** `call_status`.

### 2. `heal_stuck_operators` RPC — Migração SQL

Remover **Case 4** (stuck too long by time). Manter apenas os cases que verificam estado real do banco:
- Case 1: `current_call_id` é NULL (inconsistente)
- Case 2: Call já em status terminal no banco
- Case 3: Call não existe
- Case 5: Call em estado não-ativo (waiting_operator, ready, scheduled)

### 3. `src/hooks/useQueueExecution.ts`

- **Remover** chamada a `heal_stuck_operators` da função `runMaintenance` (linha 151)
- **Manter** `resolve_cooldowns` (é timer de operador, não suposição de status)

### 4. `supabase/functions/queue-executor/index.ts` — fireDialWebhook

Na falha de webhook (catch, linha 668-672): liberar operador mas **não alterar** `call_status` — a ligação fica como `dialing` e o provedor/n8n resolverá.

---

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/queue-executor/index.ts` | Remover blocos 0b e 0c de self-healing; ajustar catch do webhook para não alterar call_status |
| `src/hooks/useQueueExecution.ts` | Remover chamada a `heal_stuck_operators` do maintenance |
| Migração SQL | Remover Case 4 (time-based) da RPC `heal_stuck_operators` |

