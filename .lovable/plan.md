

## Plano: Exibir contagens reais de leads e ligações nos cards de campanha

### Problema
As contagens de leads e ligações nos cards de campanhas de ligação estão hardcoded como `0` (linhas 233 e 237 de `CallCampaignList.tsx`). Não há nenhuma query buscando esses dados.

### Solução

Criar um hook `useCallCampaignCounts` que busca as contagens de `call_leads` e `call_logs` agrupadas por `campaign_id`, e usar esses dados no componente `CallCampaignList`.

### Alterações

#### 1. Novo hook `src/hooks/useCallCampaignCounts.ts`

```typescript
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCallCampaignCounts(campaignIds: string[]) {
  return useQuery({
    queryKey: ["call-campaign-counts", campaignIds],
    queryFn: async () => {
      const counts: Record<string, { leads: number; calls: number }> = {};
      campaignIds.forEach(id => { counts[id] = { leads: 0, calls: 0 }; });

      if (campaignIds.length === 0) return counts;

      // Fetch lead counts per campaign
      const { data: leadRows } = await (supabase as any)
        .from("call_leads")
        .select("campaign_id")
        .in("campaign_id", campaignIds);

      (leadRows || []).forEach((r: any) => {
        if (counts[r.campaign_id]) counts[r.campaign_id].leads++;
      });

      // Fetch call log counts per campaign
      const { data: logRows } = await (supabase as any)
        .from("call_logs")
        .select("campaign_id")
        .in("campaign_id", campaignIds);

      (logRows || []).forEach((r: any) => {
        if (counts[r.campaign_id]) counts[r.campaign_id].calls++;
      });

      return counts;
    },
    enabled: campaignIds.length > 0,
  });
}
```

> Nota: Se alguma campanha tiver mais de 1000 leads/logs, os counts serão limitados pelo default do Supabase. Para contagens exatas em produção com volumes altos, seria ideal usar uma RPC com `count(*)`. Para o caso atual isso é suficiente.

#### 2. `src/components/call-campaigns/CallCampaignList.tsx`

- Importar e usar `useCallCampaignCounts`
- Passar `campaigns.map(c => c.id)` como parâmetro
- Substituir os `0` hardcoded pelas contagens reais:

```tsx
// No topo do componente:
const { data: counts } = useCallCampaignCounts(campaigns.map(c => c.id));

// Nos cards (linhas 230-238):
<div className="flex items-center gap-1">
  <Users className="h-4 w-4" />
  <span>{counts?.[campaign.id]?.leads ?? 0} leads</span>
</div>
<div className="flex items-center gap-1">
  <PhoneCall className="h-4 w-4" />
  <span>{counts?.[campaign.id]?.calls ?? 0} ligações</span>
</div>
```

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useCallCampaignCounts.ts` | Novo hook para buscar contagens de leads e ligações por campanha |
| `src/components/call-campaigns/CallCampaignList.tsx` | Usar o hook e exibir contagens reais |

