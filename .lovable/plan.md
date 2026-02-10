

# Modo "Execucao em Fila" para Campanhas de Ligacao

## Visao Geral

Implementar um sistema automatizado de discagem em fila que executa ligacoes sequencialmente, distribuindo entre operadores disponiveis e respeitando intervalos configurados. O sistema usa polling (a cada 5s) para atualizacao em tempo real.

---

## Fase 1: Alteracoes no Banco de Dados

### 1.1 Novos campos em `call_campaigns`

```sql
ALTER TABLE call_campaigns ADD COLUMN queue_execution_enabled boolean DEFAULT false;
ALTER TABLE call_campaigns ADD COLUMN queue_interval_seconds integer DEFAULT 30;
ALTER TABLE call_campaigns ADD COLUMN queue_unavailable_behavior text DEFAULT 'wait';
```

### 1.2 Novos campos em `call_campaign_operators`

```sql
ALTER TABLE call_campaign_operators ADD COLUMN status text DEFAULT 'offline';
ALTER TABLE call_campaign_operators ADD COLUMN current_call_id uuid;
ALTER TABLE call_campaign_operators ADD COLUMN personal_interval_seconds integer;
ALTER TABLE call_campaign_operators ADD COLUMN last_call_ended_at timestamptz;
```

### 1.3 Nova tabela: `queue_execution_state`

