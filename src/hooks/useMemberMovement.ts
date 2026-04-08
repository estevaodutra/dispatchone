import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface DailyStat {
  date: string;
  joined: number;
  left: number;
}

export interface MemberMovementStats {
  totalJoined: number;
  totalLeft: number;
  netChange: number;
  dailyStats: DailyStat[];
}

export function useMemberMovement(campaignId: string | null, days: number = 7) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["member_movement", campaignId, days],
    queryFn: async (): Promise<MemberMovementStats> => {
      const { data, error } = await supabase.rpc("get_member_movement_stats", {
        p_campaign_id: campaignId!,
        p_days: days,
      });

      if (error) throw error;

      const row = data?.[0];
      if (!row) {
        return { totalJoined: 0, totalLeft: 0, netChange: 0, dailyStats: [] };
      }

      return {
        totalJoined: Number(row.total_joined) || 0,
        totalLeft: Number(row.total_left) || 0,
        netChange: Number(row.net_change) || 0,
        dailyStats: (row.daily_stats as DailyStat[]) || [],
      };
    },
    enabled: !!user && !!campaignId,
  });
}
