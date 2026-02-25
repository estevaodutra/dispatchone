

## Diagnóstico: Importação CSV não sincroniza com `call_leads`

### Causa raiz

A mutation `importLeads` no `useLeads.ts` (linhas 308-371) corretamente atribui `active_campaign_id` e `active_campaign_type` na tabela `leads`, mas **não cria os registros correspondentes na tabela `call_leads`**. 

Comparando com `bulkAddToCampaign` (linhas 264-291), que faz o upsert em `call_leads` quando `campaignType === "ligacao"`, a importação simplesmente ignora essa etapa. Resultado: os leads ficam marcados como pertencendo à campanha "TikTok Shop" na tabela genérica, mas não aparecem na aba de Leads da campanha de ligação porque faltam os registros em `call_leads`.

### Solução

Após o loop de importação em `importLeads`, adicionar uma etapa de sincronização com `call_leads` para todos os leads que foram atribuídos a uma campanha do tipo `ligacao`.

### Alteração

#### `src/hooks/useLeads.ts` — Adicionar sync com `call_leads` após importação

Após o loop `for (const lead of leads)` (depois da linha 362), antes do `return`, adicionar:

```typescript
// Sync imported leads to call_leads for ligacao campaigns
const ligacaoLeads = leads.filter(l => {
  const cType = l.campaignType || defaultCampaignType;
  const cId = l.campaignId || defaultCampaignId;
  return cType === "ligacao" && cId;
});

if (ligacaoLeads.length > 0) {
  // Group by campaignId
  const byCampaign = new Map<string, typeof ligacaoLeads>();
  for (const l of ligacaoLeads) {
    const cId = (l.campaignId || defaultCampaignId)!;
    if (!byCampaign.has(cId)) byCampaign.set(cId, []);
    byCampaign.get(cId)!.push(l);
  }

  for (const [campaignId, campaignLeads] of byCampaign) {
    for (let i = 0; i < campaignLeads.length; i += 200) {
      const batch = campaignLeads.slice(i, i + 200);
      const rows = batch.map(l => ({
        campaign_id: campaignId,
        user_id: user.id,
        phone: l.phone,
        name: l.name || null,
        email: l.email || null,
        status: "pending",
      }));
      await supabase.from("call_leads").upsert(rows as any, {
        onConflict: "phone,campaign_id",
      });
    }
  }
}
```

Também adicionar invalidação das queries de `call-leads` no `onSuccess`:

```typescript
queryClient.invalidateQueries({ queryKey: ["call-leads"] });
queryClient.invalidateQueries({ queryKey: ["call_leads"] });
```

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useLeads.ts` | Adicionar sync `call_leads` no `importLeads` + invalidar cache |

