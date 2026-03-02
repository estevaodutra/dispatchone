

## Plano: Fila Única — Simplificação Total

### Diagnóstico

O sistema atual tem 3 fontes de leads para discagem (`call_queue` → `call_logs` ready → `call_leads` pending), 5 hooks no frontend, e a integração entre eles falha silenciosamente. A proposta do usuário está correta: unificar tudo em uma tabela + um hook + um processador.

### Alterações

**1. Migration: Reestruturar `call_queue`**

Recriar a tabela com campos auto-suficientes (phone, lead_name direto na fila), SERIAL para position, constraint de unicidade, e source para rastrear origem.

```sql
DROP TABLE IF EXISTS call_queue CASCADE;

CREATE TABLE call_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  campaign_id UUID NOT NULL REFERENCES call_campaigns(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES call_leads(id) ON DELETE SET NULL,
  phone VARCHAR(20) NOT NULL,
  lead_name VARCHAR(255),
  position SERIAL,
  is_priority BOOLEAN DEFAULT false,
  scheduled_for TIMESTAMPTZ,
  attempt_number INT DEFAULT 1,
  max_attempts INT DEFAULT 3,
  observations TEXT,
  status VARCHAR(20) DEFAULT 'waiting',
  source VARCHAR(50) DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, campaign_id, phone, attempt_number)
);

ALTER TABLE call_queue ENABLE ROW LEVEL SECURITY;
-- Re-criar as mesmas RLS policies
```

**2. Edge Function: `queue-processor`** (nova, substitui `queue-executor`)

Lógica linear e simples:
1. Verificar `queue_execution_state` — está rodando?
2. `heal_stuck_operators` + `resolve_cooldowns` (RPCs existentes)
3. Buscar operador disponível (round-robin)
4. `SELECT ... FROM call_queue WHERE campaign_id = $1 AND status = 'waiting' ORDER BY is_priority DESC, position ASC LIMIT 1`
5. Criar `call_log` (histórico)
6. `reserve_operator_for_call` (RPC existente)
7. `fireDialWebhook` (mesma lógica)
8. `DELETE FROM call_queue WHERE id = $1`
9. Atualizar `queue_execution_state`

Sem fallback para `call_logs` ready ou `call_leads` pending. Uma fonte. Um fluxo.

**3. Hook único: `src/hooks/useCallQueue.ts`** (reescrever)

Substitui os 5 hooks por 1 com:
- Query da fila (`call_queue` WHERE status = 'waiting')
- Query do estado (`queue_execution_state`)
- Mutations: `startQueue`, `pauseQueue`, `resumeQueue`, `stopQueue`
- Mutations: `addToQueue`, `removeFromQueue`, `moveToStart`, `moveToEnd`, `clearQueue`
- Computed: `isRunning`, `isPaused`, `totalWaiting`, `availableOperators`
- Loop de ticks (invoca `queue-processor`)

**4. Atualizar consumidores**

| Arquivo | De | Para |
|---------|-----|------|
| `AppLayout.tsx` | `useQueueExecutionSummary()` | `useCallQueue()` (loop global) |
| `CallPanel.tsx` | `useCallQueuePanel` + `useQueueExecutionData` | `useCallQueue()` |
| `QueueControlPanel.tsx` | `useQueueExecution(campaignId)` | `useCallQueue(campaignId)` |
| `Leads.tsx` | `useCallQueue()` (addToQueue) | `useCallQueue()` (mesma API) |

**5. Atualizar `useCallLeads.ts`** — `bulkEnqueueByStatus`

Em vez de criar `call_logs` com status `ready`, inserir diretamente na `call_queue` com os dados do lead (phone, name).

**6. Remover código antigo**

- `src/hooks/useCallQueuePanel.ts` — deletar
- `src/hooks/useQueueExecution.ts` — deletar
- `supabase/functions/queue-executor/` — deletar (substituído por `queue-processor`)

### Fluxo resultante

```text
Tick (8s) →
  1. heal_stuck_operators()
  2. resolve_cooldowns()
  3. Busca operador disponível
  4. SELECT FROM call_queue WHERE waiting ORDER BY is_priority DESC, position ASC
  5. Cria call_log + reserva operador + webhook
  6. DELETE FROM call_queue
```

```text
Hooks:
  useCallQueue() — 1 hook para tudo
    ├── items[]        (lista da fila)
    ├── state          (running/paused/stopped)
    ├── start/pause/resume/stop
    ├── add/remove/moveToStart/moveToEnd/clear
    └── tick loop      (quando global=true)
```

### Ordem de implementação

1. Migration da tabela
2. Edge function `queue-processor`
3. Hook `useCallQueue` (reescrita)
4. Atualizar CallPanel, QueueControlPanel, AppLayout, Leads
5. Atualizar `useCallLeads.bulkEnqueueByStatus`
6. Deletar arquivos antigos

