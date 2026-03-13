import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useCallActions } from "@/hooks/useCallActions";
import { InlineScriptRunner } from "@/components/call-campaigns/operator/InlineScriptRunner";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Calendar, Phone, PhoneMissed, ChevronDown, Clock, Copy, Check, History, ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { addHours, format, setHours, setMinutes, addDays } from "date-fns";
import { InlineReschedule } from "./InlineReschedule";

interface CallDialogData {
  callId: string;
  campaignId: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  campaignName: string;
  duration: number;
  notes: string;
  attemptNumber: number;
  maxAttempts: number;
  isPriority: boolean;
  callStatus?: string;
  externalCallId?: string | null;
}

interface CallActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callId: string;
  campaignId: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  campaignName: string;
  duration: number;
  initialObservations?: string;
  attemptNumber: number;
  maxAttempts: number;
  isPriority: boolean;
  callStatus?: string;
  externalCallId?: string | null;
  operatorId?: string;
  depth?: number; // kept for backwards compat but unused
}

interface CallLogEntry {
  id: string;
  call_status: string | null;
  attempt_number: number | null;
  duration_seconds: number | null;
  started_at: string | null;
  ended_at: string | null;
  notes: string | null;
  created_at: string | null;
  operator_name?: string;
}

const formatDuration = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
};

