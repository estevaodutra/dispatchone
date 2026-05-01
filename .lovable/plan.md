## Problema

Quando um lead é adicionado **dentro de uma campanha de ligação** (botão "+ Adicionar Lead" em `LeadsTab` ou via importação CSV de leads de campanha), ele entra apenas em `call_leads`. A tabela global `leads` (que alimenta a página `/leads`) **não recebe nada** — por isso a campanha mostra 1 lead e a página Leads mostra TOTAL = 0.

A sincronização hoje só acontece no sentido inverso: `Leads → call_leads` (no `useLeads.importLeads` e no `bulkAddToCampaign`). Falta o sentido `call_leads → leads` quando a origem é a campanha.

## Solução

Sempre que um lead for criado em uma campanha (single ou batch), também fazer um `upsert` na tabela `leads` global, marcando origem corretamente.

### Mudanças

**1. `src/hooks/useCallLeads.ts` — `addLeadMutation` (single add)**

Após inserir em `call_leads` com sucesso, fazer `upsert` em `leads`:

```ts
await supabase.from("leads").upsert({
  user_id: user.id,
  phone: lead.phone,
  name: lead.name || null,
  email: lead.email || null,
  custom_fields: lead.customFields || {},
  active_campaign_id: campaignId,
  active_campaign_type: "ligacao",
  source_type: "campaign_manual",
  source_campaign_id: campaignId,
}, { onConflict: "user_id,phone", ignoreDuplicates: false });
```

Se o lead já existir (mesmo `user_id + phone`), atualiza `active_campaign_id/type` e mantém demais campos via merge. Falha do upsert em `leads` **não deve quebrar** o fluxo de `call_leads` (try/catch + warn).

**2. `src/hooks/useCallLeads.ts` — `addLeadsBatchMutation` (importação batch dentro da campanha)**

Mesma lógica em batch após o insert em `call_leads`, usando `safeBatchUpsert` (mover o helper de `useLeads.ts` para um arquivo compartilhado, ex.: `src/lib/supabase-batch.ts`, ou re-exportá-lo).

**3. `onSuccess` callbacks**

Invalidar também as queries da página Leads:
```ts
queryClient.invalidateQueries({ queryKey: ["leads"] });
queryClient.invalidateQueries({ queryKey: ["leads-stats"] });
```

**4. Backfill SQL (one-shot)**

Inserir em `leads` os registros de `call_leads` que ainda não existem na base global, para o usuário atual. Filtro: `call_leads` cujo `phone` não exista em `leads` para o mesmo `user_id`. Define:
- `source_type = 'campaign_manual'`
- `source_campaign_id = call_leads.campaign_id`
- `active_campaign_id = call_leads.campaign_id`
- `active_campaign_type = 'ligacao'`

### Detalhes técnicos

- O constraint de unicidade em `leads` é `(user_id, phone)` — confirmado pelo uso de `update().eq("phone").eq("user_id")` em `useLeads.importLeads`. Usaremos esse mesmo `onConflict`.
- `dispatch_campaign_contacts` já referencia `lead_id` (FK para `leads`), então o problema só ocorre em campanhas de ligação. Não há mudança necessária para despacho.
- Não tocar em `src/integrations/supabase/client.ts` nem `types.ts`.

### Arquivos modificados

- `src/hooks/useCallLeads.ts` (mudanças principais)
- `src/lib/supabase-batch.ts` (novo — extrair `safeBatchUpsert`) e `src/hooks/useLeads.ts` (importar do novo lugar)
- Migration SQL para backfill

### Fora do escopo

- Sincronização reversa para `pirate_leads` (já é feita pela edge function `pirate-leads-api`).
- Mudar a UI da página Leads.
