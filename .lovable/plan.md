

# Retentativas Automaticas para Campanhas de Ligacao

## Resumo

Adicionar uma secao "Retentativas" na aba Configuracao das campanhas de ligacao, permitindo configurar quantas vezes o sistema tenta ligar quando o lead nao atende, o intervalo entre tentativas e a acao a executar quando o limite for excedido.

## Alteracoes Necessarias

### 1. Migration SQL -- Novos campos

Adicionar 4 colunas na tabela `call_campaigns`:
- `retry_count` (INT, default 3) -- maximo de tentativas
- `retry_interval_minutes` (INT, default 30) -- intervalo entre tentativas
- `retry_exceeded_behavior` (TEXT, default 'mark_failed') -- o que fazer ao exceder
- `retry_exceeded_action_id` (UUID, nullable) -- acao a executar (referencia `call_script_actions`)

Adicionar 3 colunas na tabela `call_logs`:
- `attempt_number` (INT, default 1) -- tentativa atual
- `max_attempts` (INT, default 3) -- limite de tentativas (copiado da campanha)
- `next_retry_at` (TIMESTAMPTZ, nullable) -- horario da proxima retentativa

### 2. Interface -- Secao "Retentativas" no ConfigTab

Arquivo: `src/components/call-campaigns/tabs/ConfigTab.tsx`

Inserir entre "Execucao em Fila" e "Integracao API4com" um novo Card com:
- Input numerico "Quantidade de Retentativas" (0-10, default 3)
- Select "Intervalo entre Retentativas" com opcoes: 5min, 10min, 15min, 30min, 1h, 2h, 4h, 8h, 24h
- RadioGroup "Ao Exceder Retentativas":
  - "Apenas marcar como Nao Atendeu" (`mark_failed`)
  - "Executar acao da campanha" (`execute_action`) com Select das acoes cadastradas
- Se nenhuma acao cadastrada, exibir mensagem com link para aba Acoes

Utiliza o hook `useCallActions(campaign.id)` para listar as acoes disponiveis no dropdown.

### 3. Hook -- Atualizar useCallCampaigns

Arquivo: `src/hooks/useCallCampaigns.ts`

- Adicionar campos `retryCount`, `retryIntervalMinutes`, `retryExceededBehavior`, `retryExceededActionId` na interface `CallCampaign`
- Adicionar campos correspondentes na interface `DbCallCampaign`
- Atualizar `transformDbToFrontend` para mapear os novos campos
- Atualizar `updateCampaignMutation` para aceitar e persistir os novos campos

### 4. Logica de Retentativa -- Edge Function `reschedule-failed-calls`

Arquivo: `supabase/functions/reschedule-failed-calls/index.ts`

Refatorar para usar os novos campos da campanha:
- Ao processar uma chamada falhada, consultar `retry_count` e `retry_interval_minutes` da campanha
- Usar `attempt_number` do `call_log` em vez de contar `_rescheduled` no banco
- Se `attempt_number < retry_count`: criar novo log com `attempt_number + 1`, `scheduled_for = NOW() + retry_interval_minutes`
- Se `attempt_number >= retry_count`:
  - Se `retry_exceeded_behavior = 'mark_failed'`: marcar como `max_attempts_exceeded`
  - Se `retry_exceeded_behavior = 'execute_action'`: marcar e retornar o `retry_exceeded_action_id` para execucao

### 5. Logica de Retentativa -- Edge Function `call-status`

Arquivo: `supabase/functions/call-status/index.ts`

Ao receber callback de status terminal (no_answer, busy, etc.):
- Consultar configuracao de retentativa da campanha
- Se dentro do limite: agendar proxima tentativa (atualizar `call_logs` com novo `scheduled_for` e incrementar `attempt_number`)
- Se excedeu: marcar como `max_attempts_exceeded` e executar acao configurada (invocar motor de automacao)

### 6. Exibicao no Painel de Ligacoes

Arquivo: `src/hooks/useCallPanel.ts`
- Adicionar `attemptNumber` e `maxAttempts` na interface `CallPanelEntry`
- Mapear de `attempt_number` e `max_attempts` do `call_logs` no transform

Arquivo: `src/pages/CallPanel.tsx` (ou componente de card de ligacao)
- Exibir badge "X/Y" (tentativa/maximo) quando `maxAttempts > 1`
- Quando `attemptNumber >= maxAttempts`, exibir indicador vermelho

### 7. Historico de Tentativas

Na modal de detalhes da ligacao, buscar todos os `call_logs` do mesmo `lead_id` + `campaign_id` ordenados por `created_at` para montar o historico de tentativas anteriores.

## Detalhes Tecnicos

### Migration SQL

```text
-- call_campaigns: retry config
ALTER TABLE call_campaigns ADD COLUMN retry_count integer DEFAULT 3;
ALTER TABLE call_campaigns ADD COLUMN retry_interval_minutes integer DEFAULT 30;
ALTER TABLE call_campaigns ADD COLUMN retry_exceeded_behavior text DEFAULT 'mark_failed';
ALTER TABLE call_campaigns ADD COLUMN retry_exceeded_action_id uuid;

-- call_logs: attempt tracking
ALTER TABLE call_logs ADD COLUMN attempt_number integer DEFAULT 1;
ALTER TABLE call_logs ADD COLUMN max_attempts integer DEFAULT 3;
ALTER TABLE call_logs ADD COLUMN next_retry_at timestamptz;
```

### Opcoes do Select de Intervalo

| Label | Valor (minutos) |
|-------|-----------------|
| 5 minutos | 5 |
| 10 minutos | 10 |
| 15 minutos | 15 |
| 30 minutos | 30 |
| 1 hora | 60 |
| 2 horas | 120 |
| 4 horas | 240 |
| 8 horas | 480 |
| 24 horas | 1440 |

### Fluxo de Retentativa

Quando uma ligacao termina com status de falha:
1. Consultar `retry_count` da campanha e `attempt_number` do log
2. Se `attempt_number < retry_count`: criar novo `call_log` com `attempt_number + 1`, `scheduled_for = NOW() + retry_interval_minutes`, e `max_attempts = retry_count`
3. Se `attempt_number >= retry_count`: marcar o lead conforme `retry_exceeded_behavior`

### Arquivos Modificados

1. **Migration SQL** -- 7 novos campos (4 em `call_campaigns`, 3 em `call_logs`)
2. **`src/hooks/useCallCampaigns.ts`** -- Interface e transform atualizados
3. **`src/components/call-campaigns/tabs/ConfigTab.tsx`** -- Nova secao de UI
4. **`src/hooks/useCallPanel.ts`** -- Campos de tentativa no painel
5. **`src/pages/CallPanel.tsx`** -- Badge de tentativa na UI
6. **`supabase/functions/reschedule-failed-calls/index.ts`** -- Logica baseada nos campos da campanha
7. **`supabase/functions/call-status/index.ts`** -- Retentativa inline ao receber callback

