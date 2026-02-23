import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { useCallPanel, CallPanelEntry } from "@/hooks/useCallPanel";
import { useCallCampaigns } from "@/hooks/useCallCampaigns";
import { useCallActions, CallAction } from "@/hooks/useCallActions";
import { useCallQueuePanel, QueuePanelEntry } from "@/hooks/useCallQueuePanel";
import { useQueueExecutionSummary } from "@/hooks/useQueueExecution";
import { useCallOperators } from "@/hooks/useCallOperators";
import { OperatorsPanel } from "@/components/call-panel/OperatorsPanel";
import { Users, Settings as SettingsIcon } from "lucide-react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InlineScriptRunner } from "@/components/call-campaigns/operator/InlineScriptRunner";
import {
  Clock,
  Pause,
  Square,
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
  FileText,
  Headset,
  Pencil,
  ChevronLeft,
  ChevronRight,
  ListOrdered,
  Trash2,
  Eye,
  RefreshCw,
  MoreHorizontal,
  Bot,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// ── Helpers ──

function formatPhone(phone: string | null) {
  if (!phone) return "";
  const clean = phone.replace(/\D/g, "");
  if (clean.length === 13 && clean.startsWith("55")) {
    const local = clean.slice(2);
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  }
  if (clean.length === 11) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  }
  return phone;
}

function getTimeRemaining(scheduledFor: string | null): { text: string; seconds: number; isUrgent: boolean } {
  if (!scheduledFor) return { text: "", seconds: Infinity, isUrgent: false };
  const diff = new Date(scheduledFor).getTime() - Date.now();
  if (diff <= 0) return { text: "AGORA", seconds: 0, isUrgent: true };
  const totalSec = Math.floor(diff / 1000);
  const h = Math.floor(totalSec / 3600).toString().padStart(2, "0");
  const m = Math.floor((totalSec % 3600) / 60).toString().padStart(2, "0");
  const s = (totalSec % 60).toString().padStart(2, "0");
  return {
    text: `${h}:${m}:${s}`,
    seconds: totalSec,
    isUrgent: totalSec <= 60,
  };
}

function getElapsedTime(startedAt: string | null): string {
  if (!startedAt) return "—";
  const diff = Date.now() - new Date(startedAt).getTime();
  if (diff < 0) return "00:00";
  const totalSec = Math.floor(diff / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60).toString().padStart(2, "0");
  const s = (totalSec % 60).toString().padStart(2, "0");
  return h > 0 ? `${h.toString().padStart(2, "0")}:${m}:${s}` : `${m}:${s}`;
}

function getStatusCategory(status: string): "scheduled" | "in_progress" | "completed" | "failed" | "cancelled" {
  if (["scheduled", "ready", "waiting_operator"].includes(status)) return "scheduled";
  if (["dialing", "ringing", "answered", "in_progress"].includes(status)) return "in_progress";
  if (status === "completed") return "completed";
  if (status === "cancelled") return "cancelled";
  return "failed";
}

// ── Priority Sort ──

