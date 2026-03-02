

## Problema

A contagem de tags está incorreta (195 em vez de 364) porque as queries na função `loadCampaignMeta` usam o **limite padrão do Supabase de 1000 linhas**. Se a campanha tem mais de 1000 call_leads, apenas os primeiros 1000 são processados para contagem de tags. Além disso, a query na tabela `leads` (linha 188) também está limitada a 1000 por batch.

## Correção

**`src/components/call-panel/CreateQueueDialog.tsx`** — função `loadCampaignMeta`:

1. **Paginar a query de `call_leads`** (linha 156-158): em vez de uma única query sem limite, buscar em lotes de 1000 usando `.range(offset, offset + 999)` até esgotar os resultados
2. **Paginar a query de `leads`** (linha 188-192): para cada batch de phones, garantir que a query também pagine os resultados caso ultrapassem 1000

### Mesma correção em `getLeadPhonesByTags`

A função auxiliar `getLeadPhonesByTags` (usada em `loadFilteredCount` e `handleSubmit`) tem o mesmo problema — a query de phones dos `call_leads` e a query da tabela `leads` também precisam de paginação.

### Lógica de paginação

```text
let allLeads = [];
let from = 0;
const PAGE = 1000;
while (true) {
  const { data } = await query.range(from, from + PAGE - 1);
  if (!data || data.length === 0) break;
  allLeads.push(...data);
  if (data.length < PAGE) break;
  from += PAGE;
}
```

Aplicar esse padrão em:
- `loadCampaignMeta` → query de `call_leads` (linha 156)
- `loadCampaignMeta` → query de `leads` dentro do loop de batches (linha 188)
- `getLeadPhonesByTags` → query de `call_leads` (phones)
- `getLeadPhonesByTags` → query de `leads` com overlaps

