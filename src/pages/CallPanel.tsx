import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { Checkbox } from "@/components/ui/checkbox";
import { useCallPanel, CallPanelEntry } from "@/hooks/useCallPanel";
import { useCallCampaigns } from "@/hooks/useCallCampaigns";
import { useCallActions, CallAction } from "@/hooks/useCallActions";
import { useCallQueuePanel, QueuePanelEntry } from "@/hooks/useCallQueuePanel";
import { useQueueExecutionData } from "@/hooks/useQueueExecution";
import { useCallOperators } from "@/hooks/useCallOperators";
import { OperatorsPanel } from "@/components/call-panel/OperatorsPanel";
import { CallPopup } from "@/components/operator/CallPopup";
import { Users, Settings as SettingsIcon, Copy, CalendarIcon, History } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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
  ChevronsDown,
  ChevronsUp,
  ListOrdered,
  Trash2,
  Eye,
  RefreshCw,
  MoreHorizontal,
  Bot,
  Star,
} from "lucide-react";
import { cn, formatPhone } from "@/lib/utils";
import { format } from "date-fns";

// ── Helpers ──


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

// (sortByPriority removed — chronological sort applied inline)

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

// ── History Status Badge ──

function HistoryStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    completed: { label: "✅ Atendida", className: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800" },
    no_answer: { label: "📵 N/Atendeu", className: "text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800" },
    busy: { label: "🔴 Ocupado", className: "text-red-600 bg-red-50 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800" },
    voicemail: { label: "📬 Cx. Postal", className: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800" },
    failed: { label: "❌ Falhou", className: "text-red-600 bg-red-50 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800" },
    cancelled: { label: "⛔ Cancelada", className: "text-muted-foreground bg-muted border-border" },
    timeout: { label: "⏱️ Timeout", className: "text-muted-foreground bg-muted border-border" },
    max_attempts_exceeded: { label: "🚫 Esgotado", className: "text-red-800 bg-red-100 border-red-300 dark:bg-red-950 dark:text-red-400 dark:border-red-800" },
  };
  const cfg = map[status] || { label: status, className: "text-muted-foreground" };
  return (
    <Badge variant="outline" className={cn("gap-1 text-xs whitespace-nowrap", cfg.className)}>
      {cfg.label}
    </Badge>
  );
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

// ── Agora Action Bar ──

function AgoraActionBar({ entries, queueSummary, bulkEnqueue, bulkDialing, setBulkDialing }: {
  entries: CallPanelEntry[];
  queueSummary: import("@/hooks/useQueueExecution").QueueExecutionSummary;
  bulkEnqueue: (params: { callIds: string[]; operatorId?: string }) => Promise<any>;
  bulkDialing: boolean;
  setBulkDialing: (v: boolean) => void;
}) {
  const { toast } = useToast();

  const agoraEntries = useMemo(() =>
    entries.filter(e =>
      ["scheduled", "ready"].includes(e.callStatus) &&
      getTimeRemaining(e.scheduledFor).isUrgent
    ),
    [entries]
  );

  const { globalStatus, isPausingAll, isResumingAll, pauseAll, resumeAll } = queueSummary;
  const isQueueActive = globalStatus === "running" || globalStatus === "mixed";
  const isQueuePaused = globalStatus === "paused";
  const hasAgora = agoraEntries.length > 0;

  if (!hasAgora && !isQueueActive && !isQueuePaused) return null;

  const handleDiscarAgora = async () => {
    if (agoraEntries.length === 0) return;
    setBulkDialing(true);
    try {
      await bulkEnqueue({ callIds: agoraEntries.map(e => e.id) });
      toast({ title: "Chamadas enfileiradas", description: `${agoraEntries.length} chamada(s) enviada(s) para a fila.` });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setBulkDialing(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {isQueueActive ? (
        <Button
          onClick={() => pauseAll()}
          disabled={isPausingAll}
          className="gap-2 bg-amber-500 hover:bg-amber-600 text-white"
        >
          <Pause className="h-4 w-4" />
          {isPausingAll ? "Pausando..." : "Pausar Fila"}
        </Button>
      ) : isQueuePaused ? (
        <Button
          onClick={() => resumeAll()}
          disabled={isResumingAll}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Play className="h-4 w-4" />
          {isResumingAll ? "Retomando..." : "Retomar Fila"}
        </Button>
      ) : null}

      {hasAgora && !isQueueActive && (
        <Button
          onClick={handleDiscarAgora}
          disabled={bulkDialing}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Play className="h-4 w-4" />
          {bulkDialing ? "Enfileirando..." : `Discar AGORA! (${agoraEntries.length})`}
        </Button>
      )}

      {hasAgora && isQueueActive && (
        <Badge variant="secondary" className="gap-1 text-xs">
          <Target className="h-3 w-3" />
          {agoraEntries.length} AGORA! na fila
        </Badge>
      )}
    </div>
  );
}

// ── Main Component ──

export default function CallPanel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<string>(() =>
    searchParams.get("tab") === "queue" ? "queue" : "all"
  );
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [statusDropdownFilter, setStatusDropdownFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
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

  const { entries: queueEntries, isLoading: queueLoading, totalWaiting, removeFromQueue, clearQueue, isClearingQueue, sendToEndOfQueue, sendToStartOfQueue } = useCallQueuePanel(
    campaignFilter !== "all" ? campaignFilter : undefined,
    searchQuery || undefined
  );
  const queueSummary = useQueueExecutionData();
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
  }, [statusFilter, campaignFilter, searchQuery, itemsPerPage, statusDropdownFilter, dateFrom, dateTo]);

  // Sorted entries (with client-side status dropdown and date filters)
  const sortedEntries = useMemo(() => {
    if (isQueueTab || statusFilter === "history") return [];

    let filtered = [...entries];

    // Apply status dropdown filter
    if (statusDropdownFilter !== "all") {
      const statusMap: Record<string, string[]> = {
        scheduled: ["scheduled", "ready"],
        agora: [], // special: filter by time
        in_progress: ["dialing", "ringing", "answered", "in_progress"],
        completed: ["completed"],
        no_answer: ["no_answer"],
        rescheduled: ["scheduled"], // will further filter by rescheduled logic
        waiting_operator: ["waiting_operator"],
      };
      if (statusDropdownFilter === "agora") {
        filtered = filtered.filter(e =>
          ["scheduled", "ready"].includes(e.callStatus) &&
          getTimeRemaining(e.scheduledFor).isUrgent
        );
      } else {
        const allowed = statusMap[statusDropdownFilter] || [statusDropdownFilter];
        filtered = filtered.filter(e => allowed.includes(e.callStatus));
      }
    }

    // Apply date range filter
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      filtered = filtered.filter(e => new Date(e.createdAt) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter(e => new Date(e.createdAt) <= to);
    }

    const getPriority = (s: string) => {
      if (['dialing', 'ringing', 'in_progress'].includes(s)) return 0;
      if (['ready', 'scheduled', 'waiting_operator'].includes(s)) return 1;
      return 2;
    };

    return filtered.sort((a, b) => {
      const pa = getPriority(a.callStatus);
      const pb = getPriority(b.callStatus);
      if (pa !== pb) return pa - pb;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [entries, isQueueTab, statusFilter, statusDropdownFilter, dateFrom, dateTo]);

  // Pagination
  const totalPages = Math.ceil(sortedEntries.length / itemsPerPage);
  const paginatedEntries = sortedEntries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Queue pagination
  const queueTotalPages = Math.ceil(queueEntries.length / itemsPerPage);
  const paginatedQueue = queueEntries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // History query
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const HISTORY_STATUSES = ["completed", "no_answer", "busy", "voicemail", "failed", "cancelled", "timeout", "max_attempts_exceeded"];
  
  const { data: historyEntries = [], isLoading: historyLoading } = useQuery({
    queryKey: ["call_panel_history", campaignFilter, searchQuery, dateFrom?.toISOString(), dateTo?.toISOString(), activeCompanyId],
    queryFn: async () => {
      let query = (supabase as any)
        .from("call_logs")
        .select("*, call_leads(name, phone, attempts), call_campaigns(name, is_priority), call_operators(operator_name, extension)")
        .in("call_status", HISTORY_STATUSES)
        .order("ended_at", { ascending: false, nullsFirst: false })
        .limit(500);

      if (activeCompanyId) query = query.eq("company_id", activeCompanyId);
      if (campaignFilter !== "all") query = query.eq("campaign_id", campaignFilter);
      if (dateFrom) {
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        query = query.gte("created_at", from.toISOString());
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        query = query.lte("created_at", to.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      let results = (data || []).map((db: any) => ({
        id: db.id,
        campaignId: db.campaign_id,
        campaignName: db.call_campaigns?.name || null,
        leadId: db.lead_id,
        leadName: db.call_leads?.name || null,
        leadPhone: db.call_leads?.phone || null,
        operatorId: db.operator_id,
        operatorName: db.call_operators?.operator_name || null,
        callStatus: db.call_status || "unknown",
        createdAt: db.created_at || new Date().toISOString(),
        endedAt: db.ended_at,
        startedAt: db.started_at,
        durationSeconds: db.duration_seconds,
        isPriority: db.call_campaigns?.is_priority ?? false,
      }));

      if (searchQuery) {
        const s = searchQuery.toLowerCase();
        const sDigits = s.replace(/\D/g, "");
        results = results.filter((e: any) => {
          const nameMatch = e.leadName?.toLowerCase().includes(s);
          const phoneDigits = (e.leadPhone || "").replace(/\D/g, "");
          const phoneMatch = sDigits ? phoneDigits.includes(sDigits) : false;
          return nameMatch || phoneMatch;
        });
      }

      return results;
    },
    enabled: !!user && statusFilter === "history",
    refetchInterval: 10000,
  });

  // History pagination
  const historyTotalPages = Math.ceil(historyEntries.length / itemsPerPage);
  const paginatedHistory = historyEntries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
    setActionNotes(entry.observations || "");
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

  useEffect(() => {
    if (searchParams.get("tab")) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("tab");
      setSearchParams(newParams, { replace: true });
    }
  }, []);

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

      {/* Embedded Operator Popup */}
      <CallPopup embedded />

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

      {/* Queue Status Banner (visible in Calls tab) */}
      {queueSummary.globalStatus !== "stopped" && (
        <QueueStatusBanner summary={queueSummary} operators={operators} onRefresh={handleRefreshQueue} isRefreshing={isRefreshingQueue} onPauseAll={() => queueSummary.pauseAll()} onResumeAll={() => queueSummary.resumeAll()} isPausingAll={queueSummary.isPausingAll} isResumingAll={queueSummary.isResumingAll} onClearQueue={() => clearQueue(campaignFilter)} isClearingQueue={isClearingQueue} totalWaiting={totalWaiting} />
      )}

      {/* Discar AGORA! / Pausar / Retomar button */}
      <AgoraActionBar
        entries={entries}
        queueSummary={queueSummary}
        bulkEnqueue={bulkEnqueue}
        bulkDialing={bulkDialing}
        setBulkDialing={setBulkDialing}
      />

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
        <Select value={statusDropdownFilter} onValueChange={setStatusDropdownFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="scheduled">🟢 Agendada</SelectItem>
            <SelectItem value="agora">🔴 AGORA!</SelectItem>
            <SelectItem value="in_progress">📞 Em Andamento</SelectItem>
            <SelectItem value="completed">✅ Atendida</SelectItem>
            <SelectItem value="no_answer">📵 Não Atendeu</SelectItem>
            <SelectItem value="rescheduled">🔄 Reagendada</SelectItem>
            <SelectItem value="waiting_operator">⏳ Aguardando Operador</SelectItem>
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-[260px] justify-start text-left font-normal", !dateFrom && !dateTo && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFrom && dateTo
                ? `${format(dateFrom, "dd/MM/yyyy")} — ${format(dateTo, "dd/MM/yyyy")}`
                : dateFrom
                ? `${format(dateFrom, "dd/MM/yyyy")} — ...`
                : "📅 Filtrar período"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-3 space-y-3">
              <div className="flex gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Início</Label>
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    className="p-2 pointer-events-auto"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Fim</Label>
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    className="p-2 pointer-events-auto"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button variant="outline" size="sm" onClick={() => { const today = new Date(); setDateFrom(today); setDateTo(today); }}>Hoje</Button>
                <Button variant="outline" size="sm" onClick={() => { const y = new Date(); y.setDate(y.getDate() - 1); setDateFrom(y); setDateTo(y); }}>Ontem</Button>
                <Button variant="outline" size="sm" onClick={() => { const d = new Date(); const w = new Date(); w.setDate(w.getDate() - 7); setDateFrom(w); setDateTo(d); }}>7 dias</Button>
                <Button variant="outline" size="sm" onClick={() => { const d = new Date(); setDateFrom(new Date(d.getFullYear(), d.getMonth(), 1)); setDateTo(d); }}>Este mês</Button>
                <Button variant="ghost" size="sm" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>Limpar</Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Status Tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList className="w-full flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="all" className="flex-1 min-w-[100px]">Todas ({statusCounts.all})</TabsTrigger>
          <TabsTrigger value="scheduled" className="flex-1 min-w-[100px]">Agendadas ({statusCounts.scheduled})</TabsTrigger>
          <TabsTrigger value="in_progress" className="flex-1 min-w-[100px]">Em Andamento ({statusCounts.in_progress})</TabsTrigger>
          <TabsTrigger value="completed" className="flex-1 min-w-[100px]">Atendidas ({statusCounts.completed})</TabsTrigger>
          <TabsTrigger value="history" className="flex-1 min-w-[100px] gap-1">
            <History className="h-3.5 w-3.5" /> Histórico
          </TabsTrigger>
          <TabsTrigger value="queue" className="flex-1 min-w-[100px] gap-1">
            <ListOrdered className="h-3.5 w-3.5" /> Fila ({totalWaiting})
          </TabsTrigger>
        </TabsList>
      </Tabs>
      </div>

      {/* History Tab */}
      {statusFilter === "history" ? (
        historyLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando histórico...</div>
        ) : paginatedHistory.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Nenhum registro no histórico.</div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">Entrada</TableHead>
                  <TableHead className="w-[110px]">Status</TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead className="hidden md:table-cell w-[140px]">Telefone</TableHead>
                  <TableHead className="hidden lg:table-cell w-[180px]">Campanha</TableHead>
                  <TableHead className="hidden md:table-cell w-[80px]">Duração</TableHead>
                  <TableHead className="hidden md:table-cell w-[100px]">Operador</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedHistory.map((entry: any) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-xs text-muted-foreground font-mono py-2">
                      {format(new Date(entry.createdAt), "dd/MM/yyyy HH:mm:ss")}
                    </TableCell>
                    <TableCell className="py-2">
                      <HistoryStatusBadge status={entry.callStatus} />
                    </TableCell>
                    <TableCell className="py-2">
                      <span className="text-sm font-medium truncate block max-w-[150px]">
                        {entry.leadName || "Sem nome"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground py-2">
                      {formatPhone(entry.leadPhone)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell py-2">
                      <span className="text-xs text-muted-foreground truncate block max-w-[160px] flex items-center gap-1">
                        {entry.isPriority && <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />}
                        {entry.campaignName || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell py-2">
                      <span className="text-xs font-mono text-muted-foreground">
                        {entry.durationSeconds != null && entry.durationSeconds > 0
                          ? `${Math.floor(entry.durationSeconds / 60).toString().padStart(2, "0")}:${(entry.durationSeconds % 60).toString().padStart(2, "0")}`
                          : "—"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell py-2">
                      <span className="text-xs truncate block max-w-[90px]">{entry.operatorName || "Auto"}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )
      ) :
      /* Queue List */
      isQueueTab ? (
        queueLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando fila...</div>
        ) : paginatedQueue.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Nenhum lead na fila.</div>
        ) : (
          <div className="space-y-3">
            {/* Queue Status Banner */}
            <QueueStatusBanner summary={queueSummary} operators={operators} onRefresh={handleRefreshQueue} isRefreshing={isRefreshingQueue} onPauseAll={() => queueSummary.pauseAll()} onResumeAll={() => queueSummary.resumeAll()} isPausingAll={queueSummary.isPausingAll} isResumingAll={queueSummary.isResumingAll} onClearQueue={() => clearQueue(campaignFilter)} isClearingQueue={isClearingQueue} totalWaiting={totalWaiting} />
            <div className="rounded-lg border bg-card shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[60px]">#</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead className="hidden md:table-cell">Telefone</TableHead>
                    <TableHead className="hidden lg:table-cell">Campanha</TableHead>
                    <TableHead className="hidden md:table-cell w-[90px]">Tentativas</TableHead>
                    <TableHead className="hidden lg:table-cell">Últ. Resultado</TableHead>
                    <TableHead className="w-[60px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedQueue.map((qe) => {
                    const lastResultLabel: Record<string, string> = {
                      no_answer: "Não atendeu",
                      busy: "Ocupado",
                      failed: "Falhou",
                      voicemail: "Caixa postal",
                    };
                    return (
                      <TableRow key={qe.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground py-2">
                          {qe.position}
                        </TableCell>
                        <TableCell className="py-2">
                          <span className="font-medium text-sm">{qe.leadName || "Sem nome"}</span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground py-2">
                          {formatPhone(qe.leadPhone)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell py-2">
                          <span className="text-xs text-muted-foreground truncate block max-w-[160px]">
                            {qe.campaignName || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-center py-2">
                          <span className="text-xs font-mono">{qe.attempts}</span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell py-2">
                          <span className="text-xs text-muted-foreground">
                            {qe.lastResult ? (lastResultLabel[qe.lastResult] || qe.lastResult) : "—"}
                          </span>
                        </TableCell>
                        <TableCell className="py-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => sendToStartOfQueue({ entryId: qe.id, status: qe.status })}>
                                <ChevronsUp className="h-4 w-4 mr-2" /> Para o início
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => sendToEndOfQueue({ entryId: qe.id, currentAttempts: qe.attempts, status: qe.status })}>
                                <ChevronsDown className="h-4 w-4 mr-2" /> Para o final
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => removeFromQueue(qe.id)}>
                                <Trash2 className="h-4 w-4 mr-2" /> Remover
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
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
                    const toEnqueue = entries.filter(e => selectedIds.has(e.id) && ["scheduled", "ready", "cancelled", "failed"].includes(e.callStatus));
                    if (toEnqueue.length === 0) {
                      toast({ title: "Nenhuma ligação elegível", description: "Selecione ligações com status agendada, pronta, cancelada ou falha." });
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
                    <TableHead className="w-[160px]">Entrada</TableHead>
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
                          {format(new Date(entry.createdAt), "dd/MM/yyyy HH:mm:ss")}
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
                                disabled={entry.maxAttempts > 1 && entry.attemptNumber >= entry.maxAttempts}
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
                                disabled={entry.maxAttempts > 1 && entry.attemptNumber >= entry.maxAttempts}
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
        const isHistoryTab = statusFilter === "history";
        const pages = isHistoryTab ? historyTotalPages : isQueueTab ? queueTotalPages : totalPages;
        const totalItems = isHistoryTab ? historyEntries.length : isQueueTab ? queueEntries.length : sortedEntries.length;
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
          onRescheduleConfirm={async (e, scheduledFor) => {
            await rescheduleCall({ callId: e.id, scheduledFor });
            setActionEntry(null);
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

// ── Action Dialog (Unified 2-tab layout) ──

function ActionDialog({
  entry,
  notes,
  onNotesChange,
  onClose,
  onSelect,
  onRescheduleConfirm,
}: {
  entry: CallPanelEntry;
  notes: string;
  onNotesChange: (v: string) => void;
  onClose: () => void;
  onSelect: (actionId: string) => Promise<void>;
  onRescheduleConfirm: (entry: CallPanelEntry, scheduledFor: string) => Promise<void>;
}) {
  const { actions, isLoading } = useCallActions(entry.campaignId || "");
  const [submitting, setSubmitting] = useState(false);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const hasScript = !!(entry.campaignId && entry.leadId);

  // Inline reschedule state
  const [showReschedule, setShowReschedule] = useState(false);
  const [localDate, setLocalDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [localTime, setLocalTime] = useState(() => format(new Date(Date.now() + 30 * 60000), "HH:mm"));
  const [rescheduling, setRescheduling] = useState(false);

  const handleQuickReschedule = (minutes: number) => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + minutes);
    setLocalDate(format(d, "yyyy-MM-dd"));
    setLocalTime(format(d, "HH:mm"));
  };

  const handleConfirmReschedule = async () => {
    if (!localDate || !localTime) return;
    setRescheduling(true);
    try {
      await onRescheduleConfirm(entry, new Date(`${localDate}T${localTime}`).toISOString());
      onClose();
    } finally {
      setRescheduling(false);
    }
  };

  const handleSave = async () => {
    if (!selectedActionId) return;
    setSubmitting(true);
    try {
      await onSelect(selectedActionId);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Header destacado */}
        <div className="bg-gradient-to-b from-primary/10 to-transparent border-b px-6 py-5 text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-lg font-bold text-primary">
              {(entry.leadName || "L").charAt(0).toUpperCase()}
            </div>
          </div>
          <h2 className="text-2xl font-bold tracking-wide uppercase text-foreground">
            {entry.leadName || "Lead"}
          </h2>
          <p className="text-lg font-mono text-primary">
            📞 {formatPhone(entry.leadPhone)}
          </p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {entry.campaignName && (
              <Badge variant="outline" className="text-xs">📁 {entry.campaignName}</Badge>
            )}
            {entry.attemptNumber != null && (
              <Badge variant="outline" className="text-xs">🔄 x{entry.attemptNumber}/{entry.maxAttempts || "∞"}</Badge>
            )}
            {entry.isPriority && <Badge variant="secondary" className="text-xs">⭐ Prioridade</Badge>}
            {entry.callStatus && (
              <Badge variant="outline" className="text-xs">📡 {entry.callStatus}</Badge>
            )}
          </div>
          {entry.externalCallId && (
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-xs text-muted-foreground font-mono truncate max-w-[280px]">
                🆔 {entry.externalCallId}
              </span>
              <button onClick={() => { navigator.clipboard.writeText(entry.externalCallId!); }} className="hover:text-primary transition-colors">
                <Copy className="h-3 w-3" />
              </button>
            </div>
          )}
          {entry.durationSeconds != null && entry.durationSeconds > 0 && (
            <p className="text-2xl font-semibold font-mono text-emerald-500">
              ⏱️ {Math.floor(entry.durationSeconds / 60).toString().padStart(2, "0")}:{(entry.durationSeconds % 60).toString().padStart(2, "0")}
            </p>
          )}
          {entry.audioUrl && (
            <div className="mt-2 rounded-lg border border-border bg-background/50 p-2 mx-auto max-w-md">
              <p className="text-xs font-medium text-muted-foreground mb-1">🎧 Gravação</p>
              <audio controls className="w-full h-8" src={entry.audioUrl} preload="none">
                Seu navegador não suporta o player de áudio.
              </audio>
            </div>
          )}
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
            <div className="h-[calc(90vh-380px)] overflow-y-auto px-6 py-4">
              <div className="space-y-6">
                {/* Script Section */}
                {hasScript && (
                  <>
                    <div className="space-y-2">
                      <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">📋 Roteiro</span>
                      <div className="rounded-lg border bg-muted/10 p-3">
                        <InlineScriptRunner campaignId={entry.campaignId!} leadId={entry.leadId!} />
                      </div>
                    </div>
                    <div className="border-t" />
                  </>
                )}

                {/* Result Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">🎯 Resultado da Ligação</h3>

                  {/* Inline Reschedule */}
                  <div className={cn(
                    "rounded-lg border transition-all",
                    showReschedule
                      ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40"
                      : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50"
                  )}>
                    <button
                      onClick={() => setShowReschedule(!showReschedule)}
                      className="w-full text-left p-3"
                    >
                      <div className="flex items-center gap-2">
                        <CalendarClock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <span className="font-medium text-sm">Reagendar</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 ml-6">A pessoa não pode falar agora</p>
                    </button>

                    {showReschedule && (
                      <div className="px-3 pb-3 space-y-3 border-t border-amber-200 dark:border-amber-700 pt-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Data</Label>
                            <Input type="date" value={localDate} onChange={(e) => setLocalDate(e.target.value)} className="mt-1" />
                          </div>
                          <div>
                            <Label className="text-xs">Horário</Label>
                            <Input type="time" value={localTime} onChange={(e) => setLocalTime(e.target.value)} className="mt-1" />
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => handleQuickReschedule(10)}>+10 min</Button>
                          <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => handleQuickReschedule(30)}>+30 min</Button>
                          <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => handleQuickReschedule(60)}>+1 hora</Button>
                          <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => {
                            const tomorrow = new Date();
                            tomorrow.setDate(tomorrow.getDate() + 1);
                            setLocalDate(format(tomorrow, "yyyy-MM-dd"));
                          }}>Amanhã</Button>
                        </div>
                        <Button
                          className="w-full gap-1.5"
                          onClick={handleConfirmReschedule}
                          disabled={!localDate || !localTime || rescheduling}
                        >
                          <CalendarClock className="h-4 w-4" />
                          {rescheduling ? "Reagendando..." : "Confirmar Reagendamento"}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Campaign Actions */}
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Qual foi o resultado?</p>
                    {isLoading ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Carregando ações...</p>
                    ) : actions.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-3 bg-muted/20">
                        <p className="text-xs text-muted-foreground">
                          ⚠️ Nenhuma ação configurada para esta campanha. Configure ações na aba de configurações.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {actions.map((action) => (
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
                    )}
                  </div>

                  {/* Notes */}
                  <div>
                    <Label className="text-sm font-medium">📝 Observações (opcional)</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => onNotesChange(e.target.value)}
                      placeholder="Anotações sobre a ligação..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-end gap-2 pt-2 pb-2">
                  <Button variant="outline" onClick={onClose}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={!selectedActionId || submitting}
                  >
                    {submitting ? "Salvando..." : "✅ Salvar e Encerrar"}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="flex-1 min-h-0 mt-0">
            <div className="h-[calc(90vh-380px)] overflow-y-auto px-6 py-4">
              <LeadCallHistory leadId={entry.leadId} campaignId={entry.campaignId} currentLogId={entry.id} />
            </div>
          </TabsContent>
        </Tabs>
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

// QueueCard removed – queue now uses table layout
