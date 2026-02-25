import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCallCampaignCounts(campaignIds: string[]) {
  return useQuery({
    queryKey: ["call-campaign-counts", campaignIds],
    queryFn: async () => {
      const counts: Record<string, { leads: number; calls: number }> = {};
      campaignIds.forEach(id => { counts[id] = { leads: 0, calls: 0 }; });

      if (campaignIds.length === 0) return counts;

      const { data: leadRows } = await (supabase as any)
        .from("call_leads")
        .select("campaign_id")
        .in("campaign_id", campaignIds);

      (leadRows || []).forEach((r: any) => {
        if (counts[r.campaign_id]) counts[r.campaign_id].leads++;
      });

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
