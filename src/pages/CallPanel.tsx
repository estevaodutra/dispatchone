import { useState, useEffect, useRef, useCallback } from "react";
import { useCallPanel, CallPanelEntry } from "@/hooks/useCallPanel";
import { useCallCampaigns } from "@/hooks/useCallCampaigns";
import { useCallActions, CallAction } from "@/hooks/useCallActions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Clock,
  Phone,
  PhoneCall,
  PhoneOff,
  User,
  FolderOpen,
  Plus,
  CalendarClock,
  XCircle,
  Play,
  Target,
  Bell,
  BellOff,
  CheckCircle2,
  AlertTriangle,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// ── Helpers ──

function formatPhone(phone: string | null) {
  if (!phone) return "";
  const clean = phone.replace(/\D/g, "");
  if (clean.length === 11) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  }
  if (clean.length === 13) {
    return `+${clean.slice(0, 2)} (${clean.slice(2, 4)}) ${clean.slice(4, 9)}-${clean.slice(9)}`;
  }
  return phone;
}

function getTimeRemaining(scheduledFor: string | null): { text: string; seconds: number; isUrgent: boolean } {
  if (!scheduledFor) return { text: "", seconds: Infinity, isUrgent: false };
  const diff = new Date(scheduledFor).getTime() - Date.now();
  if (diff <= 0) return { text: "AGORA", seconds: 0, isUrgent: true };
  const totalSec = Math.floor(diff / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return {
    text: min > 0 ? `${min}:${sec.toString().padStart(2, "0")}` : `0:${sec.toString().padStart(2, "0")}`,
    seconds: totalSec,
    isUrgent: totalSec <= 60,
  };
}

function getStatusCategory(status: string): "scheduled" | "in_progress" | "completed" | "failed" | "cancelled" {
  if (["scheduled", "ready"].includes(status)) return "scheduled";
  if (["dialing", "ringing", "answered", "in_progress"].includes(status)) return "in_progress";
  if (status === "completed") return "completed";
  if (status === "cancelled") return "cancelled";
  return "failed";
}

// ── Sound ──

function playAlertSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.8);
    // Second beep
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1100, ctx.currentTime + 0.3);
    gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.3);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.1);
    osc2.start(ctx.currentTime + 0.3);
    osc2.stop(ctx.currentTime + 1.1);
  } catch {
    // Audio context not available
  }
}

// ── Main Component ──

