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
  pauseAll: () => Promise<void>;
  resumeAll: () => Promise<void>;
  isPausingAll: boolean;
  isResumingAll: boolean;
}

export function useQueueExecutionSummary(): QueueExecutionSummary {
  const queryClient = useQueryClient();
  const tickInFlightRef = useRef(false);

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

  // Global tick loop for all active campaigns
  const activeIds = states
    .filter((s: QueueExecutionState) => ["running", "waiting_operator", "waiting_cooldown"].includes(s.status))
    .map((s: QueueExecutionState) => s.campaignId);

  const activeIdsRef = useRef<string[]>([]);
  activeIdsRef.current = activeIds;

  // Independent cooldown/healing resolution
  const maintenanceInFlightRef = useRef(false);
  const tickAllRef = useRef<() => Promise<void>>(async () => {});

  const tickAll = useCallback(async () => {
    if (tickInFlightRef.current) {
      console.log("[global-queue-tick] skipped (in-flight)");
      return;
    }
    const ids = activeIdsRef.current;
    if (ids.length === 0) return;

    console.log(`[global-queue-tick] processing ${ids.length} campaigns`);
    tickInFlightRef.current = true;
    try {
      for (const id of ids) {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("tick timeout")), 30000)
        );
        try {
          await Promise.race([
            supabase.functions.invoke(
              `queue-executor?campaign_id=${id}&action=tick`,
              { method: "POST" }
            ),
            timeoutPromise,
          ]);
        } catch (e) {
          console.error(`[global-queue-tick] error for ${id}:`, e);
        }
        if (id !== ids[ids.length - 1]) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
      queryClient.invalidateQueries({ queryKey: ["queue_execution_state_all"] });
      queryClient.invalidateQueries({ queryKey: ["call_operators"] });
    } catch (e) {
      console.error("[global-queue-tick] fatal error:", e);
    } finally {
      tickInFlightRef.current = false;
    }
  }, [queryClient]);

  tickAllRef.current = tickAll;

  const runMaintenance = useCallback(async () => {
    if (maintenanceInFlightRef.current) return;
    maintenanceInFlightRef.current = true;
    try {
      const { data: resolved } = await (supabase as any).rpc('resolve_cooldowns');
      queryClient.invalidateQueries({ queryKey: ["call_operators"] });
      
      if (resolved?.length && activeIdsRef.current.length > 0) {
        console.log(`[maintenance] Resolved ${resolved.length} cooldowns, triggering immediate tick`);
        setTimeout(() => tickAllRef.current(), 500);
      }

      // Check for orphan "ready" call_logs without active queue
      const { data: readyCalls } = await (supabase as any)
        .from("call_logs")
        .select("campaign_id")
        .eq("call_status", "ready");

      if (readyCalls?.length) {
        const orphanCampaignIds = [...new Set(readyCalls.map((c: any) => c.campaign_id).filter(Boolean))] as string[];
        const activeCampaignIds = new Set(activeIdsRef.current);

        for (const cid of orphanCampaignIds) {
          if (activeCampaignIds.has(cid)) continue;

          const { data: existing } = await (supabase as any)
            .from("queue_execution_state")
            .select("id, status")
            .eq("campaign_id", cid)
            .maybeSingle();

          // Respect manual stops/pauses — do NOT reactivate
          if (existing && ["stopped", "paused"].includes(existing.status)) {
            continue;
          }

          // Only act on queues that are already in an active state
          // but weren't picked up by the local cache yet
          if (existing && ["running", "waiting_operator", "waiting_cooldown"].includes(existing.status)) {
            try {
              await supabase.functions.invoke(
                `queue-executor?campaign_id=${cid}&action=tick`,
                { method: "POST" }
              );
              console.log(`[maintenance] orphan-ready tick sent for campaign ${cid}`);
            } catch (e) {
              console.error(`[maintenance] orphan-ready tick error for ${cid}:`, e);
            }
          }
          // If no existing state at all and there are ready calls,
          // do NOT auto-create — user must start the queue manually
        }

        queryClient.invalidateQueries({ queryKey: ["queue_execution_state_all"] });
      }
    } catch (e) {
      console.error("[maintenance] error:", e);
    } finally {
      maintenanceInFlightRef.current = false;
    }
  }, [queryClient]);

  // Maintenance runs always (independent of active campaigns)
  useEffect(() => {
    runMaintenance();
    const interval = setInterval(runMaintenance, 10000);
    return () => clearInterval(interval);
  }, [runMaintenance]);

  // Tick loop only runs when there are active campaigns
  useEffect(() => {
    if (activeIds.length === 0) return;

    // Reset in case previous cycle left it stuck
    tickInFlightRef.current = false;

    tickAll();
    const interval = setInterval(tickAll, 8000);
    return () => {
      clearInterval(interval);
      tickInFlightRef.current = false;
    };
  }, [activeIds.length, tickAll]);

  const pauseAllMutation = useMutation({
    mutationFn: async () => {
      const activeStates = states.filter((s: QueueExecutionState) =>
        ["running", "waiting_operator", "waiting_cooldown"].includes(s.status)
      );
      for (const s of activeStates) {
        await (supabase as any).from("queue_execution_state")
          .update({ status: "paused" })
          .eq("campaign_id", s.campaignId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue_execution_state_all"] });
    },
  });

  const resumeAllMutation = useMutation({
    mutationFn: async () => {
      const pausedStates = states.filter((s: QueueExecutionState) => s.status === "paused");
      for (const s of pausedStates) {
        await (supabase as any).from("queue_execution_state")
          .update({ status: "running" })
          .eq("campaign_id", s.campaignId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue_execution_state_all"] });
    },
  });

  return {
    states,
    summary,
    globalStatus,
    isLoading,
    pauseAll: pauseAllMutation.mutateAsync,
    resumeAll: resumeAllMutation.mutateAsync,
    isPausingAll: pauseAllMutation.isPending,
    isResumingAll: resumeAllMutation.isPending,
  };
}

// Lightweight hook — reads shared cache, no tick/maintenance loops
export function useQueueExecutionData(): QueueExecutionSummary {
  const queryClient = useQueryClient();

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

  const pauseAllMutation = useMutation({
    mutationFn: async () => {
      const activeStates = states.filter((s: QueueExecutionState) =>
        ["running", "waiting_operator", "waiting_cooldown"].includes(s.status)
      );
      for (const s of activeStates) {
        await (supabase as any).from("queue_execution_state")
          .update({ status: "paused" })
          .eq("campaign_id", s.campaignId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue_execution_state_all"] });
    },
  });

  const resumeAllMutation = useMutation({
    mutationFn: async () => {
      const pausedStates = states.filter((s: QueueExecutionState) => s.status === "paused");
      for (const s of pausedStates) {
        await (supabase as any).from("queue_execution_state")
          .update({ status: "running" })
          .eq("campaign_id", s.campaignId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue_execution_state_all"] });
    },
  });

  return {
    states,
    summary,
    globalStatus,
    isLoading,
    pauseAll: pauseAllMutation.mutateAsync,
    resumeAll: resumeAllMutation.mutateAsync,
    isPausingAll: pauseAllMutation.isPending,
    isResumingAll: resumeAllMutation.isPending,
  };
}

export function useQueueExecution(campaignId: string, enabled = true) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { operators } = useCallOperators();
  const tickInFlightRef = useRef(false);

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

  // Tick loop removed — global useQueueExecutionSummary handles all active campaigns

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