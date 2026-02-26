import { useState, useEffect } from "react";
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
import { Loader2, Calendar, Phone, PhoneMissed, ChevronDown, Clock, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { addHours, format, setHours, setMinutes, addDays } from "date-fns";

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
  callStatus, externalCallId,
}: CallActionDialogProps) {
  const { actions, isLoading: actionsLoading } = useCallActions(campaignId);
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copyExternalId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [notes, setNotes] = useState(initialObservations || "");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [history, setHistory] = useState<CallLogEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const selectedAction = actions.find(a => a.id === selectedActionId);
  const isScheduleType = selectedAction?.actionType === "none" &&
    selectedAction?.name?.toLowerCase().includes("agend");

  // Default fallback actions when campaign has none
  const fallbackActions = [
    { id: "__success", name: "Sucesso", color: "#10b981", icon: "✅", actionType: "none" as const },
    { id: "__failure", name: "Sem Sucesso", color: "#ef4444", icon: "❌", actionType: "none" as const },
  ];

  const displayActions = actions.length > 0 ? actions : fallbackActions;

  const setScheduleShortcut = (date: Date) => {
    setScheduledDate(format(date, "yyyy-MM-dd"));
    setScheduledTime(format(date, "HH:mm"));
  };

  // Fetch history
  useEffect(() => {
    if (!open || !leadId || !campaignId) return;
    const fetchHistory = async () => {
      setHistoryLoading(true);
      const { data } = await (supabase as any)
        .from("call_logs")
        .select("id, call_status, attempt_number, duration_seconds, started_at, ended_at, notes, created_at, call_operators!call_logs_operator_id_fkey(operator_name)")
        .eq("lead_id", leadId)
        .eq("campaign_id", campaignId)
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
  }, [open, leadId, campaignId]);

  const executeAutomation = async (actionId: string) => {
    if (actionId.startsWith("__")) return;

    try {
      const { data: actionData } = await (supabase as any)
        .from("call_script_actions")
        .select("action_type, action_config")
        .eq("id", actionId)
        .maybeSingle();

      if (!actionData) return;

      // Webhook
      if (actionData.action_type === "webhook" && actionData.action_config?.url) {
        const { data: leadData } = await (supabase as any)
          .from("call_leads")
          .select("*")
          .eq("id", leadId)
          .single();

        const { error: proxyError } = await supabase.functions.invoke("webhook-proxy", {
          body: { url: actionData.action_config.url, payload: { lead: leadData, campaignId, actionType: "webhook" } },
        });

        if (proxyError) {
          toast({ title: "Webhook falhou", description: proxyError.message, variant: "destructive" });
        }
      }
      // Start sequence
      else if (actionData.action_type === "start_sequence" && actionData.action_config) {
        const { campaignId: seqCampaignId, campaignType, sequenceId } = actionData.action_config as {
          campaignId?: string; campaignType?: string; sequenceId?: string;
        };

        if (campaignType === "dispatch" && sequenceId && leadPhone) {
          const { data: result, error: fnError } = await supabase.functions.invoke("execute-dispatch-sequence", {
            body: { campaignId: seqCampaignId, sequenceId, contactPhone: leadPhone, contactName: leadName || "" },
          });
          if (fnError || result?.error) {
            toast({ title: "Erro na sequência", description: result?.error || fnError?.message, variant: "destructive" });
          }
        } else if (campaignType === "group" && sequenceId && seqCampaignId) {
          const { error: fnError } = await supabase.functions.invoke("execute-message", {
            body: {
              campaignId: seqCampaignId, sequenceId,
              triggerContext: {
                respondentPhone: leadPhone || "", respondentName: leadName || "",
                respondentJid: leadPhone ? `${leadPhone}@s.whatsapp.net` : "",
                groupJid: "", sendPrivate: true,
              },
            },
          });
          if (fnError) {
            toast({ title: "Erro na sequência de grupo", description: fnError.message, variant: "destructive" });
          }
        }
      }
      // Add tag
      else if (actionData.action_type === "add_tag" && actionData.action_config?.tag) {
        const tag = actionData.action_config.tag as string;
        const { data: leadData } = await (supabase as any)
          .from("call_leads").select("custom_fields").eq("id", leadId).single();
        const currentFields = (leadData?.custom_fields as Record<string, unknown>) || {};
        const currentTags = Array.isArray(currentFields.tags) ? currentFields.tags : [];
        if (!currentTags.includes(tag)) {
          await (supabase as any).from("call_leads")
            .update({ custom_fields: { ...currentFields, tags: [...currentTags, tag] } })
            .eq("id", leadId);
        }
      }
      // Update status
      else if (actionData.action_type === "update_status" && actionData.action_config?.status) {
        const newStatus = String(actionData.action_config.status);
        await (supabase as any).from("call_leads").update({ status: newStatus }).eq("id", leadId);
        if (newStatus !== "completed") {
          await (supabase as any).from("call_logs").update({ call_status: newStatus }).eq("id", callId);
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
        call_status: selectedActionId === "__failure" ? "no_answer" : "completed",
        ended_at: new Date().toISOString(),
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
        .eq("id", callId);

      await (supabase as any).rpc("release_operator", { p_call_id: callId });

      // Execute automation (webhook, sequence, tag, status) without blocking
      await executeAutomation(selectedActionId);

      toast({ title: "Ação registrada", description: "Ligação finalizada com sucesso." });
      onOpenChange(false);
      resetState();
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
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetState(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Lead Header */}
        <div className="bg-gradient-to-b from-primary/10 to-transparent border-b px-6 py-5 text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-lg font-bold text-primary">
              {leadName.charAt(0).toUpperCase()}
            </div>
          </div>
          <h2 className="text-2xl font-bold tracking-wide uppercase text-foreground">
            {leadName}
          </h2>
          <p className="text-lg font-mono text-primary">
            📞 {leadPhone}
          </p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">📁 {campaignName}</Badge>
            <Badge variant="outline" className="text-xs">🔄 x{attemptNumber}/{maxAttempts}</Badge>
            {isPriority && <Badge variant="secondary" className="text-xs">⭐ Prioridade</Badge>}
            {callStatus && <Badge variant="outline" className="text-xs">📡 {callStatus}</Badge>}
          </div>
          {externalCallId && (
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-xs text-muted-foreground font-mono truncate max-w-[280px]">
                🆔 {externalCallId}
              </span>
              <button
                onClick={() => copyExternalId(externalCallId)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
          )}
          <p className="text-2xl font-semibold font-mono text-emerald-500">
            ⏱️ {formatDuration(duration)}
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
                      <InlineScriptRunner campaignId={campaignId} leadId={leadId} />
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <div className="border-t" />

                {/* Result Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">🎯 Ações</h3>

                  {/* Campaign Actions */}
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
                              ℹ️ Ações carregadas da campanha "{campaignName}"
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
                      const isCurrent = entry.id === callId;
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
                            <span>Duração: {entry.duration_seconds != null ? formatDuration(entry.duration_seconds) : isCurrent ? formatDuration(duration) + " (em andamento)" : "—"}</span>
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
