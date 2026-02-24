

# Migrar tabelas de chamadas para isolamento por company_id (Fase 2)

## Problema

Quando o usuario (Mauro Dutra) seleciona a companhia "Estevao Dutra" no seletor lateral, os operadores aparecem corretamente (ja filtrados por `company_id`), mas as ligacoes, campanhas, leads e fila mostram zero dados. Isso acontece porque essas tabelas ainda usam `user_id = auth.uid()` nas politicas RLS, entao so mostram dados do proprio usuario logado.

## Solucao

Adicionar `company_id` nas tabelas `call_campaigns`, `call_logs`, `call_leads` e `call_queue`, migrar os dados existentes, atualizar as RLS policies para usar `is_company_member()`, e atualizar os hooks do frontend para filtrar por `activeCompanyId`.

## Alteracoes

### 1. Migracao SQL

Adicionar coluna `company_id UUID` nas 4 tabelas:
- `call_campaigns` -- migrar com base no `user_id` -> `companies.owner_id`
- `call_logs` -- migrar via `call_campaigns.company_id` ou `user_id`
- `call_leads` -- migrar via `call_campaigns.company_id`
- `call_queue` -- migrar com base no `user_id` -> `companies.owner_id`

Atualizar RLS policies de `user_id = auth.uid()` para `is_company_member(company_id, auth.uid())`.

### 2. Hooks do Frontend

**`src/hooks/useCallPanel.ts`**
- Importar `useCompany` e obter `activeCompanyId`
- Adicionar filtro `.eq("company_id", activeCompanyId)` na query de `call_logs`
- Atualizar `queryKey` para incluir `activeCompanyId`

**`src/hooks/useCallCampaigns.ts`**
- Importar `useCompany` e filtrar por `activeCompanyId`
- Inserir `company_id` ao criar campanha

**`src/hooks/useCallLeads.ts`**
- Sem mudanca direta (leads sao filtrados por campaign_id que ja pertence a companhia via RLS)

**`src/hooks/useCallQueuePanel.ts`**
- Importar `useCompany` e filtrar por `activeCompanyId`

**`src/hooks/useCallQueue.ts`**
- Inserir `company_id` ao adicionar items na fila

**`src/hooks/useCallLogs.ts`**
- Sem mudanca direta (filtrado por campaign_id)

### 3. Edge Functions

**`supabase/functions/queue-executor/index.ts`**
- Passar `company_id` ao criar `call_logs`

**`supabase/functions/call-dial/index.ts`**
- Incluir `company_id` ao criar registros

**`supabase/functions/call-status/index.ts`**
- Incluir `company_id` ao criar registros

**`supabase/functions/reschedule-failed-calls/index.ts`**
- Incluir `company_id` ao criar novos logs de retentativa

### Detalhes Tecnicos

**Migracao de dados existentes:**
```text
1. ALTER TABLE call_campaigns ADD COLUMN company_id UUID
2. UPDATE call_campaigns SET company_id = (SELECT id FROM companies WHERE owner_id = call_campaigns.user_id LIMIT 1)
3. Repetir para call_logs, call_leads, call_queue
4. DROP existing RLS policies
5. CREATE new RLS policies usando is_company_member()
```

**RLS nova (exemplo para call_campaigns):**
```text
SELECT: is_company_member(company_id, auth.uid())
INSERT: is_company_member(company_id, auth.uid()) -- company_id obrigatorio
UPDATE: is_company_member(company_id, auth.uid())
DELETE: is_company_admin(company_id, auth.uid())
```

### Arquivos Alterados

| Arquivo | Descricao |
|---------|-----------|
| Nova migracao SQL | Adicionar company_id + migrar dados + RLS |
| `src/hooks/useCallPanel.ts` | Filtrar por activeCompanyId |
| `src/hooks/useCallCampaigns.ts` | Filtrar e inserir company_id |
| `src/hooks/useCallQueuePanel.ts` | Filtrar por activeCompanyId |
| `src/hooks/useCallQueue.ts` | Inserir company_id |
| `supabase/functions/queue-executor/index.ts` | Passar company_id |
| `supabase/functions/call-dial/index.ts` | Passar company_id |
| `supabase/functions/call-status/index.ts` | Passar company_id |
| `supabase/functions/reschedule-failed-calls/index.ts` | Passar company_id |

