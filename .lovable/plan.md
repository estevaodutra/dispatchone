

# Corrigir erro ao adicionar leads em massa a uma campanha

## Problema

Ao selecionar todos os 933 leads filtrados e tentar adicionar a uma campanha de ligacao, ocorre o erro "Erro ao adicionar a campanha". Isso acontece porque o Supabase tem limites no tamanho de queries com `.in("id", ids)` quando ha muitos IDs (centenas ou milhares).

## Solucao

Modificar a mutacao `bulkAddToCampaign` em `src/hooks/useLeads.ts` para processar os IDs em lotes (batches) de 200, evitando o limite do Supabase.

## Mudancas

### `src/hooks/useLeads.ts` -- mutacao `bulkAddToCampaign`

1. Ao verificar leads existentes (`skipExisting`), buscar em lotes de 200
2. Ao fazer o `update`, processar em lotes de 200
3. Aplicar a mesma logica de batching para `bulkDelete`, `bulkAddTags` e `bulkRemoveTags` que tambem usam `.in("id", ids)`

### Codigo atualizado (bulkAddToCampaign)

```text
const bulkAddToCampaign = useMutation({
  mutationFn: async ({ ids, campaignId, campaignType, skipExisting }) => {
    let toUpdate = ids;
    if (skipExisting) {
      const existingIds = new Set<string>();
      for (let i = 0; i < ids.length; i += 200) {
        const batch = ids.slice(i, i + 200);
        const { data } = await supabase
          .from("leads").select("id").in("id", batch)
          .eq("active_campaign_id", campaignId);
        (data || []).forEach(e => existingIds.add(e.id));
      }
      toUpdate = ids.filter(id => !existingIds.has(id));
    }
    if (toUpdate.length === 0) return { added: 0, skipped: ids.length };
    for (let i = 0; i < toUpdate.length; i += 200) {
      const batch = toUpdate.slice(i, i + 200);
      const { error } = await supabase
        .from("leads")
        .update({ active_campaign_id: campaignId, active_campaign_type: campaignType })
        .in("id", batch);
      if (error) throw error;
    }
    return { added: toUpdate.length, skipped: ids.length - toUpdate.length };
  },
  ...
});
```

### Mesma logica de batching para:

- `bulkDelete` -- deletar em lotes de 200
- `bulkAddTags` -- buscar e atualizar em lotes de 200
- `bulkRemoveTags` -- buscar e atualizar em lotes de 200
- `getSelectedIds` em `Leads.tsx` -- buscar IDs em lotes (ja esta sem limite, mas verificar)

### Arquivo modificado

- `src/hooks/useLeads.ts` (4 mutacoes com batching)

