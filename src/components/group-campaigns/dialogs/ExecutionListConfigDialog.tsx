import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCallCampaigns } from "@/hooks/useCallCampaigns";
import { GroupExecutionList } from "@/hooks/useGroupExecutionList";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Webhook, MessageSquare, Phone, Clock, CalendarClock, Zap, AlertCircle, ChevronDown, Copy } from "lucide-react";

interface ExecutionListConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: {
    name: string;
    window_type: "fixed" | "duration";
    window_start_time?: string;
    window_end_time?: string;
    window_duration_hours?: number;
    monitored_events: string[];
    action_type: "webhook" | "message" | "call";
    webhook_url?: string;
    webhook_params?: Record<string, any>;
    message_template?: string;
    call_campaign_id?: string;
    execution_schedule_type?: "window_end" | "scheduled" | "immediate";
    execution_scheduled_time?: string;
    execution_days_of_week?: number[];
  }) => void;
  existing?: GroupExecutionList | null;
  isSaving?: boolean;
}

const EVENT_OPTIONS = [
  { value: "group_join", label: "Entrada no grupo (group_join)" },
  { value: "group_leave", label: "Saída do grupo (group_leave)" },
  { value: "message", label: "Mensagem recebida (message)" },
  { value: "poll_response", label: "Resposta de enquete (poll_response)" },
];

const DAYS_OF_WEEK = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
];

