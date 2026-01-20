import { useState } from "react";
import { PageHeader, DataTable, EmptyState, type Column } from "@/components/dispatch";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Activity, Search, Download, RefreshCw, Loader2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useApiLogs, type ApiLog } from "@/hooks/useApiLogs";
import { Skeleton } from "@/components/ui/skeleton";

const methodColors: Record<string, string> = {
  GET: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  POST: "bg-success/10 text-success border-success/30",
  PUT: "bg-warning/10 text-warning border-warning/30",
  DELETE: "bg-error/10 text-error border-error/30",
};

const getStatusColor = (code: number): string => {
  if (code >= 200 && code < 300) return "bg-success/10 text-success border-success/30";
  if (code >= 400 && code < 500) return "bg-warning/10 text-warning border-warning/30";
  if (code >= 500) return "bg-error/10 text-error border-error/30";
  return "bg-muted text-muted-foreground";
};

export default function ApiLogs() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const { logs, isLoading, refetch } = useApiLogs();
  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("24h");
  const [selectedLog, setSelectedLog] = useState<ApiLog | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.endpoint.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.ipAddress.includes(searchQuery) ||
      log.apiKeyName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMethod = methodFilter === "all" || log.method === methodFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "success" && log.statusCode >= 200 && log.statusCode < 300) ||
      (statusFilter === "client_error" && log.statusCode >= 400 && log.statusCode < 500) ||
      (statusFilter === "server_error" && log.statusCode >= 500);
    return matchesSearch && matchesMethod && matchesStatus;
  });

  const handleExport = async () => {
    setIsExporting(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const headers = ["Timestamp", "Method", "Endpoint", "Status", "Response Time (ms)", "IP", "API Key", "Error"];
    const csvContent = [
      headers.join(","),
      ...filteredLogs.map((log) =>
        [
          log.timestamp,
          log.method,
          log.endpoint,
          log.statusCode,
          log.responseTime,
          log.ipAddress,
          `"${log.apiKeyName}"`,
          log.errorMessage || "",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `api-logs-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setIsExporting(false);
    toast({
      title: t("apiLogs.logsExported"),
      description: `${filteredLogs.length} logs exportados para CSV.`,
    });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
    toast({
      title: t("apiLogs.logsRefreshed"),
      description: "Logs da API atualizados.",
    });
  };

  const handleRowClick = (log: ApiLog) => {
    setSelectedLog(log);
    setShowDetailDialog(true);
  };

  const columns: Column<ApiLog>[] = [
    {
      key: "timestamp",
      header: "Timestamp",
      render: (log) => <span className="font-mono text-xs">{log.timestamp}</span>,
    },
    {
      key: "method",
      header: t("apiLogs.method"),
      render: (log) => (
        <Badge variant="outline" className={`font-mono font-medium ${methodColors[log.method]}`}>
          {log.method}
        </Badge>
      ),
      className: "w-24",
    },
    {
      key: "endpoint",
      header: "Endpoint",
      render: (log) => <span className="font-mono text-sm">{log.endpoint}</span>,
    },
    {
      key: "statusCode",
      header: "Status",
      render: (log) => (
        <Badge variant="outline" className={`font-mono ${getStatusColor(log.statusCode)}`}>
          {log.statusCode}
        </Badge>
      ),
      className: "w-20",
    },
    {
      key: "responseTime",
      header: t("apiLogs.responseTime"),
      render: (log) => (
        <span className={`font-mono text-sm ${log.responseTime > 1000 ? "text-warning" : ""}`}>
          {log.responseTime}ms
        </span>
      ),
      className: "w-28",
    },
    {
      key: "apiKeyName",
      header: t("apiLogs.apiKey"),
      render: (log) => (
        <Badge variant="secondary" className="font-normal">
          {log.apiKeyName}
        </Badge>
      ),
    },
    {
      key: "ipAddress",
      header: "IP",
      render: (log) => <span className="font-mono text-xs text-muted-foreground">{log.ipAddress}</span>,
    },
  ];

  const stats = {
    total: logs.length,
    success: logs.filter((l) => l.statusCode >= 200 && l.statusCode < 300).length,
    avgResponseTime: logs.length > 0 ? Math.round(logs.reduce((acc, l) => acc + l.responseTime, 0) / logs.length) : 0,
  };

  const successRate = stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0;

  if (isLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <PageHeader title={t("apiLogs.title")} description={t("apiLogs.description")} />
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
        title={t("apiLogs.title")}
        description={t("apiLogs.description")}
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
              {isExporting ? "Exportando..." : t("common.export")}
            </Button>
          </div>
        }
      />

      {/* Retention Info Banner */}
      <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2 text-sm">
        <Clock className="h-4 w-4 text-primary" />
        <span className="text-muted-foreground">{t("apiLogs.retentionInfo")}</span>
      </div>

      {logs.length > 0 && (
        <>
          {/* Quick Stats */}
          <div className="flex gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{t("apiLogs.totalCalls")}:</span>
              <span className="font-mono font-semibold">{stats.total}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-success" />
              <span className="text-muted-foreground">{t("apiLogs.successRate")}:</span>
              <span className="font-mono font-semibold">{successRate}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span className="text-muted-foreground">{t("apiLogs.avgResponseTime")}:</span>
              <span className="font-mono font-semibold">{stats.avgResponseTime}ms</span>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("apiLogs.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={t("apiLogs.allMethods")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("apiLogs.allMethods")}</SelectItem>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t("apiLogs.allStatuses")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("apiLogs.allStatuses")}</SelectItem>
                <SelectItem value="success">2xx (Success)</SelectItem>
                <SelectItem value="client_error">4xx (Client Error)</SelectItem>
                <SelectItem value="server_error">5xx (Server Error)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">{t("apiLogs.lastHour")}</SelectItem>
                <SelectItem value="6h">{t("apiLogs.last6Hours")}</SelectItem>
                <SelectItem value="12h">{t("apiLogs.last12Hours")}</SelectItem>
                <SelectItem value="24h">{t("apiLogs.last24Hours")}</SelectItem>
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
          icon={Activity}
          title={t("apiLogs.noLogs")}
          description={t("apiLogs.noLogsDescription")}
        />
      )}

      {/* Log Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("apiLogs.callDetails")}</DialogTitle>
            <DialogDescription>
              {selectedLog?.method} {selectedLog?.endpoint}
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant="outline" className={`font-mono ${getStatusColor(selectedLog.statusCode)}`}>
                    {selectedLog.statusCode}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Timestamp</p>
                  <p className="font-mono text-sm">{selectedLog.timestamp}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{t("apiLogs.responseTime")}</p>
                  <p className="font-mono text-sm">{selectedLog.responseTime}ms</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">IP Address</p>
                  <p className="font-mono text-sm">{selectedLog.ipAddress}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{t("apiLogs.apiKey")}</p>
                  <Badge variant="secondary">{selectedLog.apiKeyName}</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{t("apiLogs.method")}</p>
                  <Badge variant="outline" className={`font-mono ${methodColors[selectedLog.method]}`}>
                    {selectedLog.method}
                  </Badge>
                </div>
              </div>

              {selectedLog.errorMessage && (
                <div className="rounded-lg border border-error/30 bg-error/10 p-3">
                  <p className="text-sm font-medium text-error">{t("common.error")}</p>
                  <p className="text-sm text-muted-foreground">{selectedLog.errorMessage}</p>
                </div>
              )}

              {selectedLog.requestBody && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t("apiLogs.requestBody")}</p>
                  <ScrollArea className="h-32 rounded-lg border bg-muted/50 p-3">
                    <pre className="text-xs font-mono">
                      {JSON.stringify(selectedLog.requestBody, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              )}

              {selectedLog.responseBody && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t("apiLogs.responseBody")}</p>
                  <ScrollArea className="h-32 rounded-lg border bg-muted/50 p-3">
                    <pre className="text-xs font-mono">
                      {JSON.stringify(selectedLog.responseBody, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
