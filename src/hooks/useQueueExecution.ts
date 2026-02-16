import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useCallback } from "react";
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

export interface QueueExecutionSummary {
  states: QueueExecutionState[];
  summary: {
    running: number;
    paused: number;
    stopped: number;
    waiting_operator: number;
    waiting_cooldown: number;
  };
  globalStatus: "running" | "paused" | "stopped" | "mixed";
  isLoading: boolean;
}

export function useQueueExecutionSummary(): QueueExecutionSummary {
  const { data: states = [], isLoading } = useQuery({
    queryKey: ["queue_execution_state_all"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("queue_execution_state")
        .select("*");

      if (error) throw error;
      return (data || []).map((d: DbQueueState) => transform(d));
    },
    refetchInterval: 5000,
  });

  const summary = {
    running: states.filter((s: QueueExecutionState) => s.status === "running").length,
    paused: states.filter((s: QueueExecutionState) => s.status === "paused").length,
    stopped: states.filter((s: QueueExecutionState) => s.status === "stopped").length,
    waiting_operator: states.filter((s: QueueExecutionState) => s.status === "waiting_operator").length,
    waiting_cooldown: states.filter((s: QueueExecutionState) => s.status === "waiting_cooldown").length,
  };

  const activeCount = summary.running + summary.waiting_operator + summary.waiting_cooldown;
  const globalStatus: QueueExecutionSummary["globalStatus"] =
    activeCount > 0 && summary.paused > 0 ? "mixed"
    : activeCount > 0 ? "running"
    : summary.paused > 0 ? "paused"
    : "stopped";

  return { states, summary, globalStatus, isLoading };
}

export function useQueueExecution(campaignId: string, enabled = true, intervalSeconds = 30) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { operators } = useCallOperators();
  const tickInFlightRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const tick = useCallback(async () => {
    if (tickInFlightRef.current || !campaignId) return;
    tickInFlightRef.current = true;
    try {
      await supabase.functions.invoke(
        `queue-executor?campaign_id=${campaignId}&action=tick`,
        { method: "POST" }
      );
      queryClient.invalidateQueries({ queryKey: ["queue_execution_state", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["call_operators"] });
    } catch (e) {
      console.error("[queue-tick] error:", e);
    } finally {
      tickInFlightRef.current = false;
    }
  }, [campaignId, queryClient]);

  // Auto-tick loop while queue is active
  useEffect(() => {
    if (!isRunning || !campaignId) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Immediate first tick
    tick();

    const ms = Math.max(intervalSeconds, 10) * 1000;
    intervalRef.current = setInterval(tick, ms);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, campaignId, intervalSeconds, tick]);

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
      // Trigger immediate tick after state updates
      setTimeout(() => tick(), 500);
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
      setTimeout(() => tick(), 500);
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