import { useState } from "react";
import { PageHeader, StatusBadge, DataTable, EmptyState, type Column } from "@/components/dispatch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Search, Download, ChevronDown, ChevronRight, RefreshCw, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useDispatchLogs, type DispatchLog } from "@/hooks/useDispatchLogs";
import { Skeleton } from "@/components/ui/skeleton";

export default function DispatchLogs() {
  const { toast } = useToast();
  const { logs, isLoading, refetch } = useDispatchLogs();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<DispatchLog | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.campaign.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.recipient.includes(searchQuery) ||
      log.number.includes(searchQuery);
    const matchesStatus = statusFilter === "all" || log.status === statusFilter;
    const matchesChannel = channelFilter === "all" || log.channel === channelFilter;
    return matchesSearch && matchesStatus && matchesChannel;
  });

  const handleExport = async () => {
    setIsExporting(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    const headers = ["Timestamp", "Campaign", "From", "To", "Provider", "Channel", "Status", "Error"];
    const csvContent = [
      headers.join(","),
      ...filteredLogs.map((log) =>
        [
          log.timestamp,
          `"${log.campaign}"`,
          log.number,
          log.recipient,
          log.provider,
          log.channel,
          log.status,
          log.errorMessage || "",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dispatch-logs-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setIsExporting(false);
    toast({
      title: "Exportação concluída",
      description: `${filteredLogs.length} registros exportados para CSV.`,
    });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
    toast({
      title: "Logs atualizados",
      description: "Os logs de despacho foram atualizados.",
    });
  };

  const handleRowClick = (log: DispatchLog) => {
    setSelectedLog(log);
    setShowDetailDialog(true);
  };

  const columns: Column<DispatchLog>[] = [
    {
      key: "expand",
      header: "",
      render: (log) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            setExpandedRow(expandedRow === log.id ? null : log.id);
          }}
        >
          {expandedRow === log.id ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      ),
      className: "w-10",
    },
    {
      key: "timestamp",
      header: "Timestamp",
      render: (log) => <span className="font-mono text-xs">{log.timestamp}</span>,
    },
    {
      key: "campaign",
      header: "Campanha",
      render: (log) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium">{log.campaign}</span>
          <Badge variant="secondary" className="w-fit text-xs capitalize mt-0.5">
            {log.channel}
          </Badge>
        </div>
      ),
    },
    {
      key: "number",
      header: "De",
      render: (log) => <span className="font-mono text-sm">{log.number}</span>,
    },
    {
      key: "recipient",
      header: "Para",
      render: (log) => <span className="font-mono text-sm">{log.recipient}</span>,
    },
    {
      key: "provider",
      header: "Provedor",
      render: (log) => (
        <Badge variant="outline" className="font-normal">
          {log.provider}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (log) => <StatusBadge status={log.status} />,
    },
  ];

  const stats = {
    total: logs.length,
    sent: logs.filter((l) => l.status === "sent").length,
    pending: logs.filter((l) => l.status === "pending").length,
    failed: logs.filter((l) => l.status === "failed" || l.status === "retrying").length,
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <PageHeader title="Logs de Despacho" description="Monitoramento em tempo real de todas as atividades de despacho" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-full max-w-md" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Logs de Despacho"
        description="Monitoramento em tempo real de todas as atividades de despacho"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="outline" className="gap-2" onClick={handleExport} disabled={isExporting || logs.length === 0}>
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isExporting ? "Exportando..." : "Exportar"}
            </Button>
          </div>
        }
      />

      {logs.length > 0 && (
        <>
          {/* Quick Stats */}
          <div className="flex gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-mono font-semibold">{stats.total}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-success" />
              <span className="text-muted-foreground">Enviados:</span>
              <span className="font-mono font-semibold">{stats.sent}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-muted-foreground" />
              <span className="text-muted-foreground">Pendentes:</span>
              <span className="font-mono font-semibold">{stats.pending}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-error" />
              <span className="text-muted-foreground">Falhas:</span>
              <span className="font-mono font-semibold">{stats.failed}</span>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por campanha, número ou destinatário..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="sent">Enviado</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="failed">Falhou</SelectItem>
                <SelectItem value="retrying">Tentando</SelectItem>
              </SelectContent>
            </Select>
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Canal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="voice">Voice/URA</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {/* Data Table */}
      {filteredLogs.length > 0 ? (
        <DataTable
          columns={columns}
          data={filteredLogs}
          keyExtractor={(log) => log.id}
          onRowClick={handleRowClick}
        />
      ) : (
        <EmptyState
          icon={FileText}
          title="Nenhum log encontrado"
          description="Os logs de despacho aparecerão aqui quando as campanhas começarem a rodar"
        />
      )}

      {/* Log Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Despacho</DialogTitle>
            <DialogDescription>Informações completas sobre este evento de despacho</DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <StatusBadge status={selectedLog.status} size="lg" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Timestamp</p>
                  <p className="font-mono text-sm">{selectedLog.timestamp}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Campanha</p>
                  <p className="font-medium">{selectedLog.campaign}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Canal</p>
                  <p className="font-medium capitalize">{selectedLog.channel}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">De</p>
                  <p className="font-mono text-sm">{selectedLog.number}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Para</p>
                  <p className="font-mono text-sm">{selectedLog.recipient}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Provedor</p>
                  <p className="font-medium">{selectedLog.provider}</p>
                </div>
              </div>
              {selectedLog.errorMessage && (
                <div className="rounded-lg border border-error/30 bg-error/10 p-3">
                  <p className="text-sm font-medium text-error">Erro</p>
                  <p className="text-sm text-muted-foreground">{selectedLog.errorMessage}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
