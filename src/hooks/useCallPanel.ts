import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export interface CallPanelEntry {
  id: string;
  campaignId: string | null;
  campaignName: string | null;
  leadId: string | null;
  leadName: string | null;
  leadPhone: string | null;
  operatorId: string | null;
  operatorName: string | null;
  operatorExtension: string | null;
  callStatus: string;
  scheduledFor: string | null;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  notes: string | null;
  actionId: string | null;
  externalCallId: string | null;
  createdAt: string;
  leadAttempts: number;
  audioUrl: string | null;
}

export interface CallPanelStats {
  scheduled: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  failed: number;
}

interface DbCallLogJoined {
  id: string;
  campaign_id: string | null;
  lead_id: string | null;
  operator_id: string | null;
  call_status: string | null;
  scheduled_for: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  notes: string | null;
  action_id: string | null;
  external_call_id: string | null;
  created_at: string | null;
  audio_url: string | null;
  call_leads: {
    name: string | null;
    phone: string;
    attempts: number | null;
  } | null;
  call_campaigns: {
    name: string;
  } | null;
  call_operators: {
    operator_name: string | null;
    extension: string | null;
  } | null;
}

const SCHEDULED_STATUSES = ["scheduled", "ready"];
const IN_PROGRESS_STATUSES = ["dialing", "ringing", "answered", "in_progress"];
const COMPLETED_STATUSES = ["completed"];
const FAILED_STATUSES = ["no_answer", "busy", "failed"];
const CANCELLED_STATUSES = ["cancelled"];

function transformEntry(db: DbCallLogJoined): CallPanelEntry {
  return {
    id: db.id,
    campaignId: db.campaign_id,
    campaignName: db.call_campaigns?.name || null,
    leadId: db.lead_id,
    leadName: db.call_leads?.name || null,
    leadPhone: db.call_leads?.phone || null,
    operatorId: db.operator_id,
    operatorName: db.call_operators?.operator_name || null,
    operatorExtension: db.call_operators?.extension || null,
    callStatus: db.call_status || "scheduled",
    scheduledFor: db.scheduled_for,
    startedAt: db.started_at,
    endedAt: db.ended_at,
    durationSeconds: db.duration_seconds,
    notes: db.notes,
    actionId: db.action_id,
    externalCallId: db.external_call_id,
    createdAt: db.created_at || new Date().toISOString(),
    leadAttempts: db.call_leads?.attempts || 0,
    audioUrl: db.audio_url || null,
  };
}

