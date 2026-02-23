

# Melhorar Pagina de Leads com Origem, Filtros e Acoes em Massa

## Resumo

Adicionar novas colunas (Origem, Tipo, Grupo), novos filtros, acoes em massa melhoradas (incluindo "Adicionar a Campanha" e "Remover Tag"), e menu de acoes individual expandido.

## Etapa 1: Migracao do Banco de Dados

Adicionar 5 novas colunas na tabela `leads`:

```text
source_type    VARCHAR(50)   -- import_csv, whatsapp_group, api, manual, call_campaign, dispatch_campaign
source_name    VARCHAR(255)  -- descricao legivel da origem
source_campaign_id  UUID     -- campanha de origem (se aplicavel)
source_group_id     UUID     -- ID do grupo de origem
source_group_name   VARCHAR(255) -- nome do grupo de origem
```

Atualizar leads existentes que tem tag "grupo" para preencher `source_type = 'whatsapp_group'`.

## Etapa 2: Atualizar Interface Lead e Hook

### `src/hooks/useLeads.ts`

- Adicionar os novos campos na interface `Lead`: `source_type`, `source_name`, `source_campaign_id`, `source_group_id`, `source_group_name`
- Adicionar filtros `sourceType` e `campaignType` na interface `LeadFilters`
- Aplicar os novos filtros na query (`.eq("source_type", ...)` e `.eq("active_campaign_type", ...)`)
- Adicionar mutacao `bulkRemoveTags` para remover tags em massa
- Adicionar mutacao `bulkAddToCampaign` para mover leads para campanha

## Etapa 3: Atualizar Sincronizacao de Grupo

### `src/pages/Leads.tsx` e `src/hooks/useGroupMembers.ts`

- No `handleSync` e no hook de membros, preencher os novos campos ao fazer upsert:
  - `source_type: 'whatsapp_group'`
  - `source_group_id: group_campaign_id`
- Buscar o nome do grupo (`group_campaigns.name`) para preencher `source_group_name`

## Etapa 4: Atualizar Tabela de Leads

### `src/pages/Leads.tsx`

Novas colunas na tabela:
- **Origem**: Badge com texto baseado em `source_type` (Importacao CSV, Grupo WhatsApp, API Externa, Manual, etc.)
- **Tipo**: Badge colorido baseado em `active_campaign_type` (Grupo = azul, Ligacao = verde, WhatsApp = verde claro, API = roxo)
- **Grupo**: Texto com `source_group_name` ou "---"

Novos filtros no header:
- Dropdown "Tipo" filtrando por `active_campaign_type` (grupos, ligacao, despacho)
- Dropdown "Origem" filtrando por `source_type`

Funcionalidade "Selecionar Todos":
- Quando todos da pagina estao selecionados, mostrar botao "Selecionar todos os X leads"
- Estado `selectAll` que indica selecao total (para acoes em massa no backend)

## Etapa 5: Melhorar Barra de Acoes em Massa

### `src/components/leads/BulkActionsBar.tsx`

Adicionar novos botoes:
- "Adicionar a Campanha" (abre modal)
- "Remover Tag" (abre modal)
- Manter "Adicionar Tag", "Excluir" e "Limpar selecao"

## Etapa 6: Criar Modal "Adicionar a Campanha"

### Novo arquivo: `src/components/leads/AddToCampaignDialog.tsx`

Modal com:
- Radio para tipo de campanha (Ligacao, Despacho, Grupo)
- Select com campanhas filtradas pelo tipo selecionado
- Checkbox "Remover da campanha atual"
- Checkbox "Ignorar leads que ja estao nesta campanha"
- Ao confirmar, atualiza `active_campaign_id` e `active_campaign_type` dos leads selecionados
- Toast com contagem de sucesso/ignorados

## Etapa 7: Melhorar Tag Dialog

### Refatorar dialog de tag inline para componente proprio

- Mostrar tags existentes como badges clicaveis
- Campo para criar nova tag
- Funcionalidade de remover tag (para acao "Remover Tag")

## Etapa 8: Expandir Menu de Acoes Individual

### `src/components/leads/LeadActionsMenu.tsx`

Adicionar novas opcoes:
- "Adicionar a campanha" (abre modal AddToCampaign para 1 lead)
- "Copiar telefone" (copia para clipboard)
- "Abrir no WhatsApp" (abre `wa.me/{phone}`)
- Reorganizar itens com separadores conforme o wireframe

## Etapa 9: Atualizar Criacao Manual de Lead

### `src/components/leads/CreateLeadDialog.tsx`

- Ao criar lead manualmente, preencher `source_type: 'manual'`

## Etapa 10: Atualizar Importacao CSV

### `src/components/leads/ImportLeadsDialog.tsx` e `src/hooks/useLeads.ts`

- Na mutacao `importLeads`, preencher `source_type: 'import_csv'` nos leads importados

## Detalhes Tecnicos

### Migracao SQL

```text
ALTER TABLE leads ADD COLUMN source_type text;
ALTER TABLE leads ADD COLUMN source_name text;
ALTER TABLE leads ADD COLUMN source_campaign_id uuid;
ALTER TABLE leads ADD COLUMN source_group_id uuid;
ALTER TABLE leads ADD COLUMN source_group_name text;

-- Preencher dados existentes
UPDATE leads SET source_type = 'whatsapp_group' WHERE 'grupo' = ANY(tags) AND source_type IS NULL;
UPDATE leads SET source_type = 'manual' WHERE source_type IS NULL;
```

### Mapeamento de badges de tipo

```text
active_campaign_type  ->  Badge
"grupos"              ->  "Grupo" (azul)
"ligacao"             ->  "Ligacao" (verde)
"despacho"            ->  "WhatsApp" (verde claro)
null                  ->  "---" (cinza)
```

### Mapeamento de badges de origem

```text
source_type           ->  Label
"import_csv"          ->  "Importacao CSV"
"whatsapp_group"      ->  "Grupo WhatsApp"
"api"                 ->  "API Externa"
"manual"              ->  "Manual"
"call_campaign"       ->  "Campanha Ligacao"
"dispatch_campaign"   ->  "Campanha Despacho"
```

### Arquivos criados

- `src/components/leads/AddToCampaignDialog.tsx`
- `src/components/leads/BulkTagDialog.tsx`

### Arquivos modificados

- `src/hooks/useLeads.ts` (interface, filtros, novas mutacoes)
- `src/hooks/useGroupMembers.ts` (preencher source fields no upsert)
- `src/pages/Leads.tsx` (colunas, filtros, selecao total, novos dialogs)
- `src/components/leads/BulkActionsBar.tsx` (novos botoes)
- `src/components/leads/LeadActionsMenu.tsx` (novas acoes)
- `src/components/leads/index.ts` (exportar novos componentes)
- `src/components/leads/CreateLeadDialog.tsx` (source_type manual)

