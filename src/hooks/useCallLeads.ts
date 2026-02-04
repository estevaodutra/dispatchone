import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type CallLeadStatus = "pending" | "calling" | "in_progress" | "completed" | "no_answer" | "busy" | "failed";

export interface CallLead {
  id: string;
  campaignId: string;
  phone: string;
  name: string | null;
  email: string | null;
  customFields: Record<string, unknown>;
  status: CallLeadStatus;
  attempts: number;
  lastAttemptAt: string | null;
  resultActionId: string | null;
  resultNotes: string | null;
  assignedOperatorId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DbCallLead {
  id: string;
  campaign_id: string;
  user_id: string;
  phone: string;
  name: string | null;
  email: string | null;
  custom_fields: Record<string, unknown> | null;
  status: string | null;
  attempts: number | null;
  last_attempt_at: string | null;
  result_action_id: string | null;
  result_notes: string | null;
  assigned_operator_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

const transformDbToFrontend = (db: DbCallLead): CallLead => ({
  id: db.id,
  campaignId: db.campaign_id,
  phone: db.phone,
  name: db.name,
  email: db.email,
  customFields: db.custom_fields || {},
  status: (db.status as CallLeadStatus) || "pending",
  attempts: db.attempts || 0,
  lastAttemptAt: db.last_attempt_at,
  resultActionId: db.result_action_id,
  resultNotes: db.result_notes,
  assignedOperatorId: db.assigned_operator_id,
  createdAt: db.created_at || new Date().toISOString(),
  updatedAt: db.updated_at || new Date().toISOString(),
});

export interface LeadStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  failed: number;
}

export function useCallLeads(campaignId: string, statusFilter?: CallLeadStatus) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: leads = [], isLoading, refetch } = useQuery({
    queryKey: ["call_leads", campaignId, statusFilter],
    queryFn: async () => {
      let query = (supabase as any)
        .from("call_leads")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });

      if (statusFilter) {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data as DbCallLead[]).map(transformDbToFrontend);
    },
    enabled: !!campaignId,
  });

  const { data: stats } = useQuery({
    queryKey: ["call_leads_stats", campaignId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("call_leads")
        .select("status")
        .eq("campaign_id", campaignId);

      if (error) throw error;

      const statusList = data as Array<{ status: string | null }>;
      const result: LeadStats = {
        total: statusList.length,
        pending: statusList.filter((l) => l.status === "pending").length,
        inProgress: statusList.filter((l) => ["calling", "in_progress"].includes(l.status || "")).length,
        completed: statusList.filter((l) => l.status === "completed").length,
        failed: statusList.filter((l) => ["no_answer", "busy", "failed"].includes(l.status || "")).length,
      };

      return result;
    },
    enabled: !!campaignId,
  });

  const addLeadMutation = useMutation({
    mutationFn: async (lead: {
      phone: string;
      name?: string;
      email?: string;
      customFields?: Record<string, unknown>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await (supabase as any)
        .from("call_leads")
        .insert({
          campaign_id: campaignId,
          user_id: user.id,
          phone: lead.phone,
          name: lead.name || null,
          email: lead.email || null,
          custom_fields: lead.customFields || {},
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return transformDbToFrontend(data as DbCallLead);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call_leads", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["call_leads_stats", campaignId] });
      toast({ title: "Lead adicionado", description: "Lead adicionado com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const addLeadsBatchMutation = useMutation({
    mutationFn: async (leadsData: Array<{
      phone: string;
      name?: string;
      email?: string;
      customFields?: Record<string, unknown>;
    }>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const inserts = leadsData.map((lead) => ({
        campaign_id: campaignId,
        user_id: user.id,
        phone: lead.phone,
        name: lead.name || null,
        email: lead.email || null,
        custom_fields: lead.customFields || {},
        status: "pending",
      }));

      const { data, error } = await (supabase as any)
        .from("call_leads")
        .insert(inserts)
        .select();

      if (error) throw error;
      return (data as DbCallLead[]).map(transformDbToFrontend);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["call_leads", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["call_leads_stats", campaignId] });
      toast({ title: "Leads importados", description: `${data.length} leads importados com sucesso.` });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, updates }: {
      id: string;
      updates: Partial<{
        phone: string;
        name: string;
        email: string;
        customFields: Record<string, unknown>;
        status: CallLeadStatus;
        attempts: number;
        resultActionId: string;
        resultNotes: string;
        assignedOperatorId: string;
      }>;
    }) => {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.email !== undefined) dbUpdates.email = updates.email;
      if (updates.customFields !== undefined) dbUpdates.custom_fields = updates.customFields;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.attempts !== undefined) dbUpdates.attempts = updates.attempts;
      if (updates.resultActionId !== undefined) dbUpdates.result_action_id = updates.resultActionId;
      if (updates.resultNotes !== undefined) dbUpdates.result_notes = updates.resultNotes;
      if (updates.assignedOperatorId !== undefined) dbUpdates.assigned_operator_id = updates.assignedOperatorId;

      const { error } = await (supabase as any)
        .from("call_leads")
        .update(dbUpdates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call_leads", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["call_leads_stats", campaignId] });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const completeCallMutation = useMutation({
    mutationFn: async ({ leadId, actionId, notes }: {
      leadId: string;
      actionId?: string;
      notes?: string;
    }) => {
      const { error } = await (supabase as any)
        .from("call_leads")
        .update({
          status: "completed",
          result_action_id: actionId || null,
          result_notes: notes || null,
          last_attempt_at: new Date().toISOString(),
        })
        .eq("id", leadId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call_leads", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["call_leads_stats", campaignId] });
      toast({ title: "Ligação concluída", description: "Resultado registrado com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const completeLeadMutation = useMutation({
    mutationFn: async ({
      leadId,
      actionId,
      notes,
      durationSeconds,
      scriptPath,
    }: {
      leadId: string;
      actionId?: string;
      notes?: string;
      durationSeconds?: number;
      scriptPath?: string[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Update lead status
      const { error: updateError } = await (supabase as any)
        .from("call_leads")
        .update({
          status: "completed",
          result_action_id: actionId || null,
          result_notes: notes || null,
          last_attempt_at: new Date().toISOString(),
        })
        .eq("id", leadId);

      if (updateError) throw updateError;

      // Create call log
      const { error: logError } = await (supabase as any)
        .from("call_logs")
        .insert({
          campaign_id: campaignId,
          lead_id: leadId,
          user_id: user.id,
          action_id: actionId || null,
          notes: notes || null,
          duration_seconds: durationSeconds || 0,
          script_path: scriptPath || [],
          started_at: new Date(Date.now() - (durationSeconds || 0) * 1000).toISOString(),
          ended_at: new Date().toISOString(),
        });

      if (logError) throw logError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call_leads", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["call_leads_stats", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["call_logs", campaignId] });
      toast({ title: "Ligação concluída", description: "Resultado registrado com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const deleteLeadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("call_leads")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call_leads", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["call_leads_stats", campaignId] });
      toast({ title: "Removido", description: "Lead removido com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  return {
    leads,
    stats: stats || { total: 0, pending: 0, inProgress: 0, completed: 0, failed: 0 },
    isLoading,
    refetch,
    addLead: addLeadMutation.mutateAsync,
    addLeadsBatch: addLeadsBatchMutation.mutateAsync,
    updateLead: updateLeadMutation.mutateAsync,
    completeCall: completeCallMutation.mutateAsync,
    completeLead: completeLeadMutation.mutateAsync,
    deleteLead: deleteLeadMutation.mutateAsync,
    isAdding: addLeadMutation.isPending,
  };
}
