
# Banco de Leads Centralizado

## Visao Geral

Criar um modulo completo de gestao de leads centralizado, com importacao via planilha, acoes em massa, historico de campanhas e sistema de fila de ligacoes. A implementacao sera dividida em fases para facilitar revisao e testes.

---

## Fase 1: Banco de Dados (3 tabelas + RLS + indices)

### Tabela `leads`
- id, user_id, name, phone (UNIQUE por user_id), email, tags (text[]), custom_fields (jsonb)
- active_campaign_id (UUID), active_campaign_type (text)
- total_calls (int), total_messages (int), last_contact_at (timestamptz)
- status (text, default 'active'), created_at, updated_at
- Indices: phone, tags (GIN), active_campaign_id, status, created_at DESC
- RLS: user_id = auth.uid() para ALL

### Tabela `lead_campaign_history`
- id, user_id, lead_id (FK leads ON DELETE CASCADE), campaign_id, campaign_type, campaign_name
- status, result_action, notes, started_at, completed_at
- Indice: lead_id
- RLS: user_id = auth.uid() para SELECT e INSERT

### Tabela `call_queue`
- id, user_id, campaign_id (FK call_campaigns ON DELETE CASCADE), lead_id (FK leads ON DELETE CASCADE)
- position (int), attempts (int), last_attempt_at, last_result (text)
- status (text, default 'waiting'), created_at, updated_at
- UNIQUE(campaign_id, lead_id)
- Indices: campaign_id, (campaign_id + position), status
- RLS: user_id = auth.uid() para ALL

Trigger `update_updated_at` em leads e call_queue.

---

## Fase 2: Navegacao

### Menu Lateral (`AppSidebar.tsx`)
Adicionar item "Leads" com icone `Users` entre "Painel de Ligacoes" e "Numeros":

```text
Dashboard
Painel de Ligacoes
Leads             <-- NOVO
Numeros
Logs
Campanhas (submenu)
```

### Rota (`App.tsx`)
Adicionar rota `/leads` protegida com AppLayout.

### Traducoes
Adicionar `nav.leads: "Leads"` em en.ts, pt.ts e es.ts.

---

## Fase 3: Hook `useLeads`

Hook React Query com:
- **Listagem paginada** com filtros (search, tags, status, campaign_id, page, limit)
- **Contagem/stats** (total, ativos, em campanha, inativos)
- **CRUD**: createLead, updateLead, deleteLead
- **Acoes em massa**: bulkAddTags, bulkDelete
- **Importacao batch**: importLeads (com opcao update_existing)

---

## Fase 4: Pagina de Leads (`/leads`)

### Componentes a criar

1. **`src/pages/Leads.tsx`** - Pagina principal com:
   - Header com titulo + botao "+ Novo Lead"
   - 4 MetricCards (Total, Ativos, Em Campanha, Inativos)
   - Barra de busca + filtros (Tags, Status) + botao de menu (hamburger)
   - Tabela paginada com colunas: checkbox, Nome, Telefone, Tags, Campanha, Acoes
   - Paginacao (20 por pagina)
   - Barra de acoes em massa (aparece ao selecionar leads)

2. **`src/components/leads/CreateLeadDialog.tsx`** - Modal novo lead:
   - Campos: Nome, Telefone (obrigatorio), Email, Tags
   - Validacao de telefone unico

3. **`src/components/leads/EditLeadDialog.tsx`** - Modal editar lead

4. **`src/components/leads/ImportLeadsDialog.tsx`** - Modal importacao:
   - Drag-and-drop para CSV/Excel
   - Download de modelo
   - Mapeamento de colunas (apos upload)
   - Preview dos dados
   - Opcoes: atualizar existentes, tags padrao
   - Parsing de CSV no frontend (sem dependencia extra, usar FileReader + split)

5. **`src/components/leads/AddToQueueDialog.tsx`** - Modal adicionar a fila:
   - Selecao de campanha de ligacao
   - Posicao (inicio ou final da fila)
   - Contagem de leads selecionados

