

## Plano: Corrigir falha silenciosa na importação de leads extraídos

### Problema raiz
Na linha 461 do `ExtractLeadsDialog.tsx`, o código faz:
```typescript
leadData.source_group_id = jid; // "123456789@g.us" — string!
```
Mas a coluna `source_group_id` na tabela `leads` é do tipo **`uuid`**. O Supabase rejeita o insert com erro de tipo, e o `catch` na linha 501-502 apenas incrementa `result.ignored` sem logar o erro. Resultado: **0 leads inseridos, todos "ignorados" silenciosamente**.

### Correções

**1. `src/components/leads/ExtractLeadsDialog.tsx` — linha ~461:**
Não setar `source_group_id` com o JID (que não é UUID). Remover essa atribuição e manter apenas `source_group_name`:
```typescript
if (keepReference) {
  // source_group_id é uuid, não pode receber JID string
  leadData.source_group_name = groupName;
}
```

**2. Adicionar `console.error` no catch (linha ~501-502):**
```typescript
} else if (error) {
  console.error("[ExtractLeads] Upsert error:", error.message);
  result.ignored += batch.length;
}
```

Isso resolve o problema imediatamente — os leads serão inseridos corretamente e aparecerão na página de Leads.