function sortByPriority(entries: CallPanelEntry[]): CallPanelEntry[] {
  const now = Date.now();
  return [...entries].sort((a, b) => {
    const catA = getStatusCategory(a.callStatus);
    const catB = getStatusCategory(b.callStatus);

    const priorityOrder = { in_progress: 0, scheduled: 1, completed: 2, failed: 2, cancelled: 2 };
    
    // For scheduled, split into "AGORA" (timer <= 0) vs "Agendada" (timer > 0)
    const isNowA = catA === "scheduled" && a.scheduledFor && new Date(a.scheduledFor).getTime() <= now;
    const isNowB = catB === "scheduled" && b.scheduledFor && new Date(b.scheduledFor).getTime() <= now;

    const getPrio = (cat: string, isNow: boolean | null | undefined) => {
      if (cat === "in_progress") return 0;
      if (cat === "scheduled" && isNow) return 1;
      if (cat === "scheduled") return 2;
      return 3; // completed, failed, cancelled
    };

    const prioA = getPrio(catA, isNowA);
    const prioB = getPrio(catB, isNowB);

    if (prioA !== prioB) return prioA - prioB;

    // Within same priority group, priority campaigns come first
    if (a.isPriority !== b.isPriority) return a.isPriority ? -1 : 1;

    // Same priority group — sub-sort
    if (prioA === 0) {
      // in_progress: most recent startedAt first
      return new Date(b.startedAt || b.createdAt).getTime() - new Date(a.startedAt || a.createdAt).getTime();
    }
    if (prioA === 1) {
      // AGORA: oldest createdAt first
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    if (prioA === 2) {
      // Scheduled: smallest timer first
      const tA = a.scheduledFor ? new Date(a.scheduledFor).getTime() : Infinity;
      const tB = b.scheduledFor ? new Date(b.scheduledFor).getTime() : Infinity;
      return tA - tB;
    }
    // Finished: most recent first
    return new Date(b.endedAt || b.createdAt).getTime() - new Date(a.endedAt || a.createdAt).getTime();
  });
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

// ── Status Badge Component ──

function StatusBadgeCell({ entry }: { entry: CallPanelEntry }) {
  const category = getStatusCategory(entry.callStatus);
  const timeInfo = getTimeRemaining(entry.scheduledFor);

  if (category === "scheduled" && timeInfo.isUrgent) {
    return (
      <Badge variant="destructive" className="gap-1 text-xs whitespace-nowrap">
        AGORA!
      </Badge>
    );
  }
  if (category === "scheduled") {
    return (
      <Badge variant="secondary" className="gap-1 text-xs whitespace-nowrap bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
        Agendada
      </Badge>
    );
  }
  if (category === "in_progress") {
    return (
      <Badge className="gap-1 text-xs whitespace-nowrap bg-emerald-500 text-white border-emerald-600">
        {entry.callStatus === "dialing" || entry.callStatus === "ringing" ? "Discando" : "Em ligação"}
      </Badge>
    );
  }
  if (category === "completed") {
    return (
      <Badge variant="secondary" className="gap-1 text-xs whitespace-nowrap text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
        Atendida
      </Badge>
    );
  }
  if (category === "cancelled") {
    return (
      <Badge variant="outline" className="gap-1 text-xs whitespace-nowrap text-muted-foreground">
        Cancelada
      </Badge>
    );
  }
  // failed
  const label = entry.callStatus === "no_answer" ? "N/Atendeu"
    : entry.callStatus === "busy" ? "Ocupado"
    : entry.callStatus === "not_found" ? "Não Encontrada"
    : entry.callStatus === "voicemail" ? "Caixa Postal"
    : entry.callStatus === "timeout" ? "Tempo Esgotado"
    : "Falha";
  const isOrange = ["busy", "failed", "not_found", "voicemail", "timeout"].includes(entry.callStatus);
  return (
    <Badge variant="outline" className={cn(
      "gap-1 text-xs whitespace-nowrap",
      isOrange ? "text-orange-600 border-orange-300 dark:text-orange-400 dark:border-orange-700" : "text-muted-foreground"
    )}>
      {label}
    </Badge>
  );
}

// ── Timer Cell ──

function TimerCell({ entry }: { entry: CallPanelEntry }) {
  const category = getStatusCategory(entry.callStatus);
  
  if (category === "scheduled") {
    const timeInfo = getTimeRemaining(entry.scheduledFor);
    if (timeInfo.isUrgent) return <span className="text-xs text-muted-foreground">—</span>;
    return <span className="font-mono text-xs">{timeInfo.text}</span>;
  }
  return <span className="text-xs text-muted-foreground">—</span>;
}

// ── Queue Status Banner ──

function QueueStatusBanner({ summary, operators, onRefresh, isRefreshing, onPauseAll, onResumeAll, isPausingAll, isResumingAll, onClearQueue, isClearingQueue, totalWaiting }: {
  summary: import("@/hooks/useQueueExecution").QueueExecutionSummary;
  operators: import("@/hooks/useCallOperators").CallOperator[];
  onRefresh: () => void;
  isRefreshing: boolean;
  onPauseAll: () => void;
  onResumeAll: () => void;
  isPausingAll: boolean;
  isResumingAll: boolean;
  onClearQueue: () => void;
  isClearingQueue: boolean;
  totalWaiting: number;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  if (summary.isLoading) return null;

  const { globalStatus, summary: counts } = summary;
  const totalActive = counts.running + counts.paused + counts.waiting_operator + counts.waiting_cooldown;

  if (totalActive === 0 && counts.stopped === 0) return null;

  const availableOps = operators.filter(op => op.status === "available").length;
  const totalActiveOps = operators.filter(op => ["available", "on_call", "cooldown"].includes(op.status)).length;

  const config: Record<string, { label: string; icon: typeof Play; className: string; dotClass: string }> = {
    running: { label: "Em execução", icon: Play, className: "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400", dotClass: "bg-emerald-500 animate-pulse" },
    paused: { label: "Pausada", icon: Pause, className: "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400", dotClass: "bg-amber-500" },
    stopped: { label: "Parada", icon: Square, className: "bg-muted border-border text-muted-foreground", dotClass: "bg-muted-foreground" },
    mixed: { label: "Mista", icon: AlertTriangle, className: "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400", dotClass: "bg-blue-500 animate-pulse" },
  };

  const c = config[globalStatus] || config.stopped;
  const Icon = c.icon;

  const parts: string[] = [];
  if (counts.running > 0) parts.push(`${counts.running} executando`);
  if (counts.paused > 0) parts.push(`${counts.paused} pausada${counts.paused > 1 ? "s" : ""}`);
  if (counts.waiting_operator > 0) parts.push(`${counts.waiting_operator} aguardando operador`);
  if (counts.waiting_cooldown > 0) parts.push(`${counts.waiting_cooldown} em intervalo`);
  if (parts.length === 0) parts.push("Nenhuma fila ativa");

  return (
    <div className={cn("flex items-center gap-3 rounded-lg border px-4 py-2.5", c.className)}>
      <span className={cn("h-2 w-2 rounded-full shrink-0", c.dotClass)} />
      <Icon className="h-4 w-4 shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium">{c.label}</span>
        <span className="text-xs opacity-75 ml-2">{parts.join(" · ")}</span>
      </div>
      <Badge
        variant={availableOps > 0 ? "default" : "destructive"}
        className={cn("shrink-0 gap-1 text-xs", availableOps > 0
          ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400"
          : ""
        )}
      >
        <Headset className="h-3 w-3" />
        {availableOps} disponíve{availableOps === 1 ? "l" : "is"}
        {totalActiveOps > availableOps && ` / ${totalActiveOps} online`}
      </Badge>
      {(globalStatus === "running" || globalStatus === "mixed") && (
        <Button
          variant="outline"
          size="sm"
          onClick={onPauseAll}
          disabled={isPausingAll}
          className="shrink-0 gap-1.5 text-xs h-7 px-2.5"
        >
          <Pause className="h-3.5 w-3.5" />
          {isPausingAll ? "Pausando..." : "Pausar"}
        </Button>
      )}
      {globalStatus === "paused" && (
        <Button
          variant="outline"
          size="sm"
          onClick={onResumeAll}
          disabled={isResumingAll}
          className="shrink-0 gap-1.5 text-xs h-7 px-2.5"
        >
          <Play className="h-3.5 w-3.5" />
          {isResumingAll ? "Retomando..." : "Retomar"}
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={onRefresh}
        disabled={isRefreshing}
        className="shrink-0 gap-1.5 text-xs h-7 px-2.5"
      >
        <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
        Buscar operadores
      </Button>
      {totalWaiting > 0 && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmOpen(true)}
            disabled={isClearingQueue}
            className="shrink-0 gap-1.5 text-xs h-7 px-2.5 text-destructive border-destructive/30 hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {isClearingQueue ? "Esvaziando..." : "Esvaziar Fila"}
          </Button>
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Esvaziar fila de ligações</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja esvaziar toda a fila? Todos os {totalWaiting} itens pendentes serão removidos. Essa ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => { onClearQueue(); setConfirmOpen(false); }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Esvaziar Fila
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}

// ── Main Component ──

export default function CallPanel() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [itemsPerPage, setItemsPerPage] = useState(50);
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
  const [editOperatorEntry, setEditOperatorEntry] = useState<CallPanelEntry | null>(null);
  const [selectedOperatorId, setSelectedOperatorId] = useState("");
  const [detailEntry, setDetailEntry] = useState<CallPanelEntry | null>(null);
  const [bulkOperatorOpen, setBulkOperatorOpen] = useState(false);
  const [bulkOperatorId, setBulkOperatorId] = useState("auto");
  const [bulkDialing, setBulkDialing] = useState(false);

  const { campaigns } = useCallCampaigns();
  const { toast } = useToast();

  const isQueueTab = statusFilter === "queue";

  const { entries, stats, isLoading, delayCall, rescheduleCall, cancelCall, dialNow, registerAction, updateOperator, bulkUpdateOperator, bulkEnqueue } = useCallPanel({
    status: !isQueueTab && statusFilter !== "all" ? statusFilter : undefined,
    campaignId: campaignFilter !== "all" ? campaignFilter : undefined,
    search: searchQuery || undefined,
  });

  const { entries: queueEntries, isLoading: queueLoading, totalWaiting, removeFromQueue, clearQueue, isClearingQueue } = useCallQueuePanel(campaignFilter);
  const queueSummary = useQueueExecutionSummary();
  const { operators, isLoading: operatorsLoading, refetch: refetchOperators } = useCallOperators();
  const [isRefreshingQueue, setIsRefreshingQueue] = useState(false);

  const handleRefreshQueue = useCallback(async () => {
    setIsRefreshingQueue(true);
    try {
      await refetchOperators();
    } finally {
      setIsRefreshingQueue(false);
    }
  }, [refetchOperators]);

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
      // Notification API blocked
    }
  }, []);

  // Alert when call is <= 60s away
  useEffect(() => {
    entries.forEach((entry) => {
      if (!["scheduled", "ready"].includes(entry.callStatus)) return;
      const { seconds, isUrgent } = getTimeRemaining(entry.scheduledFor);
      if (isUrgent && seconds <= 60 && !notifiedRef.current.has(entry.id)) {
        notifiedRef.current.add(entry.id);
        if (soundEnabled) playAlertSound();
        if (notificationsEnabled && typeof Notification !== "undefined") {
          new Notification("📞 Ligação em instantes", {
            body: `${entry.leadName || "Lead"} - ${formatPhone(entry.leadPhone)}`,
            tag: entry.id,
          });
        }
      }
    });
  }, [entries, soundEnabled, notificationsEnabled]);

  // Reset page and selection on filter change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [statusFilter, campaignFilter, searchQuery, itemsPerPage]);

  // Sorted entries
  const sortedEntries = useMemo(() => sortByPriority(isQueueTab ? [] : entries), [entries, isQueueTab]);

  // Pagination
  const totalPages = Math.ceil(sortedEntries.length / itemsPerPage);
  const paginatedEntries = sortedEntries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Queue pagination
  const queueTotalPages = Math.ceil(queueEntries.length / itemsPerPage);
  const paginatedQueue = queueEntries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Status counts for tabs
  const statusCounts = {
    all: entries.length,
    scheduled: entries.filter(e => getStatusCategory(e.callStatus) === "scheduled").length,
    in_progress: entries.filter(e => getStatusCategory(e.callStatus) === "in_progress").length,
    completed: entries.filter(e => getStatusCategory(e.callStatus) === "completed").length,
    failed: entries.filter(e => getStatusCategory(e.callStatus) === "failed").length,
    cancelled: entries.filter(e => getStatusCategory(e.callStatus) === "cancelled").length,
  };

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

  const openRescheduleDialog = (entry: CallPanelEntry) => {
    setRescheduleEntry(entry);
    const now = new Date();
    setRescheduleDate(format(now, "yyyy-MM-dd"));
    setRescheduleTime(format(new Date(now.getTime() + 30 * 60000), "HH:mm"));
  };

  const openActionDialog = (entry: CallPanelEntry) => {
    setActionEntry(entry);
    setActionNotes("");
  };

  const openEditOperator = (entry: CallPanelEntry) => {
    setEditOperatorEntry(entry);
    setSelectedOperatorId(entry.operatorId || "");
  };

  // Row highlight
  const getRowClass = (entry: CallPanelEntry) => {
    const cat = getStatusCategory(entry.callStatus);
    const timeInfo = getTimeRemaining(entry.scheduledFor);
    if (cat === "in_progress") return "bg-emerald-500/5 border-l-[3px] border-l-emerald-500";
    if (cat === "scheduled" && timeInfo.isUrgent) return "bg-red-500/5 border-l-[3px] border-l-red-500";
    return "border-l-[3px] border-l-transparent";
  };

  const [panelTab, setPanelTab] = useState("calls");

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

      {/* Panel Tabs */}
      <Tabs value={panelTab} onValueChange={setPanelTab}>
        <TabsList>
          <TabsTrigger value="calls" className="gap-2">
            <Phone className="h-4 w-4" /> Ligações
          </TabsTrigger>
          <TabsTrigger value="operators" className="gap-2">
            <Users className="h-4 w-4" /> Operadores
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <SettingsIcon className="h-4 w-4" /> Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="operators" className="mt-6">
          <OperatorsPanel />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <div className="text-center py-12 text-muted-foreground">
            Configurações gerais de telefonia (em breve)
          </div>
        </TabsContent>

        <TabsContent value="calls" className="mt-6">
          <div className="space-y-6">

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard icon={<Clock className="h-5 w-5 text-amber-500" />} label="Agendadas" value={stats.scheduled} />
        <MetricCard icon={<Phone className="h-5 w-5 text-blue-500" />} label="Em Andamento" value={stats.inProgress} />
        <MetricCard icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />} label="Atendidas" value={stats.completed} />
        <MetricCard icon={<XCircle className="h-5 w-5 text-destructive" />} label="Canceladas / Falhas" value={stats.cancelled + stats.failed} />
      </div>

      {/* Filters & Status */}
      <div className="space-y-3">
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
      </div>

      {/* Status Tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList className="w-full flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="all" className="flex-1 min-w-[100px]">Todas ({statusCounts.all})</TabsTrigger>
          <TabsTrigger value="scheduled" className="flex-1 min-w-[100px]">Agendadas ({statusCounts.scheduled})</TabsTrigger>
          <TabsTrigger value="in_progress" className="flex-1 min-w-[100px]">Em Andamento ({statusCounts.in_progress})</TabsTrigger>
          <TabsTrigger value="completed" className="flex-1 min-w-[100px]">Atendidas ({statusCounts.completed})</TabsTrigger>
          <TabsTrigger value="failed" className="flex-1 min-w-[100px]">Falhas ({statusCounts.failed})</TabsTrigger>
          <TabsTrigger value="cancelled" className="flex-1 min-w-[100px]">Canceladas ({statusCounts.cancelled})</TabsTrigger>
          <TabsTrigger value="queue" className="flex-1 min-w-[100px] gap-1">
            <ListOrdered className="h-3.5 w-3.5" /> Fila ({totalWaiting})
          </TabsTrigger>
        </TabsList>
      </Tabs>
      </div>

      {/* Queue List */}
      {isQueueTab ? (
        queueLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando fila...</div>
        ) : paginatedQueue.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Nenhum lead na fila.</div>
        ) : (
          <div className="space-y-3">
            {/* Queue Status Banner */}
            <QueueStatusBanner summary={queueSummary} operators={operators} onRefresh={handleRefreshQueue} isRefreshing={isRefreshingQueue} onPauseAll={() => queueSummary.pauseAll()} onResumeAll={() => queueSummary.resumeAll()} isPausingAll={queueSummary.isPausingAll} isResumingAll={queueSummary.isResumingAll} onClearQueue={() => clearQueue(campaignFilter)} isClearingQueue={isClearingQueue} totalWaiting={totalWaiting} />
            {paginatedQueue.map((qe) => (
              <QueueCard key={qe.id} entry={qe} onRemove={removeFromQueue} />
            ))}
          </div>
        )
      ) : (
        /* Call Table */
        isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando ligações...</div>
        ) : paginatedEntries.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Nenhuma ligação encontrada.</div>
        ) : (
          <TooltipProvider>
            {/* Bulk Actions Bar */}
            {selectedIds.size > 0 && (
              <div className="sticky top-0 z-10 bg-primary text-primary-foreground rounded-lg px-4 py-3 flex items-center justify-between gap-4 mb-3">
                <span className="text-sm font-medium">☑️ {selectedIds.size} selecionadas</span>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => {
                    const firstSelected = paginatedEntries.find(e => selectedIds.has(e.id));
                    if (firstSelected) openRescheduleDialog(firstSelected);
                  }} className="gap-1">
                    <CalendarClock className="h-3.5 w-3.5" /> Reagendar
                  </Button>
                  <Button size="sm" variant="destructive" onClick={async () => {
                    const toCancel = paginatedEntries.filter(e => selectedIds.has(e.id) && ["scheduled", "ready", "dialing", "ringing"].includes(e.callStatus));
                    for (const e of toCancel) {
                      await cancelCall({ callId: e.id, reason: "Cancelamento em massa" });
                    }
                    setSelectedIds(new Set());
                  }} className="gap-1">
                    <XCircle className="h-3.5 w-3.5" /> Cancelar
                  </Button>
                  <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={bulkDialing} onClick={async () => {
                    const toEnqueue = entries.filter(e => selectedIds.has(e.id) && ["scheduled", "ready"].includes(e.callStatus));
                    if (toEnqueue.length === 0) {
                      toast({ title: "Nenhuma ligação elegível", description: "Selecione ligações com status agendada ou pronta." });
                      return;
                    }
                    setBulkDialing(true);
                    try {
                      await bulkEnqueue({ callIds: toEnqueue.map(e => e.id) });
                    } catch { /* handled by mutation */ }
                    setBulkDialing(false);
                    setSelectedIds(new Set());
                  }}>
                    <Phone className="h-3.5 w-3.5" /> {bulkDialing ? "Enfileirando..." : "Discar"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    setBulkOperatorId("auto");
                    setBulkOperatorOpen(true);
                  }} className="gap-1 bg-white/10 text-primary-foreground border-primary-foreground/30 hover:bg-white/20">
                    <Headset className="h-3.5 w-3.5" /> Operador
                  </Button>
                  <Button size="sm" variant="secondary" onClick={async () => {
                    const toRevert = paginatedEntries.filter(e => selectedIds.has(e.id) && ["dialing", "ringing"].includes(e.callStatus));
                    if (toRevert.length === 0) {
                      toast({ title: "Nenhuma chamada elegível", description: "Selecione chamadas com status 'Discando'." });
                      return;
                    }
                    await bulkUpdateOperator({ callIds: toRevert.map(e => e.id), operatorId: null });
                    setSelectedIds(new Set());
                    toast({ title: "Revertidas", description: `${toRevert.length} chamadas revertidas para "Agora!".` });
                  }} className="gap-1">
                    <RefreshCw className="h-3.5 w-3.5" /> Reverter para Agora!
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} className="text-primary-foreground hover:text-primary-foreground/80">
                    Limpar
                  </Button>
                </div>
              </div>
            )}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={paginatedEntries.length > 0 && paginatedEntries.every(e => selectedIds.has(e.id))}
                        onCheckedChange={(checked) => {
                          const next = new Set(selectedIds);
                          if (checked) {
                            paginatedEntries.forEach(e => next.add(e.id));
                          } else {
                            paginatedEntries.forEach(e => next.delete(e.id));
                          }
                          setSelectedIds(next);
                        }}
                      />
                    </TableHead>
                    <TableHead className="w-[70px]">Entrada</TableHead>
                    <TableHead className="w-[110px]">Status</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead className="hidden md:table-cell w-[140px]">Telefone</TableHead>
                    <TableHead className="hidden lg:table-cell w-[180px]">Campanha</TableHead>
                    <TableHead className="hidden md:table-cell w-[80px]">Tentativa</TableHead>
                    <TableHead className="hidden md:table-cell w-[100px]">Operador</TableHead>
                    <TableHead className="hidden md:table-cell w-[80px]">Timer</TableHead>
                    <TableHead className="w-[90px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEntries.map((entry) => {
                    const category = getStatusCategory(entry.callStatus);
                    const timeInfo = getTimeRemaining(entry.scheduledFor);
                    const isScheduledOrReady = ["scheduled", "ready"].includes(entry.callStatus);

                    return (
                      <TableRow key={entry.id} className={cn(getRowClass(entry), "transition-colors")}>
                        {/* Checkbox */}
                        <TableCell className="py-2">
                          <Checkbox
                            checked={selectedIds.has(entry.id)}
                            onCheckedChange={(checked) => {
                              const next = new Set(selectedIds);
                              if (checked) next.add(entry.id); else next.delete(entry.id);
                              setSelectedIds(next);
                            }}
                          />
                        </TableCell>
                        {/* Entrada */}
                        <TableCell className="text-xs text-muted-foreground font-mono py-2">
                          {format(new Date(entry.createdAt), "HH:mm")}
                        </TableCell>

                        {/* Status */}
                        <TableCell className="py-2">
                          <StatusBadgeCell entry={entry} />
                        </TableCell>

                        {/* Lead */}
                        <TableCell className="py-2">
                          <span className="text-sm font-medium truncate block max-w-[150px]">
                            {entry.leadName || "Sem nome"}
                          </span>
                        </TableCell>

                        {/* Telefone */}
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground py-2">
                          {formatPhone(entry.leadPhone)}
                        </TableCell>

                        {/* Campanha */}
                        <TableCell className="hidden lg:table-cell py-2">
                          <span className="text-xs text-muted-foreground truncate block max-w-[160px] flex items-center gap-1">
                            {entry.isPriority && <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />}
                            {entry.campaignName || "—"}
                          </span>
                        </TableCell>

                        {/* Tentativa */}
                        <TableCell className="hidden md:table-cell py-2">
                          {entry.maxAttempts > 1 ? (
                            <span className={cn(
                              "text-xs font-mono font-medium",
                              entry.attemptNumber >= entry.maxAttempts
                                ? "text-destructive"
                                : "text-muted-foreground"
                            )}>
                              {entry.attemptNumber}/{entry.maxAttempts}
                              {entry.attemptNumber >= entry.maxAttempts && " ❌"}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        {/* Operador */}
                        <TableCell className="hidden md:table-cell py-2">
                          {entry.operatorName && !["scheduled", "ready", "waiting_operator"].includes(entry.callStatus) ? (
                            <span className="text-xs truncate block max-w-[90px]">{entry.operatorName}</span>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Bot className="h-3 w-3" /> Auto
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>Operador será atribuído automaticamente</TooltipContent>
                            </Tooltip>
                          )}
                        </TableCell>

                        {/* Timer */}
                        <TableCell className="hidden md:table-cell py-2">
                          <TimerCell entry={entry} />
                        </TableCell>

                        {/* Ações */}
                        <TableCell className="text-right py-2">
                          <div className="flex items-center justify-end gap-1">
                            {/* Primary action button */}
                            {(category === "scheduled") && (
                              <Button
                                size="icon"
                                className="h-7 w-7 bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => dialNow(entry.id)}
                                title="Ligar agora"
                              >
                                <Phone className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {category === "in_progress" && (
                              <Button
                                size="icon"
                                className="h-7 w-7 bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={() => openActionDialog(entry)}
                                title="Registrar ação"
                              >
                                <Target className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {category === "completed" && (
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => openActionDialog(entry)}
                                title="Ver detalhes"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            )}
{category === "failed" && (
                              <Button
                                size="icon"
                                className="h-7 w-7 bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => dialNow(entry.id)}
                                title="Ligar novamente"
                              >
                                <Phone className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {(category === "cancelled" || category === "failed") && (
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => openActionDialog(entry)}
                                title="Ver detalhes"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            )}

                            {/* Dropdown menu */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreHorizontal className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openActionDialog(entry)}>
                                  <Eye className="h-4 w-4 mr-2" /> Ver detalhes
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => openRescheduleDialog(entry)}>
                                  <CalendarClock className="h-4 w-4 mr-2" /> Reagendar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => delayCall({ callId: entry.id, minutes: 10 })}>
                                  <Plus className="h-4 w-4 mr-2" /> +10 min
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => delayCall({ callId: entry.id, minutes: 30 })}>
                                  <Plus className="h-4 w-4 mr-2" /> +30 min
                                </DropdownMenuItem>
                                {isScheduledOrReady && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => openEditOperator(entry)}>
                                      <Headset className="h-4 w-4 mr-2" /> Trocar operador
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setCancelEntry(entry)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <XCircle className="h-4 w-4 mr-2" /> Cancelar ligação
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TooltipProvider>
        )
      )}

      {/* Pagination */}
      {(() => {
        const pages = isQueueTab ? queueTotalPages : totalPages;
        const totalItems = isQueueTab ? queueEntries.length : sortedEntries.length;
        const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
        const endItem = Math.min(currentPage * itemsPerPage, totalItems);
        if (pages <= 1 && totalItems <= 25) return null;
        return (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Itens por página:</span>
              <Select value={itemsPerPage.toString()} onValueChange={(v) => setItemsPerPage(Number(v))}>
                <SelectTrigger className="w-20 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-muted-foreground">
                ({startItem}-{endItem} de {totalItems})
              </span>
            </div>
            {pages > 1 && (
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                </Button>
                <span className="text-sm text-muted-foreground">Página {currentPage} de {pages}</span>
                <Button variant="outline" size="sm" disabled={currentPage === pages} onClick={() => setCurrentPage((p) => p + 1)}>
                  Próxima <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        );
      })()}

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
          onReschedule={(e) => {
            setActionEntry(null);
            openRescheduleDialog(e);
          }}
        />
      )}

      {/* Edit Operator Dialog */}
      <EditOperatorDialog
        entry={editOperatorEntry}
        selectedOperatorId={selectedOperatorId}
        onSelectedChange={setSelectedOperatorId}
        onClose={() => setEditOperatorEntry(null)}
        onConfirm={async () => {
          if (!editOperatorEntry || !selectedOperatorId) return;
          await updateOperator({ callId: editOperatorEntry.id, operatorId: selectedOperatorId });
          setEditOperatorEntry(null);
        }}
      />

      {/* Bulk Operator Dialog */}
      <BulkOperatorDialog
        open={bulkOperatorOpen}
        selectedOperatorId={bulkOperatorId}
        onSelectedChange={setBulkOperatorId}
        onClose={() => setBulkOperatorOpen(false)}
        onConfirm={async () => {
          const toUpdate = entries.filter(e => selectedIds.has(e.id) && ["scheduled", "ready", "dialing", "ringing"].includes(e.callStatus));
          if (toUpdate.length === 0) return;
          const opId = bulkOperatorId === "auto" ? null : bulkOperatorId;
          await bulkUpdateOperator({ callIds: toUpdate.map(e => e.id), operatorId: opId });
          setBulkOperatorOpen(false);
          setSelectedIds(new Set());
        }}
      />
          </div>
        </TabsContent>
      </Tabs>
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

// ── Action Dialog ──

function ActionDialog({
  entry,
  notes,
  onNotesChange,
  onClose,
  onSelect,
  onReschedule,
}: {
  entry: CallPanelEntry;
  notes: string;
  onNotesChange: (v: string) => void;
  onClose: () => void;
  onSelect: (actionId: string) => Promise<void>;
  onReschedule: (entry: CallPanelEntry) => void;
}) {
  const { actions, isLoading } = useCallActions(entry.campaignId || "");
  const [submitting, setSubmitting] = useState(false);
  const hasScript = !!(entry.campaignId && entry.leadId);
  const [activeTab, setActiveTab] = useState(hasScript ? "script" : "action");

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
      <DialogContent className="max-w-2xl">
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

        {entry.audioUrl && (
          <div className="mb-4 rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">🎧 Gravação da chamada</p>
            <audio controls className="w-full h-8" src={entry.audioUrl} preload="none">
              Seu navegador não suporta o player de áudio.
            </audio>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="script" disabled={!hasScript}>
              <FileText className="h-4 w-4 mr-2" />
              Roteiro
            </TabsTrigger>
            <TabsTrigger value="action">
              <Target className="h-4 w-4 mr-2" />
              Ação
            </TabsTrigger>
            <TabsTrigger value="history">
              <Clock className="h-4 w-4 mr-2" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="script" className="mt-4 max-h-[50vh] overflow-y-auto pr-1">
            {hasScript ? (
              <InlineScriptRunner
                campaignId={entry.campaignId!}
                leadId={entry.leadId!}
                onReachEnd={() => setActiveTab("action")}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Roteiro não disponível para esta ligação.
              </div>
            )}
          </TabsContent>

          <TabsContent value="action" className="mt-4">
            <div className="space-y-3 max-h-[50vh] overflow-y-auto">
              <button
                onClick={() => onReschedule(entry)}
                className="w-full text-left rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-3 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span className="font-medium text-sm">Reagendar</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 ml-6">A pessoa não pode falar agora</p>
              </button>

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

            <div className="mt-3">
              <Label className="text-xs">Observações (opcional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder="Notas sobre a ligação..."
                rows={2}
              />
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <LeadCallHistory leadId={entry.leadId} campaignId={entry.campaignId} currentLogId={entry.id} />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Lead Call History ──

function LeadCallHistory({ leadId, campaignId, currentLogId }: { leadId: string | null; campaignId: string | null; currentLogId: string }) {
  const { data: history, isLoading } = useQuery({
    queryKey: ["call-lead-history", leadId, campaignId],
    enabled: !!leadId && !!campaignId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("call_logs")
        .select("*, call_script_actions(name, color), call_operators(operator_name)")
        .eq("lead_id", leadId)
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Array<{
        id: string;
        call_status: string | null;
        created_at: string | null;
        started_at: string | null;
        ended_at: string | null;
        duration_seconds: number | null;
        notes: string | null;
        call_script_actions: { name: string; color: string } | null;
        call_operators: { operator_name: string } | null;
      }>;
    },
  });

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "—";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const getStatusLabel = (status: string | null) => {
    const map: Record<string, string> = {
      scheduled: "Agendada", ready: "Pronta", waiting_operator: "Aguardando Operador", dialing: "Discando", ringing: "Tocando",
      answered: "Atendida", in_progress: "Em Ligação", completed: "Atendida",
      no_answer: "Não Atendeu", busy: "Ocupado", failed: "Falha",
      cancelled: "Cancelada", not_found: "Não Encontrada", voicemail: "Caixa Postal",
      timeout: "Tempo Esgotado",
    };
    return map[status || ""] || status || "—";
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground py-4 text-center">Carregando histórico...</p>;
  }

  if (!history?.length) {
    return <p className="text-sm text-muted-foreground py-4 text-center">Nenhum registro encontrado.</p>;
  }

  return (
    <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
      {history.map((log, idx) => {
        const isCurrent = log.id === currentLogId;
        return (
          <div
            key={log.id}
            className={cn(
              "rounded-lg border p-3 space-y-1",
              isCurrent ? "border-primary bg-primary/5" : "border-border"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={isCurrent ? "default" : "secondary"} className="text-xs">
                  {isCurrent ? "Atual" : `#${history.length - idx}`}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {getStatusLabel(log.call_status)}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                {log.created_at ? format(new Date(log.created_at), "dd/MM/yyyy HH:mm") : "—"}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground ml-1">
              {log.call_operators?.operator_name && (
                <span className="flex items-center gap-1">
                  <Headset className="h-3 w-3" /> {log.call_operators.operator_name}
                </span>
              )}
              {log.duration_seconds != null && log.duration_seconds > 0 && (
                <span className="flex items-center gap-1">
                  <Timer className="h-3 w-3" /> {formatDuration(log.duration_seconds)}
                </span>
              )}
              {log.call_script_actions && (
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: log.call_script_actions.color }} />
                  {log.call_script_actions.name}
                </span>
              )}
            </div>
            {log.notes && (
              <p className="text-xs text-muted-foreground mt-1 ml-1 italic">"{log.notes}"</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Edit Operator Dialog ──

function EditOperatorDialog({
  entry,
  selectedOperatorId,
  onSelectedChange,
  onClose,
  onConfirm,
}: {
  entry: CallPanelEntry | null;
  selectedOperatorId: string;
  onSelectedChange: (id: string) => void;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const { operators, isLoading } = useCallOperators();
  const [submitting, setSubmitting] = useState(false);
  const activeOperators = operators.filter((o) => o.isActive);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!entry} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Trocar Operador</DialogTitle>
          <DialogDescription>
            {entry?.leadName} — {formatPhone(entry?.leadPhone || null)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando operadores...</p>
          ) : activeOperators.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum operador ativo nesta campanha.</p>
          ) : (
            <Select value={selectedOperatorId} onValueChange={onSelectedChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um operador" />
              </SelectTrigger>
              <SelectContent>
                {activeOperators.map((op) => (
                  <SelectItem key={op.id} value={op.id}>
                    {op.operatorName}{op.extension ? ` • R. ${op.extension}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!selectedOperatorId || submitting}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Bulk Operator Dialog ──

function BulkOperatorDialog({
  open,
  selectedOperatorId,
  onSelectedChange,
  onClose,
  onConfirm,
}: {
  open: boolean;
  selectedOperatorId: string;
  onSelectedChange: (id: string) => void;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const { operators, isLoading } = useCallOperators();
  const [submitting, setSubmitting] = useState(false);
  const activeOperators = operators.filter((o) => o.isActive);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Atribuir Operador em Massa</DialogTitle>
          <DialogDescription>
            Selecione o operador para as ligações selecionadas
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando operadores...</p>
          ) : (
            <Select value={selectedOperatorId} onValueChange={onSelectedChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um operador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">
                  <span className="flex items-center gap-2">🤖 Auto (sem operador fixo)</span>
                </SelectItem>
                {activeOperators.map((op) => (
                  <SelectItem key={op.id} value={op.id}>
                    {op.operatorName}{op.extension ? ` • R. ${op.extension}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={submitting}>
            {submitting ? "Aplicando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Queue Card ──

function QueueCard({ entry, onRemove }: { entry: QueuePanelEntry; onRemove: (id: string) => Promise<void> }) {
  const [removing, setRemoving] = useState(false);

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await onRemove(entry.id);
    } finally {
      setRemoving(false);
    }
  };

  const lastResultLabel: Record<string, string> = {
    no_answer: "Não atendeu",
    busy: "Ocupado",
    failed: "Falhou",
    voicemail: "Caixa postal",
  };

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="gap-1 bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                <ListOrdered className="h-3 w-3" /> #{entry.position}
              </Badge>
              {entry.attempts > 0 && (
                <Badge variant="outline" className="text-xs">
                  {entry.attempts} tentativa{entry.attempts > 1 ? "s" : ""}
                </Badge>
              )}
              {entry.lastResult && (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  {lastResultLabel[entry.lastResult] || entry.lastResult}
                </Badge>
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
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRemove}
              disabled={removing}
              className="gap-1 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" /> Remover
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