```sql
CREATE TABLE queue_execution_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES call_campaigns(id) ON DELETE CASCADE UNIQUE,
  user_id uuid NOT NULL,
  status text DEFAULT 'stopped',
  current_position integer DEFAULT 0,
  last_dial_at timestamptz,
  session_started_at timestamptz,
  calls_made integer DEFAULT 0,
  calls_answered integer DEFAULT 0,
  calls_no_answer integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
-- RLS policy
ALTER TABLE queue_execution_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own queue_execution_state"
  ON queue_execution_state FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

### 1.4 Habilitar Realtime na `queue_execution_state` e `call_campaign_operators`

Para que o polling funcione de forma eficiente, e futuramente possa migrar para realtime.

---

## Fase 2: Atualizacao do Hook e Tipos (`useCallCampaigns`)

### 2.1 `src/hooks/useCallCampaigns.ts`

- Adicionar campos ao tipo `CallCampaign`: `queueExecutionEnabled`, `queueIntervalSeconds`, `queueUnavailableBehavior`
- Atualizar `transformDbToFrontend` para mapear os novos campos
- Atualizar `updateCampaignMutation` para aceitar os novos campos

### 2.2 `src/hooks/useCallOperators.ts`

- Adicionar campos ao tipo `CallOperator`: `status`, `currentCallId`, `personalIntervalSeconds`, `lastCallEndedAt`
- Atualizar `transformDbToFrontend`
- Adicionar mutation `updateOperatorSettings` para salvar intervalo personalizado
- Adicionar mutation `updateOperatorStatus` para mudar status

---

## Fase 3: Novo Hook `useQueueExecution`

### `src/hooks/useQueueExecution.ts`

Hook que gerencia o estado da execucao da fila:

- **Query**: Busca o estado atual da fila (`queue_execution_state`) com polling de 5s
- **Mutations**:
  - `startQueue`: Cria/atualiza registro com status `running`, seta `session_started_at`
  - `pauseQueue`: Atualiza status para `paused`
  - `resumeQueue`: Atualiza status para `running`
  - `stopQueue`: Atualiza status para `stopped`, reseta contadores
- **Dados computados**: Operadores disponiveis, proxima ligacao, contagem de fila restante

---

## Fase 4: Edge Function `queue-executor`

### `supabase/functions/queue-executor/index.ts`

Edge function que realiza a logica de execucao. Chamada via polling do frontend a cada 5s quando a fila esta `running`.

**Endpoints:**
- `POST /start` -- Inicia a fila (valida operadores e leads)
- `POST /pause` -- Pausa
- `POST /resume` -- Retoma
- `POST /stop` -- Para
- `GET /status` -- Retorna status completo (fila, operadores, proxima ligacao)
- `POST /tick` -- Executa um "tick" da fila: verifica se e hora de discar, seleciona operador, inicia ligacao

**Logica do tick:**
1. Verificar se status e `running`
2. Buscar operadores com status `cooldown` cujo intervalo ja expirou -> muda para `available`
3. Buscar operador `available` com maior tempo desde ultima ligacao
4. Se nao encontrou: se behavior = `wait`, muda para `waiting_operator`; se `pause`, muda para `paused`
5. Se encontrou: buscar proximo lead da `call_queue` com status `waiting`
6. Se nao tem lead: muda fila para `stopped` (concluida)
7. Discar via call-dial existente (reusar logica)
8. Atualizar operador para `on_call`, setar `current_call_id`
9. Incrementar `calls_made`

---

## Fase 5: UI - Aba Configuracao

### `src/components/call-campaigns/tabs/ConfigTab.tsx`

Adicionar nova secao "Execucao em Fila" com:
- **Switch** para habilitar/desabilitar (`queue_execution_enabled`)
- **Input numerico** para intervalo entre ligacoes em segundos (default 30)
- **RadioGroup** para comportamento quando operador indisponivel: "Aguardar operador" vs "Pausar fila"
- Secao condicional: so aparece os campos quando o switch esta ON

---

## Fase 6: UI - Aba Operadores (Status em Tempo Real)

### `src/components/call-campaigns/tabs/OperatorsTab.tsx`

Refatorar para exibir cards ao inves de tabela quando `queueExecutionEnabled`:

- **Card por operador** com:
  - Nome e ramal
  - Badge de status colorido (verde=disponivel, azul=em ligacao, amarelo=cooldown, laranja=pausado, cinza=offline)
  - Info contextual (duracao da ligacao atual, tempo de cooldown restante, etc.)
  - Botao de configuracoes (abre modal de intervalo personalizado)
  - Botao de remover

- **Modal de configuracao do operador**:
  - Opcao "Usar padrao da campanha" ou "Personalizado"
  - Input de segundos
  - Atalhos rapidos: 15s, 30s, 45s, 60s, 90s, 120s

- Polling a cada 5s para atualizar status dos operadores

---

## Fase 7: UI - Painel de Controle da Fila (Aba Leads)

### `src/components/call-campaigns/tabs/LeadsTab.tsx`

Adicionar painel de controle no topo quando `queue_execution_enabled`:

- **Novo componente** `QueueControlPanel`:
  - Status da fila com badge colorido
  - Botoes de controle: Iniciar / Pausar / Retomar / Parar
  - 4 MetricCards: Na Fila, Operadores Disponiveis, Atendidas, Nao Atendidas
  - Info da proxima ligacao (operador + lead + countdown)

- **Estados visuais**:
  - Parada: botao "Iniciar", badge cinza
  - Em execucao: botoes "Pausar" e "Parar", badge verde, countdown
  - Aguardando operador: badge amarelo, mensagem
  - Pausada: botoes "Retomar" e "Parar", badge laranja

- Polling a cada 5s via `useQueueExecution`

---

## Fase 8: UI - Controles do Operador no Painel de Ligacoes

### `src/pages/CallPanel.tsx`

Quando a ligacao pertence a uma campanha com `queue_execution_enabled`:
- Exibir secao "Apos encerrar" no card da ligacao
- Input para ajustar intervalo antes da proxima ligacao
- Botoes de atalho (+15s, +30s)
- Toggle "Pausar apos" -- ao encerrar, operador vai para status `paused` ao inves de `cooldown`

---

## Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/hooks/useQueueExecution.ts` | Hook para gerenciar estado da fila |
| `supabase/functions/queue-executor/index.ts` | Edge function com logica de execucao |
| `src/components/call-campaigns/QueueControlPanel.tsx` | Componente do painel de controle da fila |
| `src/components/call-campaigns/OperatorConfigDialog.tsx` | Modal de configuracao do operador |
| `src/components/call-campaigns/OperatorCard.tsx` | Card de operador com status em tempo real |

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/hooks/useCallCampaigns.ts` | Adicionar campos de queue execution |
| `src/hooks/useCallOperators.ts` | Adicionar campos de status e intervalo |
| `src/components/call-campaigns/tabs/ConfigTab.tsx` | Nova secao "Execucao em Fila" |
| `src/components/call-campaigns/tabs/OperatorsTab.tsx` | Cards com status em tempo real |
| `src/components/call-campaigns/tabs/LeadsTab.tsx` | Painel de controle da fila no topo |
| `src/pages/CallPanel.tsx` | Controles pos-ligacao do operador |
| `src/components/call-campaigns/CallCampaignDetails.tsx` | Passar prop `queueEnabled` para tabs |

## Migracao SQL

Uma unica migracao com:
- 3 colunas novas em `call_campaigns`
- 4 colunas novas em `call_campaign_operators`
- 1 tabela nova `queue_execution_state` com RLS
- Trigger `update_updated_at` na nova tabela

