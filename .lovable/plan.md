

## Plano: Adicionar Coluna LID na Tabela de Leads e Group Members

### Contexto
- `leads` e `group_members` **não** possuem coluna `lid`
- `pirate_leads` **já** possui coluna `lid`
- O LID (Label ID do WhatsApp) é necessário para identificação única de contatos

### Alterações

**1. Migration SQL** — Adicionar coluna `lid` em `leads` e `group_members`
```sql
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lid text;
ALTER TABLE group_members ADD COLUMN IF NOT EXISTS lid text;
CREATE INDEX IF NOT EXISTS idx_leads_lid ON leads(lid);
CREATE INDEX IF NOT EXISTS idx_group_members_lid ON group_members(lid);
```

**2. `src/hooks/useLeads.ts`**
- Adicionar `lid: string | null` na interface `Lead`
- Incluir `lid` na busca: `name.ilike.%,phone.ilike.%,lid.ilike.%`

**3. `src/hooks/useGroupMembers.ts`**
- Adicionar `lid: string | null` em `GroupMember` e `DbGroupMember`
- Mapear no `transformDbToFrontend`

**4. `src/pages/Leads.tsx`**
- Adicionar coluna "LID" na tabela, exibindo o valor truncado com tooltip e copy-on-click

**5. `src/components/group-campaigns/tabs/MembersTab.tsx`**
- Adicionar coluna "LID" na tabela de membros

**6. `src/components/leads/ImportLeadsDialog.tsx`**
- Adicionar `"lid"` como `MappingField`
- Auto-mapear colunas com header contendo "lid" ou "label_id"
- Passar `lid` no objeto de lead importado

**7. `src/hooks/useLeads.ts` (mutations)**
- Incluir `lid` no `importLeads` mutation ao fazer upsert

**8. `src/components/leads/CreateLeadDialog.tsx` e `EditLeadDialog.tsx`**
- Adicionar campo opcional "LID" no formulário

**9. `supabase/functions/webhook-inbound/index.ts`**
- Ao sincronizar membros via group_join, salvar o LID extraído do event-classifier na coluna `lid` de `group_members` e `leads`

### Resultado
- Coluna LID visível nas tabelas de Leads e Membros
- Busca por LID funcional
- Importação CSV aceita coluna LID
- Webhook salva LID automaticamente ao capturar membros

