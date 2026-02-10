
# Reformulacao do Modulo de Campanhas de Disparos

## Visao Geral

Transformar a pagina atual de Campanhas de Disparos (uma lista simples com dialogs) em um modulo completo com sistema de detalhes por abas (Configuracao, Contatos, Sequencias, Analytics), seguindo o mesmo padrao da pagina de Campanhas de Grupos (`GroupCampaignsPage` / `GroupCampaignDetails`).

## Fase 1: Banco de Dados (4 novas tabelas)

Criar as tabelas necessarias para suportar a nova estrutura:

### dispatch_campaigns
Tabela principal das campanhas de despacho, substituindo o uso da tabela `campaigns` para este tipo:
- `id`, `user_id`, `name`, `description`, `status` (draft/active/paused/completed)
- `instance_id` (referencia a `instances`)
- `use_exclusive_instance` (boolean)
- `created_at`, `updated_at`
- RLS: usuario so acessa seus proprios registros (INSERT, SELECT, UPDATE, DELETE)

### dispatch_campaign_contacts
Contatos vinculados a uma campanha de despacho:
- `id`, `user_id`, `campaign_id` (referencia a `dispatch_campaigns` ON DELETE CASCADE)
- `lead_id` (referencia a `leads`)
- `status` (active/paused/completed/unsubscribed)
- `current_sequence_id`, `current_step` (integer), `sequence_started_at`, `sequence_completed_at`
- `created_at`, `updated_at`
- UNIQUE constraint em `(campaign_id, lead_id)`
- Indices em `campaign_id` e `status`
- RLS: usuario so acessa seus proprios registros

### dispatch_sequences
Sequencias de automacao vinculadas a uma campanha:
- `id`, `user_id`, `campaign_id` (referencia a `dispatch_campaigns` ON DELETE CASCADE)
- `name`, `description`
- `is_active` (boolean), `trigger_type` (manual/scheduled/api/on_add), `trigger_config` (jsonb)
- `created_at`, `updated_at`
- Indice em `campaign_id`
- RLS: usuario so acessa seus proprios registros

### dispatch_sequence_steps
Etapas de cada sequencia (mensagens, delays, condicoes):
- `id`, `user_id`, `sequence_id` (referencia a `dispatch_sequences` ON DELETE CASCADE)
- `step_order` (integer)
- `step_type` (message/delay/condition)
- `message_type` (text/image/video/audio/document/buttons/list), `message_content`, `message_media_url`, `message_buttons` (jsonb)
- `delay_value` (integer), `delay_unit` (minutes/hours/days)
- `condition_type`, `condition_config` (jsonb)
- `created_at`, `updated_at`
- Indices em `sequence_id` e `(sequence_id, step_order)`
- RLS: usuario so acessa seus proprios registros

### dispatch_sequence_logs
Logs de execucao de cada step para cada contato:
- `id`, `user_id`, `sequence_id`, `contact_id`, `step_id`
- `status` (pending/sent/delivered/read/failed), `error_message`
- `sent_at`, `delivered_at`, `read_at`
- `created_at`
- Indices em `sequence_id` e `contact_id`
- RLS: usuario so acessa seus proprios registros (INSERT, SELECT apenas)

## Fase 2: Hooks de Dados (4 novos hooks)

### useDispatchCampaigns
- CRUD na tabela `dispatch_campaigns`
- Listar, criar, atualizar, deletar campanhas
- Query key: `["dispatch_campaigns"]`
- Tipo exportado: `DispatchCampaign`

### useDispatchContacts(campaignId)
- CRUD na tabela `dispatch_campaign_contacts` com join em `leads` para trazer nome/telefone
- Importar contatos (bulk insert)
- Controle de sequencia por contato (iniciar, pausar, reiniciar)
- Stats: total, ativos, em sequencia, concluidos
- Query key: `["dispatch_contacts", campaignId]`

### useDispatchSequences(campaignId)
- CRUD na tabela `dispatch_sequences`
- Toggle ativo/inativo
- Query key: `["dispatch_sequences", campaignId]`

### useDispatchSteps(sequenceId)
- CRUD na tabela `dispatch_sequence_steps`
- Reordenar steps (atualizar `step_order`)
- Query key: `["dispatch_steps", sequenceId]`

## Fase 3: Componentes de UI

### Reestruturacao da Pagina Principal
O arquivo `DispatchCampaigns.tsx` sera refatorado para seguir o padrao de `GroupCampaignsPage.tsx`:
- Estado `selectedCampaign` controla se mostra lista ou detalhes
- Lista de campanhas (reutilizando componentes `DataTable`, `StatusBadge`, `EmptyState`)
- Dialog simplificado de criacao (nome + descricao apenas)

### Novo Componente: DispatchCampaignDetails
Similar ao `GroupCampaignDetails`, com 4 abas:

