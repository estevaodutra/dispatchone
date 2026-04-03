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
import { Webhook, MessageSquare, Phone } from "lucide-react";

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
    message_template?: string;
    call_campaign_id?: string;
  }) => void;
  existing?: GroupExecutionList | null;
  isSaving?: boolean;
}

const EVENT_OPTIONS = [
  { value: "group_join", label: "Entrada no grupo (group_join)" },
  { value: "message", label: "Mensagem recebida (message)" },
  { value: "poll_response", label: "Resposta de enquete (poll_response)" },
];

export function ExecutionListConfigDialog({
  open,
  onOpenChange,
  onSave,
  existing,
  isSaving,
}: ExecutionListConfigDialogProps) {
  const [name, setName] = useState("");
  const [windowType, setWindowType] = useState<"fixed" | "duration">("fixed");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("18:00");
  const [durationHours, setDurationHours] = useState(6);
  const [monitoredEvents, setMonitoredEvents] = useState<string[]>(["group_join"]);
  const [actionType, setActionType] = useState<"webhook" | "message" | "call">("webhook");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [messageTemplate, setMessageTemplate] = useState("");
  const [callCampaignId, setCallCampaignId] = useState("");

  const { campaigns: callCampaigns } = useCallCampaigns();

  useEffect(() => {
    if (existing) {
      setName(existing.name || "");
      setWindowType(existing.window_type as "fixed" | "duration");
      setStartTime(existing.window_start_time?.slice(0, 5) || "08:00");
      setEndTime(existing.window_end_time?.slice(0, 5) || "18:00");
      setDurationHours(existing.window_duration_hours || 6);
      setMonitoredEvents(existing.monitored_events || ["group_join"]);
      setActionType(existing.action_type as "webhook" | "message" | "call");
      setWebhookUrl(existing.webhook_url || "");
      setMessageTemplate(existing.message_template || "");
      setCallCampaignId(existing.call_campaign_id || "");
    } else {
      setName("");
      setWindowType("fixed");
      setStartTime("08:00");
      setEndTime("18:00");
      setDurationHours(6);
      setMonitoredEvents(["group_join"]);
      setActionType("webhook");
      setWebhookUrl("");
      setMessageTemplate("");
      setCallCampaignId("");
    }
  }, [existing, open]);

  const toggleEvent = (event: string) => {
    setMonitoredEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  const isValid = () => {
    if (!name.trim()) return false;
    if (monitoredEvents.length === 0) return false;
    if (windowType === "duration" && durationHours < 1) return false;
    if (actionType === "webhook" && !webhookUrl.trim()) return false;
    if (actionType === "message" && !messageTemplate.trim()) return false;
    if (actionType === "call" && !callCampaignId) return false;
    return true;
  };

  const handleSave = () => {
    onSave({
      name: name.trim(),
      window_type: windowType,
      window_start_time: windowType === "fixed" ? startTime : undefined,
      window_end_time: windowType === "fixed" ? endTime : undefined,
      window_duration_hours: windowType === "duration" ? durationHours : undefined,
      monitored_events: monitoredEvents,
      action_type: actionType,
      webhook_url: actionType === "webhook" ? webhookUrl : undefined,
      message_template: actionType === "message" ? messageTemplate : undefined,
      call_campaign_id: actionType === "call" ? callCampaignId : undefined,
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
            <RadioGroup value={windowType} onValueChange={(v) => setWindowType(v as "fixed" | "duration")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fixed" id="wt-fixed" />
                <Label htmlFor="wt-fixed">Horário fixo</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="duration" id="wt-duration" />
                <Label htmlFor="wt-duration">Duração</Label>
              </div>
            </RadioGroup>

            {windowType === "fixed" ? (
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
            ) : (
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