export default function CallPanel() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [, setTick] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const notifiedRef = useRef<Set<string>>(new Set());

  // Dialogs
  const [rescheduleEntry, setRescheduleEntry] = useState<CallPanelEntry | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [cancelEntry, setCancelEntry] = useState<CallPanelEntry | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [actionEntry, setActionEntry] = useState<CallPanelEntry | null>(null);
  const [actionNotes, setActionNotes] = useState("");

  const { campaigns } = useCallCampaigns();

  const { entries, stats, isLoading, delayCall, rescheduleCall, cancelCall, dialNow, registerAction } = useCallPanel({
    status: statusFilter !== "all" ? statusFilter : undefined,
    campaignId: campaignFilter !== "all" ? campaignFilter : undefined,
    search: searchQuery || undefined,
  });

  // 1-second tick for countdowns
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Notification permission
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      setNotificationsEnabled(true);
    }
  }, []);

  const requestNotifications = useCallback(async () => {
    setSoundEnabled(true);
    try {
      if (typeof Notification !== "undefined") {
        const perm = await Notification.requestPermission();
        if (perm === "granted") {
          setNotificationsEnabled(true);
        }
      }
    } catch {
      // Notification API blocked (e.g. iframe)
    }
  }, []);

  // Alert when call is <= 60s away
  useEffect(() => {
    entries.forEach((entry) => {
      if (!["scheduled", "ready"].includes(entry.callStatus)) return;
      const { seconds, isUrgent } = getTimeRemaining(entry.scheduledFor);
      if (isUrgent && seconds <= 60 && !notifiedRef.current.has(entry.id)) {
        notifiedRef.current.add(entry.id);
        if (soundEnabled) {
          playAlertSound();
        }
        if (notificationsEnabled && typeof Notification !== "undefined") {
          new Notification("📞 Ligação em instantes", {
            body: `${entry.leadName || "Lead"} - ${formatPhone(entry.leadPhone)}`,
            tag: entry.id,
          });
        }
      }
    });
  }, [entries, soundEnabled, notificationsEnabled]);

  // Handlers
  const handleReschedule = async () => {
    if (!rescheduleEntry || !rescheduleDate || !rescheduleTime) return;
    await rescheduleCall({ callId: rescheduleEntry.id, scheduledFor: new Date(`${rescheduleDate}T${rescheduleTime}`).toISOString() });
    setRescheduleEntry(null);
  };

  const handleCancel = async () => {
    if (!cancelEntry) return;
    await cancelCall({ callId: cancelEntry.id, reason: cancelReason || undefined });
    setCancelEntry(null);
    setCancelReason("");
  };

  const handleRescheduleQuick = (minutes: number) => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + minutes);
    setRescheduleDate(format(now, "yyyy-MM-dd"));
    setRescheduleTime(format(now, "HH:mm"));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <PhoneCall className="h-6 w-6 text-primary" />
            Painel de Ligações
          </h1>
          <p className="text-sm text-muted-foreground">Gerencie todas as ligações em tempo real</p>
        </div>
        {!soundEnabled ? (
          <Button variant="outline" size="sm" onClick={requestNotifications}>
            <Bell className="h-4 w-4 mr-2" />
            Ativar Alertas
          </Button>
        ) : (
          <Badge variant="secondary" className="gap-1 bg-emerald-100 text-emerald-700 border-emerald-300">
            <Bell className="h-3 w-3" />
            {notificationsEnabled ? "Alertas e notificações ativos" : "Alertas sonoros ativos"}
          </Badge>
        )}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard icon={<Clock className="h-5 w-5 text-amber-500" />} label="Agendadas" value={stats.scheduled} />
        <MetricCard icon={<Phone className="h-5 w-5 text-blue-500" />} label="Em Andamento" value={stats.inProgress} />
        <MetricCard icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />} label="Concluídas" value={stats.completed} />
        <MetricCard icon={<XCircle className="h-5 w-5 text-destructive" />} label="Canceladas / Falhas" value={stats.cancelled + stats.failed} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="🔍 Buscar por nome ou telefone..."
          className="max-w-xs"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Select value={campaignFilter} onValueChange={setCampaignFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Campanha" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as campanhas</SelectItem>
            {campaigns.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="scheduled">Agendadas</SelectItem>
            <SelectItem value="in_progress">Em Andamento</SelectItem>
            <SelectItem value="completed">Concluídas</SelectItem>
            <SelectItem value="failed">Falhas</SelectItem>
            <SelectItem value="cancelled">Canceladas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Call List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando ligações...</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhuma ligação encontrada.</div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <CallCard
              key={entry.id}
              entry={entry}
              onDelay={(id) => delayCall({ callId: id, minutes: 10 })}
              onReschedule={(e) => {
                setRescheduleEntry(e);
                const now = new Date();
                setRescheduleDate(format(now, "yyyy-MM-dd"));
                setRescheduleTime(format(new Date(now.getTime() + 30 * 60000), "HH:mm"));
              }}
              onCancel={(e) => setCancelEntry(e)}
              onDialNow={(id) => dialNow(id)}
              onAction={(e) => { setActionEntry(e); setActionNotes(""); }}
            />
          ))}
        </div>
      )}

      {/* Reschedule Dialog */}
      <Dialog open={!!rescheduleEntry} onOpenChange={(o) => !o && setRescheduleEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reagendar Ligação</DialogTitle>
            <DialogDescription>
              {rescheduleEntry?.leadName} — {formatPhone(rescheduleEntry?.leadPhone || null)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data</Label>
                <Input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} />
              </div>
              <div>
                <Label>Horário</Label>
                <Input type="time" value={rescheduleTime} onChange={(e) => setRescheduleTime(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => handleRescheduleQuick(10)}>+10 min</Button>
              <Button variant="outline" size="sm" onClick={() => handleRescheduleQuick(30)}>+30 min</Button>
              <Button variant="outline" size="sm" onClick={() => handleRescheduleQuick(60)}>+1 hora</Button>
              <Button variant="outline" size="sm" onClick={() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                setRescheduleDate(format(tomorrow, "yyyy-MM-dd"));
              }}>Amanhã</Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRescheduleEntry(null)}>Cancelar</Button>
            <Button onClick={handleReschedule}>Reagendar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={!!cancelEntry} onOpenChange={(o) => !o && setCancelEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Ligação</DialogTitle>
            <DialogDescription>
              {cancelEntry?.leadName} — {formatPhone(cancelEntry?.leadPhone || null)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Tem certeza que deseja cancelar esta ligação?</p>
            <div>
              <Label>Motivo (opcional)</Label>
              <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Motivo do cancelamento..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCancelEntry(null)}>Voltar</Button>
            <Button variant="destructive" onClick={handleCancel}>Confirmar Cancelamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      {actionEntry && (
        <ActionDialog
          entry={actionEntry}
          notes={actionNotes}
          onNotesChange={setActionNotes}
          onClose={() => setActionEntry(null)}
          onSelect={async (actionId) => {
            await registerAction({ callId: actionEntry.id, actionId, notes: actionNotes || undefined });
            setActionEntry(null);
          }}
        />
      )}
    </div>
  );
}

