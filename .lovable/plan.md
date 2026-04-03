

## Plano: Aba "Lista" nas Campanhas de Grupos

### Resumo
Adicionar uma aba "Lista" dentro de GroupCampaignDetails que permite configurar janelas de tempo para acumular participantes de eventos do grupo e executar ações em lote (webhook, mensagem ou ligação) ao final de cada ciclo.

### 1. Migration — Criar tabelas

Criar `group_execution_lists` e `group_execution_leads` conforme a especificação, com:
- `user_id` (não-nulo, para RLS) em ambas tabelas ao invés de `company_id` com FK para `companies`
- RLS policies baseadas em `user_id = auth.uid()`
- Índices em `campaign_id`, `current_window_end` e `(list_id, cycle_id, status)`
- Constraint UNIQUE em `(list_id, phone, cycle_id)`
- Validation trigger para `window_duration_hours >= 1` (em vez de CHECK com time)

### 2. Edge Function — `group-execution-processor`

Novo arquivo `supabase/functions/group-execution-processor/index.ts`:
- Aceita `{ list_id? }` no body (execução manual) ou processa todas as listas com `current_window_end <= now()`
- Para cada lista: busca leads pendentes do ciclo, executa ação por tipo (webhook POST, invoke zapi-proxy para mensagem, insert em call_queue para ligação)
- Marca leads como `executed` ou `failed`
- Calcula próxima janela e gera novo `cycle_id`
- Lógica de janela noturna (end < start = dia seguinte)

### 3. Modificar `webhook-inbound/index.ts`

Após processar o evento, verificar se existe `group_execution_lists` ativa para o `campaign_id` com janela aberta. Se o `event_type` está nos `monitored_events`, fazer upsert em `group_execution_leads` com `ignoreDuplicates`.

### 4. Hook — `useGroupExecutionList`

Novo arquivo `src/hooks/useGroupExecutionList.ts`:
- Query para buscar a lista ativa de uma campanha (single)
- Query para buscar leads do ciclo atual
- Mutations: criar/atualizar lista, toggle ativo, executar agora (invoke edge function)
- Cálculo de `current_window_start/end` ao criar/ativar

### 5. Componente — `ExecutionListTab`

Novo arquivo `src/components/group-campaigns/tabs/ExecutionListTab.tsx`:
- Estado vazio: ícone + texto + botão "Configurar Lista"
- Estado ativo: 4 cards de métricas (leads no ciclo, countdown janela, tipo janela, ação configurada), badges de eventos monitorados, tabela de leads (preview 10), botões "Editar" e "Executar Agora"
- Countdown com `setInterval` a cada 60s calculando diff de `current_window_end`

### 6. Componente — `ExecutionListConfigDialog`

Novo arquivo `src/components/group-campaigns/dialogs/ExecutionListConfigDialog.tsx`:
- Radio: tipo de janela (fixo/duração)
- Campos condicionais (time inputs ou number input)
- Checkboxes: eventos monitorados
- Radio: tipo de ação (webhook/mensagem/ligação)
- Campos condicionais por ação (URL, textarea com variáveis, select de campanha de ligação)
- Validações: duração mínima 1h, pelo menos 1 evento, campo de ação preenchido

### 7. Modal de confirmação — `ExecuteNowDialog`

AlertDialog simples: "Executar para X leads? A janela atual será encerrada e uma nova começará."

### 8. Integrar aba no `GroupCampaignDetails`

- Adicionar tab "Lista" com ícone `ClipboardList` na TabsList (grid-cols-7)
- Importar e renderizar `ExecutionListTab`
- Exportar novos componentes no barrel file

### Arquivos afetados
- **Nova migration**: tabelas + RLS + índices
- **Nova edge function**: `supabase/functions/group-execution-processor/index.ts`
- **Editar**: `supabase/functions/webhook-inbound/index.ts` (~15 linhas)
- **Novo hook**: `src/hooks/useGroupExecutionList.ts`
- **Novos componentes**: `ExecutionListTab.tsx`, `ExecutionListConfigDialog.tsx`
- **Editar**: `src/components/group-campaigns/GroupCampaignDetails.tsx` (adicionar aba)
- **Editar**: `src/components/group-campaigns/index.ts` (export)

### Detalhes técnicos
- Tabelas usam `user_id` (não `company_id`) para compatibilidade com RLS existente no projeto
- Edge function usa `SUPABASE_SERVICE_ROLE_KEY` para bypass RLS
- Countdown frontend-only, sem polling ao backend
- A execução via n8n (cron 5min) será configurada pelo usuário externamente; o endpoint já estará pronto

