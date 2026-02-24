import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";

export type PopupCallStatus = "idle" | "dialing" | "ringing" | "on_call" | "ended" | "no_answer" | "failed";

export interface OperatorData {
  id: string;
  operatorName: string;
  status: string;
  personalIntervalSeconds: number | null;
  lastCallEndedAt: string | null;
  currentCallId: string | null;
  currentCampaignId: string | null;
}

export interface CallData {
  id: string;
  callStatus: string;
  leadId: string | null;
  leadName: string;
  leadPhone: string;
  leadEmail: string | null;
  leadCustomFields: Record<string, unknown>;
  campaignId: string | null;
  campaignName: string;
  isPriority: boolean;
  retryCount: number;
  attemptNumber: number;
  maxAttempts: number;
  startedAt: string | null;
  notes: string | null;
  actionId: string | null;
  scheduledFor: string | null;
}

const mapDbStatus = (dbStatus: string | null): PopupCallStatus => {
  switch (dbStatus) {
    case "dialing": return "dialing";
    case "ringing": return "ringing";
    case "answered":
    case "in_progress":
    case "on_call": return "on_call";
    case "completed": return "ended";
    case "no_answer": return "no_answer";
    case "failed":
    case "busy":
    case "not_found":
    case "voicemail":
    case "timeout": return "failed";
    case "cancelled": return "ended";
    default: return "idle";
  }
};

