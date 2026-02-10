import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export interface QueuePanelEntry {
  id: string;
  campaignId: string;
  campaignName: string | null;
  leadId: string;
  leadName: string | null;
  leadPhone: string | null;
  leadEmail: string | null;
  position: number;
  attempts: number;
  lastAttemptAt: string | null;
  lastResult: string | null;
  status: string;
  createdAt: string | null;
}

export function useCallQueuePanel(campaignFilter?: string) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["call-queue-panel", campaignFilter],
    queryFn: async () => {
      let query = (supabase as any)
        .from("call_queue")
        .select("*, leads(name, phone, email), call_campaigns(name)")
        .eq("status", "waiting")
        .order("position", { ascending: true });

      if (campaignFilter && campaignFilter !== "all") {
        query = query.eq("campaign_id", campaignFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((item: any) => ({
        id: item.id,
        campaignId: item.campaign_id,
        campaignName: item.call_campaigns?.name || null,
        leadId: item.lead_id,
        leadName: item.leads?.name || null,
        leadPhone: item.leads?.phone || null,
        leadEmail: item.leads?.email || null,
        position: item.position,
        attempts: item.attempts || 0,
        lastAttemptAt: item.last_attempt_at,
        lastResult: item.last_result,
        status: item.status,
        createdAt: item.created_at,
      })) as QueuePanelEntry[];
    },
    enabled: !!user,
    refetchInterval: 10000,
  });

  const removeFromQueue = useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase.from("call_queue").delete().eq("id", entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call-queue-panel"] });
      queryClient.invalidateQueries({ queryKey: ["call-queue"] });
      toast({ title: "Lead removido da fila" });
    },
    onError: () => toast({ title: "Erro ao remover da fila", variant: "destructive" }),
  });

  return {
    entries,
    isLoading,
    totalWaiting: entries.length,
    removeFromQueue: removeFromQueue.mutateAsync,
  };
}