// ── Sub-components ──

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        {icon}
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

interface CallCardProps {
  entry: CallPanelEntry;
  onDelay: (id: string) => void;
  onReschedule: (entry: CallPanelEntry) => void;
  onCancel: (entry: CallPanelEntry) => void;
  onDialNow: (id: string) => void;
  onAction: (entry: CallPanelEntry) => void;
}

function CallCard({ entry, onDelay, onReschedule, onCancel, onDialNow, onAction }: CallCardProps) {
  const category = getStatusCategory(entry.callStatus);
  const timeInfo = getTimeRemaining(entry.scheduledFor);

  const borderClass = cn(
    "border-l-4 transition-all",
    category === "scheduled" && !timeInfo.isUrgent && "border-l-amber-400",
    category === "scheduled" && timeInfo.isUrgent && "border-l-red-500 animate-pulse",
    category === "in_progress" && "border-l-blue-500",
    category === "completed" && "border-l-emerald-500",
    category === "failed" && "border-l-destructive",
    category === "cancelled" && "border-l-muted-foreground",
  );

  return (
    <Card className={borderClass}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left: status + info */}
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              {category === "scheduled" && timeInfo.isUrgent && (
                <Badge variant="destructive" className="gap-1 animate-pulse">
                  <Bell className="h-3 w-3" /> LIGAÇÃO AGORA!
                </Badge>
              )}
              {category === "scheduled" && !timeInfo.isUrgent && (
                <Badge variant="secondary" className="gap-1">
                  <Timer className="h-3 w-3" /> Em {timeInfo.text}
                </Badge>
              )}
              {category === "in_progress" && (
                <Badge className="gap-1 bg-blue-500 text-white">
                  <Phone className="h-3 w-3" /> Em ligação
                </Badge>
              )}
              {category === "completed" && (
                <Badge variant="secondary" className="gap-1 text-emerald-600">
                  <CheckCircle2 className="h-3 w-3" /> Concluída
                  {entry.durationSeconds ? ` • ${Math.floor(entry.durationSeconds / 60)}:${(entry.durationSeconds % 60).toString().padStart(2, "0")}` : ""}
                </Badge>
              )}
              {category === "failed" && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" /> {entry.callStatus === "no_answer" ? "Não atendeu" : entry.callStatus === "busy" ? "Ocupado" : "Falhou"}
                  {entry.leadAttempts > 0 && ` • ${entry.leadAttempts} tentativa${entry.leadAttempts > 1 ? "s" : ""}`}
                </Badge>
              )}
              {category === "cancelled" && (
                <Badge variant="outline" className="gap-1 text-muted-foreground">
                  <XCircle className="h-3 w-3" /> Cancelada
                </Badge>
              )}
              {entry.scheduledFor && (
                <span className="text-xs text-muted-foreground ml-auto">
                  {format(new Date(entry.scheduledFor), "HH:mm")}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm pt-1">
              <span className="flex items-center gap-1 font-medium">
                <User className="h-3.5 w-3.5 text-muted-foreground" /> {entry.leadName || "Sem nome"}
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Phone className="h-3.5 w-3.5" /> {formatPhone(entry.leadPhone)}
              </span>
            </div>
            {entry.campaignName && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <FolderOpen className="h-3 w-3" /> {entry.campaignName}
              </div>
            )}
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {category === "scheduled" && (
              <>
                {timeInfo.isUrgent ? (
                  <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white gap-1" onClick={() => onDialNow(entry.id)}>
                    <Play className="h-3.5 w-3.5" /> INICIAR LIGAÇÃO
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" size="sm" onClick={() => onDelay(entry.id)}>
                      <Plus className="h-3 w-3 mr-1" /> 10 min
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onReschedule(entry)}>
                      <CalendarClock className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onCancel(entry)}>
                      <XCircle className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onDialNow(entry.id)}>
                      <Play className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
                <Button variant="secondary" size="sm" onClick={() => onAction(entry)}>
                  <Target className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
            {category === "in_progress" && (
              <Button variant="secondary" size="sm" onClick={() => onAction(entry)}>
                <Target className="h-3.5 w-3.5 mr-1" /> Ação
              </Button>
            )}
            {category === "failed" && (
              <>
                <Button variant="outline" size="sm" onClick={() => onReschedule(entry)}>
                  <CalendarClock className="h-3.5 w-3.5 mr-1" /> Reagendar
                </Button>
                <Button variant="secondary" size="sm" onClick={() => onAction(entry)}>
                  <Target className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Action Dialog ──

function ActionDialog({
  entry,
  notes,
  onNotesChange,
  onClose,
  onSelect,
}: {
  entry: CallPanelEntry;
  notes: string;
  onNotesChange: (v: string) => void;
  onClose: () => void;
  onSelect: (actionId: string) => Promise<void>;
}) {
  const { actions, isLoading } = useCallActions(entry.campaignId || "");
  const [submitting, setSubmitting] = useState(false);

  const handleSelect = async (actionId: string) => {
    setSubmitting(true);
    try {
      await onSelect(actionId);
    } finally {
      setSubmitting(false);
    }
  };

  const getActionDescription = (action: CallAction) => {
    switch (action.actionType) {
      case "start_sequence": return "Inicia sequência automática";
      case "add_tag": return `Adiciona tag: "${action.actionConfig?.tag || ""}"`;
      case "update_status": return `Atualiza status para: "${action.actionConfig?.status || ""}"`;
      case "webhook": return "Dispara webhook externo";
      case "none": return "Apenas registra";
      default: return "";
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Ação</DialogTitle>
          <DialogDescription>
            <span className="flex items-center gap-2 mt-1">
              <User className="h-3.5 w-3.5" /> {entry.leadName || "Lead"} — {formatPhone(entry.leadPhone)}
            </span>
            {entry.campaignName && (
              <span className="flex items-center gap-2 mt-0.5">
                <FolderOpen className="h-3.5 w-3.5" /> {entry.campaignName}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando ações...</p>
          ) : actions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma ação configurada nesta campanha.</p>
          ) : (
            actions.map((action) => (
              <button
                key={action.id}
                disabled={submitting}
                onClick={() => handleSelect(action.id)}
                className={cn(
                  "w-full text-left rounded-lg border p-3 hover:bg-accent transition-colors",
                  "disabled:opacity-50"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: action.color }} />
                  <span className="font-medium text-sm">{action.name}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 ml-5">{getActionDescription(action)}</p>
              </button>
            ))
          )}
        </div>

        <div>
          <Label className="text-xs">Observações (opcional)</Label>
          <Textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Notas sobre a ligação..."
            rows={2}
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
