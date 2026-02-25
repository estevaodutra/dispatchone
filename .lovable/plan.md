

## Plano: Sincronização automática com TODAS as campanhas na importação CSV

### Problema
Atualmente, a importação CSV só sincroniza leads com `call_leads` para campanhas do tipo `ligacao`. Para campanhas do tipo `despacho`, não cria registros em `dispatch_campaign_contacts`. Para campanhas do tipo `grupos`, não há tabela de contatos dedicada mas o campo `active_campaign_id` já é atribuído.

### Análise das tabelas por tipo de campanha

| Tipo | Tabela principal | Tabela de contatos | Chave de unicidade |
|------|-----------------|-------------------|-------------------|
| `ligacao` | `call_campaigns` | `call_leads` | `phone,campaign_id` |
| `despacho` | `dispatch_campaigns` | `dispatch_campaign_contacts` | `campaign_id,lead_id` |
| `grupos` | (group_campaigns) | Sem tabela dedicada | N/A |

### Solução

Expandir a lógica de sync pós-importação no `importLeads` (`useLeads.ts`) e no `bulkAddToCampaign` para incluir campanhas de despacho. Para isso, após inserir os leads na tabela `leads`, o sistema precisa:

1. Para `ligacao`: upsert em `call_leads` (já implementado)
2. Para `despacho`: upsert em `dispatch_campaign_contacts` usando o `lead_id` dos leads recém-criados/existentes
3. Para `grupos`: apenas atribuir `active_campaign_id` (já funciona)

### Alterações

#### `src/hooks/useLeads.ts` — `importLeads` mutation

Após o bloco de sync com `call_leads` (linhas 363-394), adicionar sync com `dispatch_campaign_contacts`:

```typescript
// Sync imported leads to dispatch_campaign_contacts for despacho campaigns
const despachoLeads = leads.filter(l => {
  const cType = l.campaignType || defaultCampaignType;
  const cId = l.campaignId || defaultCampaignId;
  return cType === "despacho" && cId;
});

if (despachoLeads.length > 0) {
  const byCampaign = new Map<string, typeof despachoLeads>();
  for (const l of despachoLeads) {
    const cId = (l.campaignId || defaultCampaignId)!;
    if (!byCampaign.has(cId)) byCampaign.set(cId, []);
    byCampaign.get(cId)!.push(l);
  }

  for (const [campaignId, campaignLeads] of byCampaign) {
    // Fetch lead IDs by phone
    const phones = campaignLeads.map(l => l.phone);
    const leadIds: string[] = [];
    for (let i = 0; i < phones.length; i += 200) {
      const batch = phones.slice(i, i + 200);
      const { data } = await supabase
        .from("leads").select("id").in("phone", batch).eq("user_id", user.id);
      leadIds.push(...(data || []).map(d => d.id));
    }

    // Upsert into dispatch_campaign_contacts
    for (let i = 0; i < leadIds.length; i += 200) {
      const batch = leadIds.slice(i, i + 200);
      const rows = batch.map(leadId => ({
        campaign_id: campaignId,
        user_id: user.id,
        lead_id: leadId,
        status: "active",
      }));
      await supabase.from("dispatch_campaign_contacts")
        .upsert(rows as any, { onConflict: "campaign_id,lead_id" });
    }
  }
}
```

Adicionar invalidação de queries no `onSuccess`:
```typescript
queryClient.invalidateQueries({ queryKey: ["dispatch_contacts"] });
```

#### `src/hooks/useLeads.ts` — `bulkAddToCampaign` mutation

Após o bloco de sync com `call_leads` (linhas 264-291), adicionar o mesmo padrão para despacho:

```typescript
// Sync to dispatch_campaign_contacts if campaign type is despacho
if (campaignType === "despacho") {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    for (let i = 0; i < toUpdate.length; i += 200) {
      const batch = toUpdate.slice(i, i + 200);
      const rows = batch.map(leadId => ({
        campaign_id: campaignId,
        user_id: user.id,
        lead_id: leadId,
        status: "active",
      }));
      await supabase.from("dispatch_campaign_contacts")
        .upsert(rows as any, { onConflict: "campaign_id,lead_id" });
    }
  }
}
```

Adicionar invalidação no `onSuccess`:
```typescript
queryClient.invalidateQueries({ queryKey: ["dispatch_contacts"] });
```

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useLeads.ts` | Adicionar sync `dispatch_campaign_contacts` no `importLeads` e `bulkAddToCampaign` + invalidar cache |