6. **`src/components/leads/LeadHistoryDialog.tsx`** - Modal historico de campanhas

7. **`src/components/leads/BulkActionsBar.tsx`** - Barra fixa ao selecionar leads:
   - Adicionar Tag, Adicionar a Fila, Excluir, Cancelar Selecao

8. **`src/components/leads/LeadActionsMenu.tsx`** - Dropdown por lead:
   - Editar, Ver historico, Adicionar tag, Adicionar a fila, Bloquear, Excluir

---

## Fase 5: Hook `useCallQueue`

Hook para gestao da fila de ligacoes:
- addToQueue(campaignId, leadIds, position)
- listQueue(campaignId)
- getNext(campaignId)
- removeFromQueue(campaignId, leadId)
- moveToEnd(campaignId, leadId) - para "nao atendeu"

---

## Fase 6: Edge Functions (API externa)

### `leads-api` (Edge Function unica com roteamento por path)

Endpoints roteados pelo path:
- `GET /leads` - Listar com filtros e paginacao
- `POST /leads` - Criar lead
- `GET /leads/:id` - Detalhes
- `PUT /leads/:id` - Atualizar
- `DELETE /leads/:id` - Excluir
- `GET /leads/:id/history` - Historico
- `POST /leads/import` - Importar em massa (JSON)
- `POST /leads/bulk/tags` - Tags em massa
- `DELETE /leads/bulk` - Excluir em massa
- `GET /leads/stats` - Estatisticas

### `call-queue-api` (Edge Function para fila)

- `POST /add` - Adicionar leads a fila
- `GET /:campaign_id` - Listar fila
- `GET /:campaign_id/next` - Proximo lead
- `POST /:campaign_id/reorder` - Reordenar
- `DELETE /:campaign_id/:lead_id` - Remover da fila
- `POST /no-answer/:call_id` - Nao atendeu (move pro final)

Ambas com autenticacao via API key (reusa validate-api-key existente).

---

## Arquivos a criar

| Arquivo | Descricao |
|---------|-----------|
| `src/pages/Leads.tsx` | Pagina principal |
| `src/hooks/useLeads.ts` | Hook de dados |
| `src/hooks/useCallQueue.ts` | Hook da fila |
| `src/components/leads/CreateLeadDialog.tsx` | Modal criar |
| `src/components/leads/EditLeadDialog.tsx` | Modal editar |
| `src/components/leads/ImportLeadsDialog.tsx` | Modal importar |
| `src/components/leads/AddToQueueDialog.tsx` | Modal fila |
| `src/components/leads/LeadHistoryDialog.tsx` | Modal historico |
| `src/components/leads/BulkActionsBar.tsx` | Barra acoes massa |
| `src/components/leads/LeadActionsMenu.tsx` | Menu acoes individual |
| `src/components/leads/index.ts` | Barrel export |
| `supabase/functions/leads-api/index.ts` | API de leads |
| `supabase/functions/call-queue-api/index.ts` | API da fila |

## Arquivos a modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/App.tsx` | Adicionar rota /leads |
| `src/components/layout/AppSidebar.tsx` | Adicionar item Leads no menu |
| `src/i18n/locales/en.ts` | Adicionar traducao nav.leads |
| `src/i18n/locales/pt.ts` | Adicionar traducao nav.leads |
| `src/i18n/locales/es.ts` | Adicionar traducao nav.leads |
| `supabase/config.toml` | Adicionar config das 2 edge functions |

## Migracoes SQL

1 migracao com: 3 tabelas, indices, RLS policies, triggers de updated_at

---

## Observacoes tecnicas

- Telefone e unico por usuario (UNIQUE constraint em user_id + phone)
- Tags sao armazenadas como text[] e filtradas via GIN index
- CSV parsing feito no frontend com FileReader (sem lib extra)
- Paginacao via `.range()` do Supabase client
- A fila usa campo `position` para ordenacao; ao mover pro final, position = MAX(position) + 1
- Maximo de tentativas vem da configuracao da campanha (call_campaigns)
- Edge functions usam validate-api-key para autenticacao externa
