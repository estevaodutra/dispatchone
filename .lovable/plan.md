
# Corrigir leads nao aparecendo na campanha de ligacao

## Problema

Quando o usuario adiciona leads a uma campanha de ligacao pela pagina de Leads (acao "Adicionar a Campanha"), o sistema so atualiza a tabela `leads` (campo `active_campaign_id`). Porem, a aba "Leads" da campanha de ligacao consulta a tabela `call_leads`, que e uma tabela separada. Como nenhum registro e inserido em `call_leads`, os leads nao aparecem na campanha.

## Solucao

Modificar a mutacao `bulkAddToCampaign` em `src/hooks/useLeads.ts` para que, quando o tipo de campanha for `ligacao`, alem de atualizar a tabela `leads`, tambem insira os registros correspondentes na tabela `call_leads`.

## Mudancas

### `src/hooks/useLeads.ts` -- mutacao `bulkAddToCampaign`

Apos atualizar os leads na tabela `leads`, verificar se `campaignType === "ligacao"`. Se sim:

1. Buscar os dados (phone, name, email) dos leads atualizados em lotes de 200
2. Inserir cada lead na tabela `call_leads` com status `pending`, usando upsert para evitar duplicatas (conflito em `campaign_id` + `phone`)
3. Invalidar tambem a query `call_leads` para que a aba de Leads da campanha atualize

### Logica adicional

```text
// Apos o update em leads, se for campanha de ligacao:
if (campaignType === "ligacao") {
  // Buscar dados dos leads atualizados
  const leadsData = [];
  for (let i = 0; i < toUpdate.length; i += 200) {
    const batch = toUpdate.slice(i, i + 200);
    const { data } = await supabase
      .from("leads")
      .select("id, phone, name, email")
      .in("id", batch);
    leadsData.push(...(data || []));
  }

  // Inserir em call_leads (upsert)
  const { data: { user } } = await supabase.auth.getUser();
  for (let i = 0; i < leadsData.length; i += 200) {
    const batch = leadsData.slice(i, i + 200);
    const rows = batch.map(l => ({
      campaign_id: campaignId,
      user_id: user.id,
      phone: l.phone,
      name: l.name,
      email: l.email,
      lead_id: l.id,
      status: "pending",
    }));
    await supabase.from("call_leads").upsert(rows, {
      onConflict: "campaign_id,phone"
    });
  }
}
```

### Invalidacao de cache

Adicionar no `onSuccess`:
```text
queryClient.invalidateQueries({ queryKey: ["call_leads"] });
queryClient.invalidateQueries({ queryKey: ["call_leads_stats"] });
```

### Arquivo modificado

- `src/hooks/useLeads.ts` (mutacao `bulkAddToCampaign`)
