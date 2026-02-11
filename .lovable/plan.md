

# Centralizar Operadores no Painel de Ligacoes

## Resumo

Migrar os operadores de ligacao da tabela `call_campaign_operators` (vinculada por campanha) para uma nova tabela `call_operators` (vinculada por usuario/tenant). Operadores passam a ser globais e participam automaticamente de todas as campanhas. A aba "Operadores" sai das campanhas e vai para o Painel de Ligacoes.

## 1. Migracao de Banco de Dados

### 1.1 Criar tabela `call_operators`

```sql
CREATE TABLE call_operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  operator_name TEXT NOT NULL,
  extension TEXT,
  is_active BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'offline',
  current_call_id UUID,
  current_campaign_id UUID,
  personal_interval_seconds INTEGER,
  last_call_ended_at TIMESTAMPTZ,
  total_calls INTEGER DEFAULT 0,
  total_calls_answered INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, extension)
);

CREATE INDEX idx_call_operators_status ON call_operators(status);
CREATE INDEX idx_call_operators_active ON call_operators(is_active);
CREATE INDEX idx_call_operators_user ON call_operators(user_id);

ALTER TABLE call_operators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own call_operators" ON call_operators
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE call_operators;
```

### 1.2 Migrar dados existentes

Copiar operadores unicos (por nome+ramal+user) da tabela antiga:

```sql
INSERT INTO call_operators (user_id, operator_name, extension, is_active, status, personal_interval_seconds, last_call_ended_at, created_at)
SELECT DISTINCT ON (user_id, operator_name, extension)
  user_id, operator_name, extension, is_active, status, personal_interval_seconds, last_call_ended_at, created_at
FROM call_campaign_operators
ORDER BY user_id, operator_name, extension, created_at ASC;
```

### 1.3 Atualizar FK em `call_logs`

```sql
-- Remover FK antiga
ALTER TABLE call_logs DROP CONSTRAINT IF EXISTS call_logs_operator_id_fkey;
-- Criar FK nova apontando para call_operators
ALTER TABLE call_logs ADD CONSTRAINT call_logs_operator_id_fkey
  FOREIGN KEY (operator_id) REFERENCES call_operators(id) ON DELETE SET NULL;
```

### 1.4 Remover tabela antiga

```sql
DROP TABLE IF EXISTS call_campaign_operators;
```

## 2. Novo Hook: `useCallOperators` (reescrita)

Reescrever `src/hooks/useCallOperators.ts` para:
- Remover o parametro `campaignId` -- operadores sao globais por `user_id`
- Consultar a nova tabela `call_operators`
- Incluir campos `currentCampaignId`, `totalCalls`, `totalCallsAnswered`
- Manter todas as mutations (add, remove, toggle, updateSettings, updateStatus)
- Adicionar mutation para editar nome/ramal

## 3. Painel de Ligacoes -- Adicionar Abas

### 3.1 Atualizar `src/pages/CallPanel.tsx`

Envolver o conteudo atual em um sistema de abas de nivel superior:

- **Ligacoes** (aba padrao) -- conteudo atual completo
- **Operadores** -- nova aba com gerenciamento centralizado
- **Configuracoes** -- placeholder para futuro

### 3.2 Criar componente `src/components/call-panel/OperatorsPanel.tsx`

Conteudo da aba Operadores:
- Cards de metricas resumidas (total, disponiveis, em ligacao, offline)
- Barra de busca + filtros (status, ativo/inativo)
- Lista de cards de operadores mostrando:
  - Nome, ramal, status com badge colorido
  - Intervalo configurado
  - Estatisticas do dia (total_calls, total_calls_answered)
  - Se em ligacao: campanha e lead atuais
  - Botoes de configurar e remover
- Botao "Novo Operador" abre dialog de criacao

### 3.3 Criar componente `src/components/call-panel/CreateOperatorDialog.tsx`

Dialog para criar operador:
- Nome (obrigatorio)
- Ramal/Extensao (obrigatorio, unico por usuario)
- Intervalo entre ligacoes (padrao das campanhas ou personalizado com atalhos)

### 3.4 Criar componente `src/components/call-panel/EditOperatorDialog.tsx`

Dialog para editar/configurar operador:
- Campos editaveis: nome, ramal, intervalo
- Toggle ativo/inativo
- Secao de estatisticas (somente leitura)

## 4. Remover Aba Operadores das Campanhas

### 4.1 `src/components/call-campaigns/CallCampaignDetails.tsx`

- Remover import e uso de `OperatorsTab`
- Mudar grid de 6 para 5 colunas
- Adicionar na aba `ConfigTab` um card informativo com contadores de operadores e link para `/painel-ligacoes` (aba operadores)

### 4.2 `src/components/call-campaigns/tabs/ConfigTab.tsx`

Adicionar secao "Operadores Disponiveis" mostrando:
- Contadores (total ativos, disponiveis, em ligacao)
- Texto informativo: "Os operadores sao gerenciados no Painel de Ligacoes"
- Botao "Gerenciar Operadores" que navega para `/painel-ligacoes`

## 5. Atualizar Edge Functions

### 5.1 `supabase/functions/queue-executor/index.ts`

- Trocar todas as referencias de `call_campaign_operators` para `call_operators`
- Remover filtro `.eq("campaign_id", campaignId)` na busca de operadores
- Filtrar apenas por `user_id` (do dono da campanha) e `is_active = true`
- Ao atribuir ligacao, atualizar `current_campaign_id` no operador

### 5.2 `supabase/functions/call-dial/index.ts`

- Trocar tabela de `call_campaign_operators` para `call_operators`

### 5.3 `supabase/functions/call-status/index.ts`

- Trocar tabela de `call_campaign_operators` para `call_operators`

### 5.4 `supabase/functions/reschedule-failed-calls/index.ts`

- Trocar tabela e remover filtro por `campaign_id`

## 6. Atualizar Hooks do Frontend

### 6.1 `src/hooks/useCallPanel.ts`

- Trocar joins e queries de `call_campaign_operators` para `call_operators`
- Na logica de redirecionamento de operador, buscar por `user_id` em vez de `campaign_id`
- Round-robin continua usando `queue_execution_state.current_operator_index`

### 6.2 `src/hooks/useQueueExecution.ts`

- Remover dependencia de `useCallOperators(campaignId)` -- usar versao sem campaignId

### 6.3 `src/hooks/useCallQueuePanel.ts`

- Atualizar se referencia operadores

## 7. Arquivos a Remover

- `src/components/call-campaigns/tabs/OperatorsTab.tsx` (movido para o painel)
- Referencia no `src/components/call-campaigns/index.ts` se existir

## 8. Ordem de Execucao

1. Migracao de banco (criar tabela, migrar dados, atualizar FK, dropar tabela antiga)
2. Reescrever hook `useCallOperators`
3. Criar componentes do painel (OperatorsPanel, CreateOperatorDialog, EditOperatorDialog)
4. Atualizar `CallPanel.tsx` com abas
5. Remover aba Operadores de `CallCampaignDetails`
6. Adicionar indicador de operadores no `ConfigTab` da campanha
7. Atualizar Edge Functions (queue-executor, call-dial, call-status, reschedule-failed-calls)
8. Atualizar hooks (useCallPanel, useQueueExecution)
9. Deploy das Edge Functions

