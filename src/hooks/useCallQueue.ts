import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/contexts/CompanyContext";

export interface CallQueueEntry {
  id: string;
  campaign_id: string;
  lead_id: string;
  position: number;
  attempts: number;
  last_attempt_at: string | null;
  last_result: string | null;
  status: string;
  lead?: { name: string | null; phone: string; email: string | null };
}

export function useCallQueue(campaignId?: string) {
  const { toast } = useToast();
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

  const queueQuery = useQuery({
    queryKey: ["call-queue", campaignId],
    enabled: !!campaignId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("call_queue")
        .select("*, leads(name, phone, email)")
        .eq("campaign_id", campaignId!)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data || []).map((item: any) => ({
        ...item,
        lead: item.leads,
      })) as CallQueueEntry[];
    },
  });

  const addToQueue = useMutation({
    mutationFn: async ({ campaignId, leadIds, position }: { campaignId: string; leadIds: string[]; position: "end" | "start" }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get current max position
      const { data: existing } = await supabase
        .from("call_queue")
        .select("position")
        .eq("campaign_id", campaignId)
        .order("position", { ascending: false })
        .limit(1);

      let startPos = position === "end" ? ((existing?.[0]?.position || 0) + 1) : 1;

      if (position === "start" && existing && existing.length > 0) {
        // Shift all existing entries
        const { data: allEntries } = await supabase
          .from("call_queue")
          .select("id, position")
          .eq("campaign_id", campaignId)
          .order("position", { ascending: true });

        for (const entry of allEntries || []) {
          await supabase.from("call_queue").update({ position: entry.position + leadIds.length }).eq("id", entry.id);
        }
      }

      let added = 0;
      let skipped = 0;
      for (let i = 0; i < leadIds.length; i++) {
        const { error } = await supabase.from("call_queue").insert({
          user_id: user.id,
          company_id: activeCompanyId || null,
          campaign_id: campaignId,
          lead_id: leadIds[i],
          position: startPos + i,
        });
        if (error) {
          skipped++;
        } else {
          added++;
        }
      }
      return { added, skipped };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["call-queue"] });
      toast({ title: "Leads adicionados à fila", description: `${result.added} adicionados, ${result.skipped} ignorados` });
    },
    onError: () => toast({ title: "Erro ao adicionar à fila", variant: "destructive" }),
  });

  const removeFromQueue = useMutation({
    mutationFn: async ({ campaignId, leadId }: { campaignId: string; leadId: string }) => {
      const { error } = await supabase.from("call_queue").delete().eq("campaign_id", campaignId).eq("lead_id", leadId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call-queue"] });
      toast({ title: "Lead removido da fila" });
    },
  });

  return {
    queue: queueQuery.data || [],
    isLoading: queueQuery.isLoading,
    addToQueue,
    removeFromQueue,
  };
}
