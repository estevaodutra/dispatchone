

## Plano: Corrigir filtro de tags no "Selecionar Todos" + Adicionar à Campanha

### Problema

Em `src/pages/Leads.tsx`, a função `getSelectedIds()` (linha 203-213) reconstrói a query para buscar todos os IDs quando o usuário usa "Selecionar todos os resultados". Porém, ela **não aplica o filtro de tags**:

```typescript
// Filtros aplicados:
if (filters.search) ...    ✅
if (filters.status) ...    ✅
if (filters.sourceType) ...✅
if (filters.campaignType)..✅
if (filters.sourceGroupName)..✅
// FALTANDO:
if (filters.tags) ...      ❌  ← nunca é aplicado
```

Resultado: ao filtrar por tag "clinica" e clicar "Selecionar todos", a query retorna TODOS os leads (sem filtro de tag), enviando ~1000 leads para a campanha em vez dos ~X que têm a tag.

### Correção

**Arquivo:** `src/pages/Leads.tsx`, função `getSelectedIds` (linhas 206-212)

Adicionar o filtro de tags que já existe na query principal do `useLeads`:

```typescript
if (filters.tags && filters.tags.length > 0) {
  query = query.overlaps("tags", filters.tags);
}
```

Uma única linha faltando. Mesma lógica usada no hook `useLeads` (linha 63).