export function useCallPanel(filters?: {
  status?: string;
  campaignId?: string;
  search?: string;
  date?: string;
}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading, refetch } = useQuery({
    queryKey: ["call_panel", filters],
    queryFn: async () => {
      let query = (supabase as any)
        .from("call_logs")
        .select("*, call_leads(name, phone, attempts), call_campaigns(name), call_operators(operator_name, extension)")
        .order("created_at", { ascending: false })
        .limit(200);

      if (filters?.campaignId) {
        query = query.eq("campaign_id", filters.campaignId);
      }

      if (filters?.status) {
        let statusList: string[] = [];
        switch (filters.status) {
          case "scheduled": statusList = SCHEDULED_STATUSES; break;
          case "in_progress": statusList = IN_PROGRESS_STATUSES; break;
          case "completed": statusList = COMPLETED_STATUSES; break;
          case "cancelled": statusList = CANCELLED_STATUSES; break;
          case "failed": statusList = FAILED_STATUSES; break;
          default: statusList = [filters.status];
        }
        query = query.in("call_status", statusList);
      }

      if (filters?.date) {
        query = query.gte("created_at", `${filters.date}T00:00:00`).lte("created_at", `${filters.date}T23:59:59`);
      }

      const { data, error } = await query;
      if (error) throw error;

      let results = (data as DbCallLogJoined[]).map(transformEntry);

      if (filters?.search) {
        const s = filters.search.toLowerCase();
        results = results.filter(
          (e) =>
            e.leadName?.toLowerCase().includes(s) ||
            e.leadPhone?.includes(s)
        );
      }

      return results;
    },
    enabled: !!user,
    refetchInterval: 5000,
  });

  const stats: CallPanelStats = {
    scheduled: entries.filter((e) => SCHEDULED_STATUSES.includes(e.callStatus)).length,
    inProgress: entries.filter((e) => IN_PROGRESS_STATUSES.includes(e.callStatus)).length,
    completed: entries.filter((e) => COMPLETED_STATUSES.includes(e.callStatus)).length,
    cancelled: entries.filter((e) => CANCELLED_STATUSES.includes(e.callStatus)).length,
    failed: entries.filter((e) => FAILED_STATUSES.includes(e.callStatus)).length,
  };

  const delayCallMutation = useMutation({
    mutationFn: async ({ callId, minutes }: { callId: string; minutes: number }) => {
      const entry = entries.find((e) => e.id === callId);
      if (!entry?.scheduledFor) throw new Error("No scheduled_for");
      const newTime = new Date(new Date(entry.scheduledFor).getTime() + minutes * 60000).toISOString();
      const { error } = await (supabase as any)
        .from("call_logs")
        .update({ scheduled_for: newTime })
        .eq("id", callId);
      if (error) throw error;
      return newTime;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call_panel"] });
      toast({ title: "Reagendado", description: "Horário atualizado." });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const rescheduleCallMutation = useMutation({
    mutationFn: async ({ callId, scheduledFor }: { callId: string; scheduledFor: string }) => {
      const { error } = await (supabase as any)
        .from("call_logs")
        .update({ scheduled_for: scheduledFor, call_status: "scheduled" })
        .eq("id", callId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call_panel"] });
      toast({ title: "Reagendado", description: "Ligação reagendada." });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const cancelCallMutation = useMutation({
    mutationFn: async ({ callId, reason }: { callId: string; reason?: string }) => {
      const { error } = await (supabase as any)
        .from("call_logs")
        .update({ call_status: "cancelled", notes: reason || null })
        .eq("id", callId);
      if (error) throw error;

      const entry = entries.find((e) => e.id === callId);
      if (entry?.leadId) {
        await (supabase as any)
          .from("call_leads")
          .update({ status: "pending" })
          .eq("id", entry.leadId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call_panel"] });
      toast({ title: "Cancelada", description: "Ligação cancelada." });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const updateOperatorMutation = useMutation({
    mutationFn: async ({ callId, operatorId }: { callId: string; operatorId: string }) => {
      const { error } = await (supabase as any)
        .from("call_logs")
        .update({ operator_id: operatorId })
        .eq("id", callId);
      if (error) throw error;

      const entry = entries.find((e) => e.id === callId);
      if (entry?.leadId) {
        await (supabase as any)
          .from("call_leads")
          .update({ assigned_operator_id: operatorId })
          .eq("id", entry.leadId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call_panel"] });
      toast({ title: "Operador atualizado", description: "Operador da ligação alterado." });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const dialNowMutation = useMutation({
    mutationFn: async (callId: string) => {
      const entry = entries.find((e) => e.id === callId);
      if (!entry) throw new Error("Ligação não encontrada");

      // --- Verificação de operador ativo ---
      let effectiveOperator = {
        id: entry.operatorId,
        name: entry.operatorName,
        extension: entry.operatorExtension,
      };
      let wasRedirected = false;

      if (entry.operatorId) {
        const { data: currentOp } = await (supabase as any)
          .from("call_operators")
          .select("id, operator_name, extension, is_active, status")
          .eq("id", entry.operatorId)
          .maybeSingle();

        const isInactive = !currentOp || currentOp.is_active === false || currentOp.status !== 'available';

        if (isInactive) {
          // Fetch all active operators for the user (global)
          const { data: activeOps } = await (supabase as any)
            .from("call_operators")
            .select("id, operator_name, extension")
            .eq("is_active", true)
            .eq("status", "available")
            .order("created_at", { ascending: true });

          if (!activeOps || activeOps.length === 0) {
            throw new Error("Nenhum operador ativo disponível nesta campanha");
          }

          // Round-robin: use current_operator_index from queue state
          const { data: queueState } = await (supabase as any)
            .from("queue_execution_state")
            .select("current_operator_index")
            .eq("campaign_id", entry.campaignId)
            .maybeSingle();

          const currentIdx = queueState?.current_operator_index || 0;
          const totalOps = activeOps.length;
          let newOp = activeOps[currentIdx % totalOps];
          const nextIdx = (currentIdx + 1) % totalOps;

          // Update the round-robin index
          if (queueState) {
            await (supabase as any)
              .from("queue_execution_state")
              .update({ current_operator_index: nextIdx })
              .eq("campaign_id", entry.campaignId);
          }
          effectiveOperator = { id: newOp.id, name: newOp.operator_name, extension: newOp.extension };
          wasRedirected = true;

          await (supabase as any).from("call_logs").update({ operator_id: newOp.id }).eq("id", callId);
          if (entry.leadId) {
            await (supabase as any).from("call_leads").update({ assigned_operator_id: newOp.id }).eq("id", entry.leadId);
          }
        }
      }

      // Fetch webhook config for "calls" category
      const { data: webhookConfigs } = await (supabase as any)
        .from("webhook_configs")
        .select("*")
        .eq("category", "calls")
        .eq("is_active", true)
        .limit(1);

      const webhookUrl = webhookConfigs?.[0]?.url;

      if (!webhookUrl) {
        const { error } = await (supabase as any)
          .from("call_logs")
          .update({ scheduled_for: new Date().toISOString(), call_status: "ready" })
          .eq("id", callId);
        if (error) throw error;
        return { wasRedirected, operatorName: effectiveOperator.name };
      }

      // Update status to "dialing"
      const { error: updateErr } = await (supabase as any)
        .from("call_logs")
        .update({ call_status: "dialing", started_at: new Date().toISOString() })
        .eq("id", callId);
      if (updateErr) throw updateErr;

      // Build payload
      const payload = {
        action: "call.dial",
        call: {
          id: entry.id,
          status: "dialing",
          scheduled_for: entry.scheduledFor,
        },
        campaign: {
          id: entry.campaignId,
          name: entry.campaignName,
        },
        lead: {
          id: entry.leadId,
          phone: entry.leadPhone,
          name: entry.leadName,
        },
        operator: {
          id: effectiveOperator.id,
          name: effectiveOperator.name,
          extension: effectiveOperator.extension,
        },
      };

      try {
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`Webhook respondeu com status ${response.status}`);
        }

        // Try to extract external_call_id from response
        try {
          const result = await response.json();
          const externalId = Array.isArray(result) ? result[0]?.id : result?.id;
          if (externalId) {
            await (supabase as any)
              .from("call_logs")
              .update({ external_call_id: externalId })
              .eq("id", callId);
          }
        } catch {
          // Response may not be JSON, that's fine
        }
      } catch (webhookError: any) {
        // Revert status to "ready" on webhook failure
        await (supabase as any)
          .from("call_logs")
          .update({ call_status: "ready", started_at: null })
          .eq("id", callId);
        throw new Error(`Falha ao acionar webhook: ${webhookError.message}`);
      }

      return { wasRedirected, operatorName: effectiveOperator.name };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["call_panel"] });
      const desc = result?.wasRedirected
        ? `Operador redirecionado para ${result.operatorName}`
        : "Webhook acionado com sucesso.";
      toast({ title: "Ligação iniciada", description: desc });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const registerActionMutation = useMutation({
    mutationFn: async ({ callId, actionId, notes }: { callId: string; actionId: string; notes?: string }) => {
      // Check fresh state to prevent duplicate updates
      const { data: freshLog } = await (supabase as any)
        .from("call_logs")
        .select("call_status")
        .eq("id", callId)
        .maybeSingle();

      if (freshLog?.call_status === "completed") {
        return; // Already completed, skip
      }

      const { error } = await (supabase as any)
        .from("call_logs")
        .update({ action_id: actionId, notes: notes || null, call_status: "completed", ended_at: new Date().toISOString() })
        .eq("id", callId);
      if (error) throw error;

      const entry = entries.find((e) => e.id === callId);
      if (entry?.leadId) {
        // Only update lead if not already completed
        const { data: freshLead } = await (supabase as any)
          .from("call_leads")
          .select("status")
          .eq("id", entry.leadId)
          .maybeSingle();

        if (freshLead && freshLead.status !== "completed") {
          await (supabase as any)
            .from("call_leads")
            .update({ status: "completed", result_action_id: actionId, result_notes: notes || null })
            .eq("id", entry.leadId);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call_panel"] });
      queryClient.invalidateQueries({ queryKey: ["call_leads"] });
      toast({ title: "Ação registrada", description: "Resultado da ligação registrado." });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return {
    entries,
    stats,
    isLoading,
    refetch,
    delayCall: delayCallMutation.mutateAsync,
    rescheduleCall: rescheduleCallMutation.mutateAsync,
    cancelCall: cancelCallMutation.mutateAsync,
    updateOperator: updateOperatorMutation.mutateAsync,
    dialNow: dialNowMutation.mutateAsync,
    registerAction: registerActionMutation.mutateAsync,
  };
}
