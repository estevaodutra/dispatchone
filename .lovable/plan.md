
## O que está acontecendo (por que 14:45 não executou)

Pelo que vi no backend, a sequência **“Funil FN”** está corretamente configurada como **trigger_type = "scheduled"** na tabela `message_sequences`, com:
- `days: [1,2,3,4,5]`
- `times: ["10:00","14:45","16:00"]`
- `active: true`

Porém, a função **`process-scheduled-messages` atualmente só processa agendamentos da tabela `group_messages`** (tipo `"scheduled"`), e **não dispara sequências agendadas de `message_sequences`**.

Resultado: mesmo com o card mostrando “Agendado 14:45”, **nunca será executado**, porque o scheduler não está “escutando” esse tipo de agendamento.

Além disso, mesmo que tentássemos chamar `execute-message` com apenas `sequenceId`, **o `execute-message` hoje bloqueia** (retorna 400) se não houver `messageId`, porque a validação exige `messageId` (exceto quando é “triggered” por poll/webhook).

## Objetivo da correção

1) Fazer o scheduler (`process-scheduled-messages`) também:
- ler sequências `message_sequences` com `trigger_type="scheduled"` e `active=true`
- checar se bate com **dia/hora do Brasil**
- disparar a execução via `execute-message`

2) Garantir idempotência (não disparar duas vezes no mesmo minuto) para sequências agendadas.

3) Ajustar o `execute-message` para permitir execução com **`campaignId + sequenceId`** sem precisar de `messageId` ou `triggerContext`.

---

## Mudanças planejadas (implementação)

### 1) Corrigir `execute-message` para aceitar `sequenceId` sem `messageId`
**Arquivo:** `supabase/functions/execute-message/index.ts`

- Ajustar a validação inicial para permitir:
  - (resumed) `executionId + startFromNodeIndex`
  - (triggered) `triggerContext` (sem messageId)
  - (manual/cron) `campaignId + sequenceId` (sem messageId)

**Antes (hoje):**
- Falha se `messageId` não existir e não for triggered/resumed.

**Depois:**
- `campaignId` continua obrigatório
- permitir `sequenceId` como alternativa ao `messageId`

Isso destrava o scheduler para disparar sequências diretamente.

---

### 2) Adicionar suporte a “scheduled sequences” no `process-scheduled-messages`
**Arquivo:** `supabase/functions/process-scheduled-messages/index.ts`

Adicionar um novo bloco (além do bloco atual de `group_messages`), para:

1. Buscar sequências agendadas:
   - `from("message_sequences")`
   - filtros: `trigger_type = 'scheduled'`, `active = true`
   - campos necessários: `id`, `name`, `group_campaign_id`, `user_id`, `trigger_config`

2. Para cada sequência:
   - validar `trigger_config.days` e `trigger_config.times`
   - comparar com `currentDay` e `currentTime` já calculados (America/Sao_Paulo)

3. Idempotência:
   - checar se já executou hoje neste horário (ver item 3: nova tabela)
   - se já existir, logar e pular

4. Proteção contra duplicidade por execução ativa:
   - checar em `sequence_executions` se há status `paused` ou `running` para a mesma `sequence_id`
   - se houver, pular (igual já existe para `group_messages`)

5. Disparo:
   - chamar `execute-message` via `fetch(.../functions/v1/execute-message)` com:
     - `campaignId: <group_campaign_id>`
     - `sequenceId: <sequence_id>`
     - sem `messageId`
     - sem `triggerContext`

6. Logs:
   - logs bem explícitos do tipo:
     - `[Scheduler] Sequence <id> matches schedule`
     - `[Scheduler] Sequence <id> already executed at <time>, skipping`
     - `[Scheduler] Triggering sequence <id> via execute-message`

---

### 3) Criar tabela de idempotência para sequências agendadas
Hoje existe `scheduled_message_executions` (para `group_messages`). Vamos criar uma equivalente para sequências.

**Nova migration (SQL):**
- Criar `scheduled_sequence_executions` com:
  - `id uuid primary key default gen_random_uuid()`
  - `sequence_id uuid not null references message_sequences(id) on delete cascade`
  - `campaign_id uuid not null references group_campaigns(id) on delete cascade`
  - `user_id uuid not null`
  - `scheduled_date date not null`
  - `scheduled_time text not null`
  - `executed_at timestamptz default now()`
  - `status text default 'executed'` (ou `executing`/`failed`)
  - `error_message text null`
  - UNIQUE(`sequence_id`, `scheduled_date`, `scheduled_time`)
  - índice para lookup

**RLS:**
- habilitar RLS
- policy SELECT/INSERT/UPDATE para `auth.uid() = user_id` (para permitir visualização futura no app, se quisermos expor)

Obs.: A função do scheduler usa chave de serviço e não dependerá das policies para funcionar, mas deixar RLS correto ajuda a manter padrão e permite UI depois.

---

## Validação / Testes (o que vamos verificar depois de implementar)

1) Rodar `process-scheduled-messages` manualmente e verificar nos logs:
   - que ele lista `message_sequences` scheduled
   - que ele avalia corretamente `14:45` em `times`
   - que ele cria registro em `scheduled_sequence_executions`
   - que ele chama `execute-message` sem erro 400

2) Checar se uma segunda execução no mesmo minuto é bloqueada (idempotência):
   - log “already executed… skipping”

3) Confirmar que a sequência gera logs em `group_message_logs` (a evidência final de envio).

---

## Observações importantes (para evitar novos “não executou”)
- Se `process-scheduled-messages` continuar rodando e o horário bater, o disparo vai acontecer, mas ainda pode ser “pulado” se:
  - a campanha estiver `paused/draft` (o scheduler já valida status)
  - a instância estiver `disconnected`
  - não houver grupos vinculados na campanha
  - houver uma execução `running/paused` ainda ativa para a mesma sequência

Vamos manter logs claros para diferenciar “não bateu horário” vs “bateu, mas pulou por condição”.

---

## Entregáveis
- Ajuste no `execute-message` para suportar `campaignId + sequenceId` sem `messageId`
- Ajuste no `process-scheduled-messages` para processar `message_sequences` agendadas
- Migration criando `scheduled_sequence_executions` + índices + RLS policies
