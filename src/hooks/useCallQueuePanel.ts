import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";

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

export function useCallQueuePanel(campaignFilter?: string, searchQuery?: string) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["call-queue-panel", campaignFilter, activeCompanyId],
    queryFn: async () => {
      // 1. Regular call_queue entries
      let query = (supabase as any)
        .from("call_queue")
        .select("*, leads(name, phone, email), call_campaigns(name)")
        .eq("status", "waiting")
        .order("position", { ascending: true });

      if (activeCompanyId) {
        query = query.eq("company_id", activeCompanyId);
      }

      if (campaignFilter && campaignFilter !== "all") {
        query = query.eq("campaign_id", campaignFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      const regularEntries = (data || []).map((item: any) => ({
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

      // 2. Ready call_logs from bulk enqueue
      let readyQuery = (supabase as any)
        .from("call_logs")
        .select("id, campaign_id, lead_id, created_at, scheduled_for, call_campaigns:campaign_id(name), call_leads:lead_id(name, phone)")
        .eq("call_status", "ready")
        .order("scheduled_for", { ascending: true });

      if (campaignFilter && campaignFilter !== "all") {
        readyQuery = readyQuery.eq("campaign_id", campaignFilter);
      }

      const { data: readyLogs } = await readyQuery;

      const readyEntries = (readyLogs || []).map((log: any, idx: number) => ({
        id: log.id,
        campaignId: log.campaign_id,
        campaignName: log.call_campaigns?.name || null,
        leadId: log.lead_id,
        leadName: log.call_leads?.name || null,
        leadPhone: log.call_leads?.phone || null,
        leadEmail: null,
        position: 9000 + idx,
        attempts: 0,
        lastAttemptAt: null,
        lastResult: null,
        status: "ready",
        createdAt: log.created_at,
      })) as QueuePanelEntry[];

      let combined = [...regularEntries, ...readyEntries];

      if (searchQuery) {
        const s = searchQuery.toLowerCase();
        const sDigits = s.replace(/\D/g, "");
        combined = combined.filter(e => {
          const nameMatch = e.leadName?.toLowerCase().includes(s);
          const phoneDigits = (e.leadPhone || "").replace(/\D/g, "");
          const phoneMatch = sDigits ? phoneDigits.includes(sDigits) : false;
          return nameMatch || phoneMatch;
        });
      }

      return combined;
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

  const clearQueue = useMutation({
    mutationFn: async (filter?: string) => {
      // 1. Delete all waiting entries from call_queue
      let deleteQuery = (supabase as any)
        .from("call_queue")
        .delete()
        .eq("status", "waiting");
      if (filter && filter !== "all") {
        deleteQuery = deleteQuery.eq("campaign_id", filter);
      }
      const { error: deleteError } = await deleteQuery;
      if (deleteError) throw deleteError;

      // 2. Cancel all ready call_logs (preserve history)
      let updateQuery = (supabase as any)
        .from("call_logs")
        .update({ call_status: "cancelled" })
        .eq("call_status", "ready");
      if (filter && filter !== "all") {
        updateQuery = updateQuery.eq("campaign_id", filter);
      }
      const { error: updateError } = await updateQuery;
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call-queue-panel"] });
      queryClient.invalidateQueries({ queryKey: ["call-queue"] });
      queryClient.invalidateQueries({ queryKey: ["call-panel"] });
      toast({ title: "Fila esvaziada com sucesso" });
    },
    onError: () => toast({ title: "Erro ao esvaziar fila", variant: "destructive" }),
  });

  const sendToEndOfQueue = useMutation({
    mutationFn: async ({ entryId, currentAttempts, status }: { entryId: string; currentAttempts: number; status: string }) => {
      if (status === "ready") {
        // Entry comes from call_logs – push scheduled_for far into the future
        const farFuture = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        const { error } = await (supabase as any)
          .from("call_logs")
          .update({ scheduled_for: farFuture })
          .eq("id", entryId);
        if (error) throw error;
      } else {
        // Entry comes from call_queue
        const { data: maxPosData } = await (supabase as any)
          .from("call_queue")
          .select("position")
          .order("position", { ascending: false })
          .limit(1)
          .maybeSingle();

        const nextPosition = (maxPosData?.position || 0) + 1;

        const { error } = await supabase
          .from("call_queue")
          .update({ position: nextPosition, attempts: currentAttempts + 1 } as any)
          .eq("id", entryId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call-queue-panel"] });
      queryClient.invalidateQueries({ queryKey: ["call-queue"] });
      toast({ title: "Lead movido para o final da fila" });
    },
    onError: () => toast({ title: "Erro ao mover lead", variant: "destructive" }),
  });

  const sendToStartOfQueue = useMutation({
    mutationFn: async ({ entryId, status }: { entryId: string; status: string }) => {
      if (status === "ready") {
        const farPast = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { error } = await (supabase as any)
          .from("call_logs")
          .update({ scheduled_for: farPast })
          .eq("id", entryId);
        if (error) throw error;
      } else {
        const { data: minPosData } = await (supabase as any)
          .from("call_queue")
          .select("position")
          .order("position", { ascending: true })
          .limit(1)
          .maybeSingle();

        const prevPosition = (minPosData?.position ?? 1) - 1;

        const { error } = await supabase
          .from("call_queue")
          .update({ position: prevPosition } as any)
          .eq("id", entryId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call-queue-panel"] });
      queryClient.invalidateQueries({ queryKey: ["call-queue"] });
      toast({ title: "Lead movido para o início da fila" });
    },
    onError: () => toast({ title: "Erro ao mover lead", variant: "destructive" }),
  });

  return {
    entries,
    isLoading,
    totalWaiting: entries.length,
    removeFromQueue: removeFromQueue.mutateAsync,
    clearQueue: clearQueue.mutateAsync,
    isClearingQueue: clearQueue.isPending,
    sendToEndOfQueue: sendToEndOfQueue.mutateAsync,
    sendToStartOfQueue: sendToStartOfQueue.mutateAsync,
  };
}
