import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCallOperators } from "@/hooks/useCallOperators";

export interface QueueExecutionState {
  id: string;
  campaignId: string;
  status: "stopped" | "running" | "paused" | "waiting_operator" | "waiting_cooldown";
  currentPosition: number;
  lastDialAt: string | null;
  sessionStartedAt: string | null;
  callsMade: number;
  callsAnswered: number;
  callsNoAnswer: number;
}

interface DbQueueState {
  id: string;
  campaign_id: string;
  user_id: string;
  status: string | null;
  current_position: number | null;
  last_dial_at: string | null;
  session_started_at: string | null;
  calls_made: number | null;
  calls_answered: number | null;
  calls_no_answer: number | null;
}

const transform = (db: DbQueueState): QueueExecutionState => ({
  id: db.id,
  campaignId: db.campaign_id,
  status: (db.status as QueueExecutionState["status"]) || "stopped",
  currentPosition: db.current_position ?? 0,
  lastDialAt: db.last_dial_at,
  sessionStartedAt: db.session_started_at,
  callsMade: db.calls_made ?? 0,
  callsAnswered: db.calls_answered ?? 0,
  callsNoAnswer: db.calls_no_answer ?? 0,
});

export function useQueueExecution(campaignId: string, enabled = true) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { operators } = useCallOperators();

  const { data: state, isLoading } = useQuery({
    queryKey: ["queue_execution_state", campaignId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("queue_execution_state")
        .select("*")
        .eq("campaign_id", campaignId)
        .maybeSingle();

      if (error) throw error;
      return data ? transform(data as DbQueueState) : null;
    },
    enabled: !!campaignId && enabled,
    refetchInterval: enabled ? 5000 : false,
  });

  const isRunning = state?.status === "running" || state?.status === "waiting_operator" || state?.status === "waiting_cooldown";

  const availableOperators = operators.filter(o => o.status === "available");
  const onCallOperators = operators.filter(o => o.status === "on_call");
  const cooldownOperators = operators.filter(o => o.status === "cooldown");

  const startMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { error } = await (supabase as any)
        .from("queue_execution_state")
        .upsert({
          campaign_id: campaignId,
          user_id: user.id,
          status: "running",
          session_started_at: new Date().toISOString(),
          calls_made: 0,
          calls_answered: 0,
          calls_no_answer: 0,
          current_position: 0,
          current_operator_index: 0,
        }, { onConflict: "campaign_id" });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue_execution_state", campaignId] });
      toast({ title: "Fila iniciada", description: "A execução em fila foi iniciada." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: async () => {
      if (!state) return;
      const { error } = await (supabase as any)
        .from("queue_execution_state")
        .update({ status: "paused" })
        .eq("campaign_id", campaignId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue_execution_state", campaignId] });
      toast({ title: "Fila pausada", description: "A execução foi pausada." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: async () => {
      if (!state) return;
      const { error } = await (supabase as any)
        .from("queue_execution_state")
        .update({ status: "running" })
        .eq("campaign_id", campaignId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue_execution_state", campaignId] });
      toast({ title: "Fila retomada", description: "A execução foi retomada." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const stopMutation = useMutation({
    mutationFn: async () => {
      if (!state) return;
      const { error } = await (supabase as any)
        .from("queue_execution_state")
        .update({
          status: "stopped",
          current_position: 0,
        })
        .eq("campaign_id", campaignId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue_execution_state", campaignId] });
      toast({ title: "Fila parada", description: "A execução foi encerrada." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  return {
    state,
    isLoading,
    isRunning,
    availableOperators,
    onCallOperators,
    cooldownOperators,
    startQueue: startMutation.mutateAsync,
    pauseQueue: pauseMutation.mutateAsync,
    resumeQueue: resumeMutation.mutateAsync,
    stopQueue: stopMutation.mutateAsync,
    isStarting: startMutation.isPending,
    isPausing: pauseMutation.isPending,
    isStopping: stopMutation.isPending,
  };
}
