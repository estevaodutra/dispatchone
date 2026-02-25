

## Problema identificado

A query do hook `useCallCampaignCounts` busca **todas as linhas individuais** de `call_leads` e `call_logs` e conta no cliente. O Supabase/PostgREST tem um limite padrão de **1000 linhas por query**. 

Confirmação pela rede: a query retorna exatamente 1000 linhas, todas do campaign_id `95c32f25...` (que tem 934 leads no banco). Os leads das outras campanhas (incluindo "TikTok Shop") ficam fora do resultado truncado, resultando em contagem 0.

Dados reais no banco:
- `fe64c750`: 1000 leads
- `95c32f25`: 934 leads  
- `f78dc789`: 180 leads
- `d56a9383`: 38 leads

## Solução

Criar uma **função RPC no banco** que faz `COUNT(*) ... GROUP BY campaign_id`, retornando contagens exatas sem limite de linhas. Atualizar o hook para chamar essas RPCs.

### 1. Migration SQL — criar duas RPCs

```sql
CREATE OR REPLACE FUNCTION get_call_leads_counts(p_campaign_ids uuid[])
RETURNS TABLE(campaign_id uuid, cnt bigint)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT cl.campaign_id, count(*) as cnt
  FROM call_leads cl
  WHERE cl.campaign_id = ANY(p_campaign_ids)
  GROUP BY cl.campaign_id;
$$;

CREATE OR REPLACE FUNCTION get_call_logs_counts(p_campaign_ids uuid[])
RETURNS TABLE(campaign_id uuid, cnt bigint)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT cl.campaign_id, count(*) as cnt
  FROM call_logs cl
  WHERE cl.campaign_id = ANY(p_campaign_ids)
  GROUP BY cl.campaign_id;
$$;
```

### 2. `src/hooks/useCallCampaignCounts.ts` — usar RPCs

Substituir as queries `.from().select().in()` por chamadas `.rpc()`:

```typescript
export function useCallCampaignCounts(campaignIds: string[]) {
  return useQuery({
    queryKey: ["call-campaign-counts", campaignIds],
    queryFn: async () => {
      const counts: Record<string, { leads: number; calls: number }> = {};
      campaignIds.forEach(id => { counts[id] = { leads: 0, calls: 0 }; });
      if (campaignIds.length === 0) return counts;

      const { data: leadCounts } = await (supabase as any)
        .rpc("get_call_leads_counts", { p_campaign_ids: campaignIds });
      (leadCounts || []).forEach((r: any) => {
        if (counts[r.campaign_id]) counts[r.campaign_id].leads = Number(r.cnt);
      });

      const { data: logCounts } = await (supabase as any)
        .rpc("get_call_logs_counts", { p_campaign_ids: campaignIds });
      (logCounts || []).forEach((r: any) => {
        if (counts[r.campaign_id]) counts[r.campaign_id].calls = Number(r.cnt);
      });

      return counts;
    },
    enabled: campaignIds.length > 0,
  });
}
```

| Arquivo | Alteração |
|---------|-----------|
| Migration SQL | Criar RPCs `get_call_leads_counts` e `get_call_logs_counts` |
| `src/hooks/useCallCampaignCounts.ts` | Substituir queries por chamadas RPC |