export function useOperatorCall() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();

  const [operator, setOperator] = useState<OperatorData | null>(null);
  const [currentCall, setCurrentCall] = useState<CallData | null>(null);
  const [callStatus, setCallStatus] = useState<PopupCallStatus>("idle");
  const [callDuration, setCallDuration] = useState(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const currentCallIdRef = useRef<string | null>(null);
  const callLogChannelRef = useRef<any>(null);

  // Fetch call data by call_log id
  const fetchCallData = useCallback(async (callId: string) => {
    const { data, error } = await (supabase as any)
      .from("call_logs")
      .select("*, call_leads!call_logs_lead_id_fkey(name, phone, email, custom_fields), call_campaigns!call_logs_campaign_id_fkey(name, is_priority, retry_count)")
      .eq("id", callId)
      .maybeSingle();

    if (error || !data) return null;

    const call: CallData = {
      id: data.id,
      callStatus: data.call_status || "dialing",
      leadId: data.lead_id,
      leadName: data.call_leads?.name || "Desconhecido",
      leadPhone: data.call_leads?.phone || "",
      leadEmail: data.call_leads?.email || null,
      leadCustomFields: (data.call_leads?.custom_fields as Record<string, unknown>) || {},
      campaignId: data.campaign_id,
      campaignName: data.call_campaigns?.name || "",
      isPriority: data.call_campaigns?.is_priority || false,
      retryCount: data.call_campaigns?.retry_count || 3,
      attemptNumber: data.attempt_number || 1,
      maxAttempts: data.max_attempts || 3,
      startedAt: data.started_at,
      notes: data.notes,
      actionId: data.action_id,
      scheduledFor: data.scheduled_for,
    };

    return call;
  }, []);

  // Subscribe to call_logs changes for the active call
  const subscribeToCallLog = useCallback((callId: string) => {
    // Cleanup previous subscription
    if (callLogChannelRef.current) {
      supabase.removeChannel(callLogChannelRef.current);
    }

    const channel = supabase
      .channel(`call-log-${callId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "call_logs", filter: `id=eq.${callId}` },
        async (payload: any) => {
          const newStatus = payload.new?.call_status;
          const mapped = mapDbStatus(newStatus);
          setCallStatus(mapped);

          // Update call data
          if (payload.new?.started_at) {
            setCurrentCall(prev => prev ? { ...prev, callStatus: newStatus, startedAt: payload.new.started_at } : prev);
          }
        }
      )
      .subscribe();

    callLogChannelRef.current = channel;
  }, []);

  // Fetch operator on mount
  useEffect(() => {
    if (!user || !activeCompanyId) {
      setOperator(null);
      setIsLoading(false);
      return;
    }

    const fetchOperator = async () => {
      const { data, error } = await (supabase as any)
        .from("call_operators")
        .select("*")
        .eq("user_id", user.id)
        .eq("company_id", activeCompanyId)
        .eq("is_active", true)
        .order("status", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        setOperator(null);
        setIsLoading(false);
        return;
      }

      // Auto-set available if offline and active
      if (data.status === "offline" && data.is_active) {
        await (supabase as any)
          .from("call_operators")
          .update({ status: "available" })
          .eq("id", data.id);
        data.status = "available";
      }

      const op: OperatorData = {
        id: data.id,
        operatorName: data.operator_name,
        status: data.status || "offline",
        personalIntervalSeconds: data.personal_interval_seconds,
        lastCallEndedAt: data.last_call_ended_at,
        currentCallId: data.current_call_id,
        currentCampaignId: data.current_campaign_id,
      };
      setOperator(op);

      // If operator already has an active call, load it
      if (data.current_call_id) {
        currentCallIdRef.current = data.current_call_id;
        const callData = await fetchCallData(data.current_call_id);
        if (callData) {
          setCurrentCall(callData);
          setCallStatus(mapDbStatus(callData.callStatus));
          subscribeToCallLog(data.current_call_id);
        }
      } else if (data.status === "cooldown") {
        setCallStatus("ended");
      }

      setIsLoading(false);
    };

    fetchOperator();
  }, [user, activeCompanyId, fetchCallData, subscribeToCallLog]);

  // Subscribe to operator realtime changes
  useEffect(() => {
    if (!operator) return;

    const channel = supabase
      .channel(`operator-${operator.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "call_operators", filter: `id=eq.${operator.id}` },
        async (payload: any) => {
          const newData = payload.new;
          const newCallId = newData.current_call_id;
          const prevCallId = currentCallIdRef.current;

          // Update operator state
          setOperator(prev => prev ? {
            ...prev,
            status: newData.status || prev.status,
            currentCallId: newCallId,
            currentCampaignId: newData.current_campaign_id,
            lastCallEndedAt: newData.last_call_ended_at,
          } : prev);

          // New call assigned
          if (newCallId && newCallId !== prevCallId) {
            currentCallIdRef.current = newCallId;
            const callData = await fetchCallData(newCallId);
            if (callData) {
              setCurrentCall(callData);
              setCallStatus(mapDbStatus(callData.callStatus));
              subscribeToCallLog(newCallId);
            }
          }

          // Call released (operator went to cooldown or available)
          if (!newCallId && prevCallId) {
            currentCallIdRef.current = null;
            if (callLogChannelRef.current) {
              supabase.removeChannel(callLogChannelRef.current);
              callLogChannelRef.current = null;
            }

            if (newData.status === "cooldown") {
              setCallStatus("ended");
            } else {
              setCurrentCall(null);
              setCallStatus("idle");
              setCallDuration(0);
            }
          }

          // Status changed to available while idle
          if (newData.status === "available" && !newCallId) {
            setCurrentCall(null);
            setCallStatus("idle");
            setCallDuration(0);
            setCooldownRemaining(0);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [operator?.id, fetchCallData, subscribeToCallLog]);

  // Timer for call duration
  useEffect(() => {
    if (callStatus !== "on_call" || !currentCall?.startedAt) {
      return;
    }

    const interval = setInterval(() => {
      const start = new Date(currentCall.startedAt!).getTime();
      setCallDuration(Math.floor((Date.now() - start) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [callStatus, currentCall?.startedAt]);

  // Cooldown timer
  useEffect(() => {
    if (operator?.status !== "cooldown" || !operator.lastCallEndedAt) {
      setCooldownRemaining(0);
      return;
    }

    const intervalSeconds = operator.personalIntervalSeconds ?? 30;

    const interval = setInterval(() => {
      const endedAt = new Date(operator.lastCallEndedAt!).getTime();
      const elapsed = Math.floor((Date.now() - endedAt) / 1000);
      const remaining = Math.max(0, intervalSeconds - elapsed);
      setCooldownRemaining(remaining);

      if (remaining <= 0) {
        setCallStatus("idle");
        setCurrentCall(null);
        setCooldownRemaining(0);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [operator?.status, operator?.lastCallEndedAt, operator?.personalIntervalSeconds]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (callLogChannelRef.current) {
        supabase.removeChannel(callLogChannelRef.current);
      }
    };
  }, []);

  const toggleAvailability = useCallback(async () => {
    if (!operator) return;
    const newStatus = operator.status === "available" ? "offline" : "available";
    await (supabase as any)
      .from("call_operators")
      .update({ status: newStatus })
      .eq("id", operator.id);
    setOperator(prev => prev ? { ...prev, status: newStatus } : prev);
    if (newStatus === "available") {
      setCallStatus("idle");
    }
  }, [operator]);

  return {
    operator,
    currentCall,
    callStatus,
    callDuration,
    cooldownRemaining,
    isCallActive: ["dialing", "ringing", "on_call"].includes(callStatus),
    isLoading,
    cooldownTotal: operator?.personalIntervalSeconds ?? 30,
    toggleAvailability,
  };
}
