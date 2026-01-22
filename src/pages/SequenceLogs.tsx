import { useState } from "react";
import { useLanguage } from "@/i18n";
import { useSequenceLogs, SequenceLog } from "@/hooks/useSequenceLogs";
import { useGroupCampaigns } from "@/hooks/useGroupCampaigns";
import { PageHeader } from "@/components/dispatch/PageHeader";
import { DataTable } from "@/components/dispatch/DataTable";
import { StatusBadge } from "@/components/dispatch/StatusBadge";
import { EmptyState } from "@/components/dispatch/EmptyState";
import { MetricCard } from "@/components/dispatch/MetricCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, Download, Search, Send, CheckCircle, XCircle, Clock, Activity } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const nodeTypeLabels: Record<string, string> = {
  TEXT: "Texto",
  IMAGE: "Imagem",
  VIDEO: "Vídeo",
  AUDIO: "Áudio",
  DOCUMENT: "Documento",
  STICKER: "Sticker",
  BUTTONS: "Botões",
  LIST: "Lista",
  DELAY: "Delay",
  CONTACT: "Contato",
  LOCATION: "Localização",
  POLL: "Enquete",
  text: "Texto",
  image: "Imagem",
  video: "Vídeo",
  audio: "Áudio",
  document: "Documento",
  sticker: "Sticker",
  buttons: "Botões",
  list: "Lista",
  delay: "Delay",
  contact: "Contato",
  location: "Localização",
  poll: "Enquete",
};

type ValidStatus = "sent" | "sending" | "failed" | "pending";

const mapStatus = (status: string): ValidStatus => {
  if (status === "sent" || status === "sending" || status === "failed" || status === "pending") {
    return status;
  }
  return "pending";
};

export default function SequenceLogs() {
  const { t } = useLanguage();
  const { logs, isLoading, refetch } = useSequenceLogs();
  const { campaigns } = useGroupCampaigns();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<SequenceLog | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      !searchQuery ||
      log.campaignName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.groupName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.nodeType?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || log.status === statusFilter;
    const matchesCampaign = campaignFilter === "all" || log.groupCampaignId === campaignFilter;

    return matchesSearch && matchesStatus && matchesCampaign;
  });

  // Stats
  const totalLogs = logs.length;
  const sentCount = logs.filter((l) => l.status === "sent").length;
  const sendingCount = logs.filter((l) => l.status === "sending").length;
  const failedCount = logs.filter((l) => l.status === "failed").length;
  const avgResponseTime = logs.filter((l) => l.responseTimeMs).length > 0
    ? Math.round(logs.filter((l) => l.responseTimeMs).reduce((acc, l) => acc + (l.responseTimeMs || 0), 0) / logs.filter((l) => l.responseTimeMs).length)
    : 0;

  const handleRefresh = () => {
    refetch();
    toast.success("Logs atualizados");
  };

  const handleExport = () => {
    const headers = ["Timestamp", "Campanha", "Grupo", "Tipo", "Status", "Tempo (ms)", "Erro"];
    const csvContent = [
      headers.join(","),
      ...filteredLogs.map((log) =>
        [
          log.sentAt,
          log.campaignName || "-",
          log.groupName || "-",
          log.nodeType || "-",
          log.status,
          log.responseTimeMs || "-",
          log.errorMessage || "-",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sequence-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Logs exportados");
  };

  const handleRowClick = (log: SequenceLog) => {
    setSelectedLog(log);
    setShowDetailDialog(true);
  };

  const columns = [
    {
      key: "sentAt",
      header: "Timestamp",
      render: (log: SequenceLog) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(log.sentAt), "dd/MM HH:mm:ss")}
        </span>
      ),
    },
    {
      key: "campaignName",
      header: "Campanha",
      render: (log: SequenceLog) => (
        <span className="font-medium">{log.campaignName || "-"}</span>
      ),
    },
    {
      key: "groupName",
      header: "Grupo",
      render: (log: SequenceLog) => (
        <span className="text-sm">{log.groupName || "-"}</span>
      ),
    },
    {
      key: "nodeType",
      header: "Tipo",
      render: (log: SequenceLog) => (
        <Badge variant="outline" className="text-xs">
          {nodeTypeLabels[log.nodeType || ""] || log.nodeType || "-"}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (log: SequenceLog) => (
        <StatusBadge
          status={mapStatus(log.status)}
          showDot
        />
      ),
    },
    {
      key: "responseTimeMs",
      header: "Tempo",
      render: (log: SequenceLog) => (
        <span className="text-sm text-muted-foreground">
          {log.responseTimeMs ? `${log.responseTimeMs}ms` : "-"}
        </span>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Logs de Envio"
        description="Monitore todos os envios de mensagens e sequências"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <MetricCard
          title="Total"
          value={totalLogs}
          icon={Activity}
        />
        <MetricCard
          title="Enviados"
          value={sentCount}
          icon={CheckCircle}
        />
        <MetricCard
          title="Enviando"
          value={sendingCount}
          icon={Send}
        />
        <MetricCard
          title="Falhas"
          value={failedCount}
          icon={XCircle}
        />
        <MetricCard
          title="Tempo Médio"
          value={`${avgResponseTime}ms`}
          icon={Clock}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por campanha, grupo ou tipo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={campaignFilter} onValueChange={setCampaignFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Campanha" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as campanhas</SelectItem>
            {campaigns?.map((campaign) => (
              <SelectItem key={campaign.id} value={campaign.id}>
                {campaign.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="sent">Enviado</SelectItem>
            <SelectItem value="sending">Enviando</SelectItem>
            <SelectItem value="failed">Falha</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filteredLogs.length === 0 ? (
        <EmptyState
          title="Nenhum log encontrado"
          description="Os logs de envio aparecerão aqui quando você enviar mensagens"
          icon={Activity}
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredLogs}
          keyExtractor={(log) => log.id}
          onRowClick={handleRowClick}
        />
      )}

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Envio</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Timestamp</p>
                    <p className="font-medium">
                      {format(new Date(selectedLog.sentAt), "dd/MM/yyyy HH:mm:ss")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <StatusBadge
                      status={mapStatus(selectedLog.status)}
                      showDot
                    />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Campanha</p>
                    <p className="font-medium">{selectedLog.campaignName || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Grupo</p>
                    <p className="font-medium">{selectedLog.groupName || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo de Node</p>
                    <Badge variant="outline">
                      {nodeTypeLabels[selectedLog.nodeType || ""] || selectedLog.nodeType || "-"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tempo de Resposta</p>
                    <p className="font-medium">
                      {selectedLog.responseTimeMs ? `${selectedLog.responseTimeMs}ms` : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Instância</p>
                    <p className="font-medium">{selectedLog.instanceName || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Group JID</p>
                    <p className="font-mono text-xs">{selectedLog.groupJid || "-"}</p>
                  </div>
                </div>

                {selectedLog.errorMessage && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Erro</p>
                    <p className="text-sm text-destructive">{selectedLog.errorMessage}</p>
                  </div>
                )}

                {selectedLog.payload && Object.keys(selectedLog.payload).length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Payload</p>
                    <pre className="p-3 bg-muted rounded-lg text-xs overflow-auto max-h-48">
                      {JSON.stringify(selectedLog.payload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
