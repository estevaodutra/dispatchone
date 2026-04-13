

## Plano: Corrigir Captura de Leads e Atualização em Tempo Real

### Problema Raiz

Dois bugs impedem o funcionamento:

**Bug 1 — Member sync usa tabela errada para encontrar a campanha**

O código de sync de membros (linha 284-288 do webhook-inbound) busca campanhas em `group_campaigns.group_jid`, mas esse campo é `NULL`. Os grupos estão vinculados via tabela `campaign_groups`. Resultado: nenhum membro novo é sincronizado via webhook.

**Bug 2 — senderPhone ainda usa o telefone da instância**

Apesar da correção no event-classifier, todos os `group_join` no banco ainda mostram `sender_phone: 5512982402981`. Provável causa: o deploy anterior não incluiu a versão atualizada do `_shared/event-classifier.ts`. Precisa re-deploy.

### Alterações

**`supabase/functions/webhook-inbound/index.ts` — Seção member sync (linhas 283-289)**

Trocar a query de `group_campaigns.group_jid` para buscar via `campaign_groups`:

```typescript
// ANTES (não funciona - group_jid é NULL):
const { data: groupCampaigns } = await supabase
  .from("group_campaigns")
  .select("id, user_id, instance_id")
  .eq("group_jid", context.chatJid)
  .eq("user_id", instance.user_id);

// DEPOIS (usa a tabela de vínculo correta):
const { data: linkedCampaigns } = await supabase
  .from("campaign_groups")
  .select("campaign_id")
  .eq("group_jid", context.chatJid);

const campaignIds = (linkedCampaigns || []).map(c => c.campaign_id);

const { data: groupCampaigns } = await supabase
  .from("group_campaigns")
  .select("id, user_id, instance_id")
  .in("id", campaignIds)
  .eq("user_id", instance.user_id);
```

**Re-deploy do webhook-inbound** (garante que o event-classifier atualizado seja incluído)

**Verificação adicional**: Adicionar console.log antes e depois da busca de campanhas para debug futuro.

### Resultado Esperado
- Membros que entram no grupo são sincronizados automaticamente na aba Membros
- Leads são capturados corretamente na Lista de Execução 24h com telefone único (LID ou real)
- Realtime já está habilitado nas tabelas — a UI atualizará sozinha assim que os dados chegarem