export function ExecutionListConfigDialog({
  open,
  onOpenChange,
  onSave,
  existing,
  isSaving,
}: ExecutionListConfigDialogProps) {
  const [name, setName] = useState("");
  const [windowType, setWindowType] = useState<"fixed" | "duration" | "fulltime">("fixed");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("18:00");
  const [durationHours, setDurationHours] = useState(6);
  const [monitoredEvents, setMonitoredEvents] = useState<string[]>(["group_join"]);
  const [actionType, setActionType] = useState<"webhook" | "message" | "call">("webhook");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookParams, setWebhookParams] = useState("");
  const [webhookParamsError, setWebhookParamsError] = useState<string | null>(null);
  const [messageTemplate, setMessageTemplate] = useState("");
  const [callCampaignId, setCallCampaignId] = useState("");
  const [execScheduleType, setExecScheduleType] = useState<"window_end" | "scheduled" | "immediate">("window_end");
  const [execScheduledTime, setExecScheduledTime] = useState("10:00");
  const [execDaysOfWeek, setExecDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]);

  const { campaigns: callCampaigns } = useCallCampaigns();

  useEffect(() => {
    if (existing) {
      setName(existing.name || "");
      const isFulltime = existing.window_type === "fixed" &&
        existing.window_start_time?.slice(0, 5) === "00:00" &&
        existing.window_end_time?.slice(0, 5) === "23:59";
      setWindowType(isFulltime ? "fulltime" : (existing.window_type as "fixed" | "duration"));
      setStartTime(existing.window_start_time?.slice(0, 5) || "08:00");
      setEndTime(existing.window_end_time?.slice(0, 5) || "18:00");
      setDurationHours(existing.window_duration_hours || 6);
      setMonitoredEvents(existing.monitored_events || ["group_join"]);
      setActionType(existing.action_type as "webhook" | "message" | "call");
      setWebhookUrl(existing.webhook_url || "");
      const params = (existing as any).webhook_params;
      setWebhookParams(params && Object.keys(params).length > 0 ? JSON.stringify(params, null, 2) : "");
      setWebhookParamsError(null);
      setMessageTemplate(existing.message_template || "");
      setCallCampaignId(existing.call_campaign_id || "");
      setExecScheduleType((existing.execution_schedule_type as "window_end" | "scheduled" | "immediate") || "window_end");
      setExecScheduledTime(existing.execution_scheduled_time || "10:00");
      setExecDaysOfWeek(existing.execution_days_of_week || [1, 2, 3, 4, 5]);
    } else {
      setName("");
      setWindowType("fixed");
      setStartTime("08:00");
      setEndTime("18:00");
      setDurationHours(6);
      setMonitoredEvents(["group_join"]);
      setActionType("webhook");
      setWebhookUrl("");
      setWebhookParams("");
      setWebhookParamsError(null);
      setMessageTemplate("");
      setCallCampaignId("");
      setExecScheduleType("window_end");
      setExecScheduledTime("10:00");
      setExecDaysOfWeek([1, 2, 3, 4, 5]);
    }
  }, [existing, open]);

  const toggleEvent = (event: string) => {
    setMonitoredEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  const toggleDay = (day: number) => {
    setExecDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const isValid = () => {
    if (!name.trim()) return false;
    if (monitoredEvents.length === 0) return false;
    if (windowType === "duration" && durationHours < 1) return false;
    if (actionType === "webhook" && !webhookUrl.trim()) return false;
    if (actionType === "message" && !messageTemplate.trim()) return false;
    if (actionType === "call" && !callCampaignId) return false;
    if (execScheduleType === "scheduled" && !execScheduledTime) return false;
    return true;
  };

  const handleSave = () => {
    const isFulltime = windowType === "fulltime";
    const mappedWindowType = isFulltime ? "fixed" : windowType;
    onSave({
      name: name.trim(),
      window_type: mappedWindowType as "fixed" | "duration",
      window_start_time: isFulltime ? "00:00" : (mappedWindowType === "fixed" ? startTime : undefined),
      window_end_time: isFulltime ? "23:59" : (mappedWindowType === "fixed" ? endTime : undefined),
      window_duration_hours: mappedWindowType === "duration" ? durationHours : undefined,
      monitored_events: monitoredEvents,
      action_type: actionType,
      webhook_url: actionType === "webhook" ? webhookUrl : undefined,
      message_template: actionType === "message" ? messageTemplate : undefined,
      call_campaign_id: actionType === "call" ? callCampaignId : undefined,
      execution_schedule_type: execScheduleType,
      execution_scheduled_time: execScheduleType === "scheduled" ? execScheduledTime : undefined,
      execution_days_of_week: execScheduleType === "scheduled" ? execDaysOfWeek : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {existing ? "Editar Lista de Execução" : "Nova Lista de Execução"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Nome da Lista *</Label>
            <Input
              placeholder="Ex: Leads de entrada, Respostas de enquete..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Window Type */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Janela de Tempo</Label>
            <RadioGroup value={windowType} onValueChange={(v) => setWindowType(v as "fixed" | "duration" | "fulltime")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fulltime" id="wt-fulltime" />
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="wt-fulltime">Tempo integral (24h)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fixed" id="wt-fixed" />
                <Label htmlFor="wt-fixed">Horário fixo</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="duration" id="wt-duration" />
                <Label htmlFor="wt-duration">Duração</Label>
              </div>
            </RadioGroup>

            {windowType === "fulltime" && (
              <p className="text-xs text-muted-foreground">
                Monitoramento contínuo 24 horas por dia, sem restrição de horário.
              </p>
            )}

            {windowType === "fixed" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Início</Label>
                  <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Fim</Label>
                  <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </div>
              </div>
            )}

            {windowType === "duration" && (
              <div>
                <Label className="text-xs text-muted-foreground">Duração (horas)</Label>
                <Input
                  type="number"
                  min={1}
                  max={168}
                  value={durationHours}
                  onChange={(e) => setDurationHours(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>
            )}
          </div>

          {/* Monitored Events */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Eventos a Monitorar</Label>
            {EVENT_OPTIONS.map((opt) => (
              <div key={opt.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`evt-${opt.value}`}
                  checked={monitoredEvents.includes(opt.value)}
                  onCheckedChange={() => toggleEvent(opt.value)}
                />
                <Label htmlFor={`evt-${opt.value}`} className="text-sm">{opt.label}</Label>
              </div>
            ))}
          </div>

          {/* Action Type */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Ação ao Executar</Label>
            <RadioGroup value={actionType} onValueChange={(v) => setActionType(v as "webhook" | "message" | "call")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="webhook" id="at-webhook" />
                <Webhook className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="at-webhook">Enviar para Webhook</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="message" id="at-message" />
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="at-message">Disparo de Mensagem</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="call" id="at-call" />
                <Phone className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="at-call">Disparo de Ligação</Label>
              </div>
            </RadioGroup>

            {actionType === "webhook" && (
              <div>
                <Label className="text-xs text-muted-foreground">URL</Label>
                <Input
                  placeholder="https://..."
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
              </div>
            )}

            {actionType === "message" && (
              <div>
                <Label className="text-xs text-muted-foreground">Mensagem</Label>
                <Textarea
                  placeholder="Olá {{name}}, seu número é {{phone}}"
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use {"{{name}}"} e {"{{phone}}"} como variáveis
                </p>
              </div>
            )}

            {actionType === "call" && (
              <div>
                <Label className="text-xs text-muted-foreground">Campanha de Ligação</Label>
                <Select value={callCampaignId} onValueChange={setCallCampaignId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a campanha..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(callCampaigns || []).map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Execution Schedule */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Agendamento da Execução</Label>
            <RadioGroup value={execScheduleType} onValueChange={(v) => setExecScheduleType(v as "window_end" | "scheduled" | "immediate")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="immediate" id="es-immediate" />
                <Zap className="h-4 w-4 text-yellow-500" />
                <Label htmlFor="es-immediate">Execução imediata</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="window_end" id="es-window" />
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="es-window">Ao fim da janela</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="scheduled" id="es-scheduled" />
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="es-scheduled">Horário agendado</Label>
              </div>
            </RadioGroup>

            {execScheduleType === "immediate" && (
              <p className="text-xs text-muted-foreground">
                Cada lead será processado imediatamente ao ser capturado, sem aguardar janela ou horário.
              </p>
            )}

            {execScheduleType === "window_end" && (
              <p className="text-xs text-muted-foreground">
                Os leads serão processados automaticamente quando a janela de tempo encerrar.
              </p>
            )}

            {execScheduleType === "scheduled" && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Horário de execução</Label>
                  <Input
                    type="time"
                    value={execScheduledTime}
                    onChange={(e) => setExecScheduledTime(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Dias da semana</Label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map((day) => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleDay(day.value)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                          execDaysOfWeek.includes(day.value)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-muted-foreground border-border hover:border-primary/50"
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Os leads acumulados serão processados no horário agendado, nos dias selecionados.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!isValid() || isSaving}>
            {isSaving ? "Salvando..." : existing ? "Salvar Alterações" : "Criar Lista"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
