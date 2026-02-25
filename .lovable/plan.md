

## Problema identificado

Os leads de campanhas de ligação (`call_leads`) com `company_id = NULL` não são visíveis para outros membros da empresa. Isso acontece porque:

1. **RLS da tabela `call_leads`**: a policy de SELECT exige `company_id IS NOT NULL AND is_company_member(...)` OU `company_id IS NULL AND user_id = auth.uid()`. Quando Mauro (outro membro da empresa) faz o join, ele não é o `user_id` original e o `company_id` é NULL → join retorna NULL → nome e telefone não aparecem.

2. **1000 de 2152 registros** na tabela `call_leads` têm `company_id = NULL`, apesar de suas campanhas terem `company_id` definido.

3. **O hook `useCallLeads`** não inclui `company_id` no insert de novos leads.

## Solução

### 1. Migration SQL — backfill e trigger

Atualizar os registros existentes e garantir que futuros inserts herdem o `company_id` da campanha:

```sql
-- Backfill: copiar company_id da campanha para os leads que estão NULL
UPDATE call_leads cl
SET company_id = cc.company_id
FROM call_campaigns cc
WHERE cl.campaign_id = cc.id
  AND cl.company_id IS NULL
  AND cc.company_id IS NOT NULL;

-- Trigger: auto-preencher company_id no insert se não fornecido
CREATE OR REPLACE FUNCTION set_call_lead_company_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.company_id IS NULL AND NEW.campaign_id IS NOT NULL THEN
    SELECT company_id INTO NEW.company_id
    FROM call_campaigns
    WHERE id = NEW.campaign_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_call_lead_company_id
  BEFORE INSERT ON call_leads
  FOR EACH ROW
  EXECUTE FUNCTION set_call_lead_company_id();
```

### 2. `src/hooks/useCallLeads.ts` — incluir `company_id` nos inserts

Adicionar `company_id` do contexto da empresa ativa (via `useCompany()`) em todos os pontos de insert: `addLead`, `bulkAddLeads`, e `bulkEnqueueByStatus`.

### Detalhes técnicos

| Arquivo | Alteração |
|---------|-----------|
| Migration SQL | Backfill `company_id` nos 1000 registros NULL + trigger para auto-preencher em novos inserts |
| `src/hooks/useCallLeads.ts` | Incluir `activeCompanyId` nos inserts de `call_leads` |

O trigger garante que mesmo inserções feitas pelas Edge Functions (que não passam `company_id`) sejam corrigidas automaticamente.