export function CallActionDialog({
  open, onOpenChange, callId, campaignId, leadId,
  leadName, leadPhone, campaignName, duration,
  initialObservations, attemptNumber, maxAttempts, isPriority,
  callStatus, externalCallId, operatorId,
}: CallActionDialogProps) {
  // --- Navigation state ---
  const initialData: CallDialogData = {
    callId, campaignId, leadId, leadName, leadPhone, campaignName,
    duration, notes: initialObservations || "", attemptNumber, maxAttempts,
    isPriority, callStatus, externalCallId,
  };

  const [currentData, setCurrentData] = useState<CallDialogData>(initialData);
  const [forwardStack, setForwardStack] = useState<CallDialogData[]>([]);
  const [loadingPrevious, setLoadingPrevious] = useState(false);

  // Keep currentData in sync with props when dialog reopens
  useEffect(() => {
    if (open) {
      setCurrentData({
        callId, campaignId, leadId, leadName, leadPhone, campaignName,
        duration, notes: initialObservations || "", attemptNumber, maxAttempts,
        isPriority, callStatus, externalCallId,
      });
      setForwardStack([]);
    }
  }, [open, callId]);

  // --- Per-view state ---
  const { actions, isLoading: actionsLoading } = useCallActions(currentData.campaignId);
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(currentData.leadName);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [notes, setNotes] = useState(currentData.notes);
  const [customMessage, setCustomMessage] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [history, setHistory] = useState<CallLogEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Reset per-view state when currentData changes
  useEffect(() => {
    setSelectedActionId(null);
    setNotes(currentData.notes);
    setCustomMessage("");
    setEditName(currentData.leadName);
    setIsEditingName(false);
    setScheduledDate("");
    setScheduledTime("");
    setCopied(false);
  }, [currentData.callId]);

  const selectedAction = actions.find(a => a.id === selectedActionId);
  const isScheduleType = selectedAction?.actionType === "none" &&
    selectedAction?.name?.toLowerCase().includes("agend");

  const fallbackActions = [
    { id: "__success", name: "Sucesso", color: "#10b981", icon: "✅", actionType: "none" as const },
    { id: "__failure", name: "Sem Sucesso", color: "#ef4444", icon: "❌", actionType: "none" as const },
  ];
  const displayActions = actions.length > 0 ? actions : fallbackActions;

  const copyExternalId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const setScheduleShortcut = (date: Date) => {
    setScheduledDate(format(date, "yyyy-MM-dd"));
    setScheduledTime(format(date, "HH:mm"));
  };

  // --- Navigation handlers ---
  const handleGoBack = async () => {
    if (!operatorId) return;
    setLoadingPrevious(true);
    try {
      // Collect all call IDs already in the forwardStack + current to exclude
      const excludeIds = [currentData.callId, ...forwardStack.map(d => d.callId)];

      const { data } = await (supabase as any)
        .from("call_logs")
        .select("id, campaign_id, lead_id, attempt_number, duration_seconds, notes, call_status, external_call_id, operator_id, call_leads(name, phone), call_campaigns!call_logs_campaign_id_fkey(name, retry_count, is_priority)")
        .eq("operator_id", operatorId)
        .not("id", "in", `(${excludeIds.join(",")})`)
        .in("call_status", ["completed", "no_answer", "failed", "cancelled", "scheduled", "busy", "voicemail", "timeout"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        // Push current to forward stack
        setForwardStack(prev => [...prev, currentData]);
        setCurrentData({
          callId: data.id,
          campaignId: data.campaign_id,
          leadId: data.lead_id,
          leadName: data.call_leads?.name || "—",
          leadPhone: data.call_leads?.phone || "—",
          campaignName: data.call_campaigns?.name || "—",
          duration: data.duration_seconds || 0,
          notes: data.notes || "",
          attemptNumber: data.attempt_number || 1,
          maxAttempts: data.call_campaigns?.retry_count || 3,
          isPriority: data.call_campaigns?.is_priority || false,
          callStatus: data.call_status || undefined,
          externalCallId: data.external_call_id,
        });
      } else {
        toast({ title: "Nenhuma ligação anterior encontrada" });
      }
    } catch (err: any) {
      toast({ title: "Erro ao buscar anterior", description: err.message, variant: "destructive" });
    } finally {
      setLoadingPrevious(false);
    }
  };

  const handleGoForward = () => {
    if (forwardStack.length === 0) return;
    const next = [...forwardStack];
    const item = next.pop()!;
    setForwardStack(next);
    setCurrentData(item);
  };

  // Fetch history for current lead/campaign
  useEffect(() => {
    if (!open || !currentData.leadId || !currentData.campaignId) return;
    const fetchHistory = async () => {
      setHistoryLoading(true);
      const { data } = await (supabase as any)
        .from("call_logs")
        .select("id, call_status, attempt_number, duration_seconds, started_at, ended_at, notes, created_at, call_operators!call_logs_operator_id_fkey(operator_name)")
        .eq("lead_id", currentData.leadId)
        .eq("campaign_id", currentData.campaignId)
        .order("created_at", { ascending: false });

      if (data) {
        setHistory(data.map((d: any) => ({
          ...d,
          operator_name: d.call_operators?.operator_name || "—",
        })));
      }
      setHistoryLoading(false);
    };
    fetchHistory();
  }, [open, currentData.leadId, currentData.campaignId, currentData.callId]);

  const executeAutomation = async (actionId: string) => {
    if (actionId.startsWith("__")) return;

    try {
      const { data: actionData } = await (supabase as any)
        .from("call_script_actions")
        .select("action_type, action_config")
        .eq("id", actionId)
        .maybeSingle();

      if (!actionData) return;

      if (actionData.action_type === "webhook" && actionData.action_config?.url) {
        const { data: leadData } = await (supabase as any)
          .from("call_leads")
          .select("*")
          .eq("id", currentData.leadId)
          .single();

        const { error: proxyError } = await supabase.functions.invoke("webhook-proxy", {
          body: { url: actionData.action_config.url, payload: { lead: leadData, campaignId: currentData.campaignId, actionType: "webhook" } },
        });

        if (proxyError) {
          toast({ title: "Webhook falhou", description: proxyError.message, variant: "destructive" });
        }
      } else if (actionData.action_type === "start_sequence" && actionData.action_config) {
        const { campaignId: seqCampaignId, campaignType, sequenceId } = actionData.action_config as {
          campaignId?: string; campaignType?: string; sequenceId?: string;
        };

        if (campaignType === "dispatch" && sequenceId && currentData.leadPhone) {
          const { data: result, error: fnError } = await supabase.functions.invoke("execute-dispatch-sequence", {
            body: { campaignId: seqCampaignId, sequenceId, contactPhone: currentData.leadPhone, contactName: currentData.leadName || "" },
          });
          if (fnError || result?.error) {
            toast({ title: "Erro na sequência", description: result?.error || fnError?.message, variant: "destructive" });
          }
        } else if (campaignType === "group" && sequenceId && seqCampaignId) {
          const { error: fnError } = await supabase.functions.invoke("execute-message", {
            body: {
              campaignId: seqCampaignId, sequenceId,
              triggerContext: {
                respondentPhone: currentData.leadPhone || "", respondentName: currentData.leadName || "",
                respondentJid: currentData.leadPhone ? `${currentData.leadPhone}@s.whatsapp.net` : "",
                groupJid: "", sendPrivate: true,
              },
            },
          });
          if (fnError) {
            toast({ title: "Erro na sequência de grupo", description: fnError.message, variant: "destructive" });
          }
        }
      } else if (actionData.action_type === "add_tag" && actionData.action_config?.tag) {
        const tag = actionData.action_config.tag as string;
        const { data: leadData } = await (supabase as any)
          .from("call_leads").select("custom_fields").eq("id", currentData.leadId).single();
        const currentFields = (leadData?.custom_fields as Record<string, unknown>) || {};
        const currentTags = Array.isArray(currentFields.tags) ? currentFields.tags : [];
        if (!currentTags.includes(tag)) {
          await (supabase as any).from("call_leads")
            .update({ custom_fields: { ...currentFields, tags: [...currentTags, tag] } })
            .eq("id", currentData.leadId);
        }
      } else if (actionData.action_type === "update_status" && actionData.action_config?.status) {
        const newStatus = String(actionData.action_config.status);
        await (supabase as any).from("call_leads").update({ status: newStatus }).eq("id", currentData.leadId);
        if (newStatus !== "completed") {
          await (supabase as any).from("call_logs").update({ call_status: newStatus }).eq("id", currentData.callId);
        }
      }
    } catch (err: any) {
      console.error("[CallActionDialog] Automation failed:", err);
      toast({ title: "Erro na automação", description: err.message, variant: "destructive" });
    }
  };

  const handleSave = async () => {
    if (!selectedActionId) {
      toast({ title: "Selecione uma ação", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const updates: Record<string, unknown> = {
        notes: notes || null,
      };

      if (selectedActionId && !selectedActionId.startsWith("__")) {
        updates.action_id = selectedActionId;
      }

      if (isScheduleType && scheduledDate && scheduledTime) {
        updates.scheduled_for = `${scheduledDate}T${scheduledTime}:00`;
      }

      await (supabase as any)
        .from("call_logs")
        .update(updates)
        .eq("id", currentData.callId);

      await executeAutomation(selectedActionId);

      toast({ title: "Ação registrada", description: "Resultado salvo. A ligação será encerrada pelo callback." });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const resetState = () => {
    setSelectedActionId(null);
    setNotes("");
    setScheduledDate("");
    setScheduledTime("");
    setForwardStack([]);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetState(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Lead Header */}
        <div className="bg-gradient-to-b from-primary/10 to-transparent border-b px-6 py-5 space-y-2">
          <div className="flex items-center justify-between">
            {operatorId ? (
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 px-2" onClick={handleGoBack} disabled={loadingPrevious}>
                {loadingPrevious ? <Loader2 className="h-3 w-3 animate-spin" /> : <ChevronLeft className="h-3 w-3" />}
                Anterior
              </Button>
            ) : <div />}
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-lg font-bold text-primary">
              {currentData.leadName.charAt(0).toUpperCase()}
            </div>
            {forwardStack.length > 0 ? (
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 px-2" onClick={handleGoForward}>
                Avançar
                <ChevronRight className="h-3 w-3" />
              </Button>
            ) : (
              <div className="w-[85px]" />
            )}
          </div>
          {isEditingName ? (
            <Input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") { setEditName(currentData.leadName); setIsEditingName(false); }
              }}
              onBlur={async () => {
                const trimmed = editName.trim();
                if (trimmed && trimmed !== currentData.leadName) {
                  await (supabase as any).from("call_leads").update({ name: trimmed }).eq("id", currentData.leadId);
                  setCurrentData(prev => ({ ...prev, leadName: trimmed }));
                  toast({ title: "Nome atualizado" });
                } else {
                  setEditName(currentData.leadName);
                }
                setIsEditingName(false);
              }}
              className="text-center text-2xl font-bold uppercase max-w-[300px] mx-auto"
            />
          ) : (
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-2xl font-bold tracking-wide uppercase text-foreground">
                {currentData.leadName}
              </h2>
              <button onClick={() => { setEditName(currentData.leadName); setIsEditingName(true); }} className="text-muted-foreground hover:text-foreground transition-colors">
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          )}
          <p className="text-lg font-mono text-primary">
            📞 {currentData.leadPhone}
          </p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">📁 {currentData.campaignName}</Badge>
            <Badge variant="outline" className="text-xs">🔄 x{currentData.attemptNumber}/{currentData.maxAttempts}</Badge>
            {currentData.isPriority && <Badge variant="secondary" className="text-xs">⭐ Prioridade</Badge>}
            {currentData.callStatus && <Badge variant="outline" className={cn("text-xs", currentData.callStatus === "queued" && "bg-amber-500/15 text-amber-700 dark:text-amber-400")}>{currentData.callStatus === "queued" ? "📋 Na Fila" : `📡 ${currentData.callStatus}`}</Badge>}
          </div>
          {currentData.externalCallId && (
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-xs text-muted-foreground font-mono truncate max-w-[280px]">
                🆔 {currentData.externalCallId}
              </span>
              <button
                onClick={() => copyExternalId(currentData.externalCallId!)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
          )}
          <p className="text-2xl font-semibold font-mono text-emerald-500">
            ⏱️ {formatDuration(currentData.duration)}
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="call" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-6 mt-3 w-auto self-start">
            <TabsTrigger value="call" className="gap-1.5">
              <Phone className="h-3.5 w-3.5" /> Ligação
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Histórico
            </TabsTrigger>
          </TabsList>

          {/* Call Tab */}
          <TabsContent value="call" className="flex-1 min-h-0 mt-0">
            <ScrollArea className="h-[calc(90vh-320px)] px-6 py-4">
              <div className="space-y-6">
                {/* Script Section */}
                <Collapsible defaultOpen>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
                    <ChevronDown className="h-4 w-4 transition-transform duration-200 data-[state=closed]:-rotate-90" />
                    <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">📋 Roteiro</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3">
                    <div className="rounded-lg border bg-muted/10 p-3">
                      <InlineScriptRunner campaignId={currentData.campaignId} leadId={currentData.leadId} />
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {currentData.callId && (
                  <>
                    <div className="border-t" />
                    <InlineReschedule callId={currentData.callId} />
                    <div className="border-t" />
                  </>
                )}

                {/* Result Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">🎯 Ações</h3>

                  <div className="space-y-2">
                    {actionsLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <>
                        {actions.length === 0 && (
                          <div className="rounded-lg border border-dashed p-3 bg-muted/20 mb-2">
                            <p className="text-xs text-muted-foreground">
                              ⚠️ Nenhuma ação configurada para esta campanha. Usando ações padrão:
                            </p>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          {displayActions.map((action) => (
                            <button
                              key={action.id}
                              onClick={() => setSelectedActionId(action.id)}
                              className={cn(
                                "rounded-lg border p-3 text-left transition-all",
                                selectedActionId === action.id
                                  ? "border-primary bg-primary/5 ring-2 ring-primary"
                                  : "border-border hover:border-primary/50"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-3 w-3 rounded-full shrink-0"
                                  style={{ backgroundColor: action.color }}
                                />
                                <span className="font-medium text-sm">{action.name}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                        {actions.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            ℹ️ Ações carregadas da campanha "{currentData.campaignName}"
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  {/* Schedule fields */}
                  {isScheduleType && selectedActionId && (
                    <div className="space-y-3 rounded-lg border p-3 bg-muted/20">
                      <Label className="text-sm font-medium flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Quando ligar novamente?
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="date"
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                        />
                        <Input
                          type="time"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {[
                          { label: "+1h", date: addHours(new Date(), 1) },
                          { label: "+3h", date: addHours(new Date(), 3) },
                          { label: "Amanhã 9h", date: setMinutes(setHours(addDays(new Date(), 1), 9), 0) },
                          { label: "Amanhã 14h", date: setMinutes(setHours(addDays(new Date(), 1), 14), 0) },
                        ].map(({ label, date }) => (
                          <Button
                            key={label}
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => setScheduleShortcut(date)}
                          >
                            {label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  <div>
                    <Label className="text-sm font-medium">📝 Observações (opcional)</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Anotações sobre a ligação..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-end gap-2 pt-2 pb-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} disabled={!selectedActionId || isSaving}>
                    {isSaving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                    ✅ Salvar e Encerrar
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="flex-1 min-h-0 mt-0">
            <ScrollArea className="h-[calc(90vh-320px)] px-6 py-4">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">📊 Histórico de Contatos</h3>

                {historyLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : history.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhum histórico encontrado.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {history.map((entry, idx) => {
                      const isCurrent = entry.id === currentData.callId;
                      return (
                        <div
                          key={entry.id}
                          className={cn(
                            "rounded-lg border p-3 space-y-1.5",
                            isCurrent && "border-primary bg-primary/5"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">
                              📞 Tentativa {entry.attempt_number || (history.length - idx)}
                              {isCurrent && " (atual)"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {entry.started_at
                                ? new Date(entry.started_at).toLocaleString("pt-BR", {
                                    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
                                  })
                                : "—"}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 text-xs text-muted-foreground">
                            <span>Operador: {entry.operator_name}</span>
                            <span>Duração: {entry.duration_seconds != null ? formatDuration(entry.duration_seconds) : isCurrent ? formatDuration(currentData.duration) + " (em andamento)" : "—"}</span>
                          </div>
                          <div className="text-xs">
                            <span className="text-muted-foreground">Resultado: </span>
                            <Badge variant="outline" className="text-xs">
                              {entry.call_status === "completed" ? "✅ Atendida" :
                               entry.call_status === "no_answer" ? "📵 Não atendeu" :
                               entry.call_status === "failed" ? "⚠️ Falha" :
                               isCurrent ? "🔄 Em andamento" :
                               entry.call_status || "—"}
                            </Badge>
                          </div>
                          {entry.notes && (
                            <p className="text-xs text-muted-foreground">Obs: {entry.notes}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