```text
src/components/dispatch-campaigns/
  DispatchCampaignDetails.tsx      -- Container com Tabs
  DispatchCampaignList.tsx         -- Lista de campanhas
  dialogs/
    CreateDispatchDialog.tsx       -- Dialog de criacao
  tabs/
    ConfigTab.tsx                  -- Configuracao (nome, descricao, status, instancia)
    ContactsTab.tsx                -- Lista de contatos com stats e acoes
    SequencesTab.tsx               -- Lista + editor de sequencias
    AnalyticsTab.tsx               -- Metricas e graficos
  sequences/
    DispatchSequenceList.tsx       -- Lista de sequencias
    DispatchSequenceBuilder.tsx    -- Editor de steps (lista vertical)
    StepCard.tsx                   -- Card de cada step
    AddStepDialog.tsx              -- Modal para adicionar etapa
    EditStepDialog.tsx             -- Modal para editar etapa (texto, imagem, delay, etc.)
```

### Aba Configuracao
- Card "Informacoes Basicas": nome, descricao, status (select)
- Card "Configuracao de Envio": instancia (select das instancias conectadas), checkbox de uso exclusivo
- Botao "Salvar Alteracoes"

### Aba Contatos
- 4 cards de metricas no topo (Total, Ativos, Em Sequencia, Concluidos)
- Barra de busca + filtros (status, sequencia)
- Tabela com colunas: checkbox, Nome, Telefone, Sequencia (nome + step atual), Status, Acoes
- Menu de acoes por contato: Editar, Iniciar sequencia, Pausar, Reiniciar, Remover
- Botoes no header: Importar, Adicionar
- Paginacao

### Aba Sequencias
- Mesma estrutura da `SequenceList` de grupos, adaptada com os trigger types de despacho (manual, agendado, API, ao adicionar)
- Ao clicar em editar, exibe o `DispatchSequenceBuilder`

### DispatchSequenceBuilder (Editor de Steps)
- Header com nome da sequencia + botao voltar + salvar
- Lista vertical de steps com setas de conexao entre eles
- Cada step e um card mostrando: numero, icone do tipo, preview do conteudo, botoes editar/deletar
- Botao "+ Adicionar Etapa" no final
- Dialogs modais para adicionar/editar cada tipo de step

### Tipos de Step suportados
1. **Mensagem de Texto**: textarea com preview e variaveis ({nome}, {telefone}, {email})
2. **Imagem**: upload/URL + legenda
3. **Video**: upload/URL + legenda
4. **Audio**: upload/URL
5. **Documento**: upload/URL
6. **Botoes**: texto + ate 3 botoes com labels
7. **Lista**: titulo + botao + secoes com itens
8. **Delay**: valor numerico + unidade (minutos/horas/dias) + atalhos rapidos

### Aba Analytics
- 4 cards de metricas (Enviadas, Entregues, Lidas, Falhas) com percentuais
- Grafico de barras "Envios por Dia" usando recharts
- Tabela "Performance por Sequencia"

## Fase 4: Roteamento

Sem mudancas na rota -- a pagina `/campaigns/whatsapp/despacho` continua usando o mesmo componente, mas agora com a nova estrutura de lista + detalhes inline (sem subrotas, mesmo padrao de Grupos).

## Resumo de Arquivos

| Operacao | Arquivo |
|----------|---------|
| Novo | Migracao SQL (5 tabelas) |
| Novo | `src/hooks/useDispatchCampaigns.ts` |
| Novo | `src/hooks/useDispatchContacts.ts` |
| Novo | `src/hooks/useDispatchSequences.ts` |
| Novo | `src/hooks/useDispatchSteps.ts` |
| Novo | `src/components/dispatch-campaigns/DispatchCampaignDetails.tsx` |
| Novo | `src/components/dispatch-campaigns/DispatchCampaignList.tsx` |
| Novo | `src/components/dispatch-campaigns/dialogs/CreateDispatchDialog.tsx` |
| Novo | `src/components/dispatch-campaigns/tabs/ConfigTab.tsx` |
| Novo | `src/components/dispatch-campaigns/tabs/ContactsTab.tsx` |
| Novo | `src/components/dispatch-campaigns/tabs/SequencesTab.tsx` |
| Novo | `src/components/dispatch-campaigns/tabs/AnalyticsTab.tsx` |
| Novo | `src/components/dispatch-campaigns/sequences/DispatchSequenceList.tsx` |
| Novo | `src/components/dispatch-campaigns/sequences/DispatchSequenceBuilder.tsx` |
| Novo | `src/components/dispatch-campaigns/sequences/AddStepDialog.tsx` |
| Novo | `src/components/dispatch-campaigns/sequences/EditStepDialog.tsx` |
| Novo | `src/components/dispatch-campaigns/sequences/StepCard.tsx` |
| Novo | `src/components/dispatch-campaigns/index.ts` |
| Modificado | `src/pages/campaigns/DispatchCampaigns.tsx` (refatorado) |

## Ordem de Implementacao

Devido ao tamanho, a implementacao sera dividida em etapas sequenciais:

1. Migracao SQL (criar todas as 5 tabelas com RLS e indices)
2. Hooks de dados (4 hooks)
3. Lista de campanhas + dialog de criacao + componente de detalhes com abas
4. Aba Configuracao
5. Aba Contatos
6. Aba Sequencias (lista + builder + dialogs de steps)
7. Aba Analytics
