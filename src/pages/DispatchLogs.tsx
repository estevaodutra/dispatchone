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

// Mock data
interface DispatchLog {
  id: string;
  timestamp: string;
  campaign: string;
  number: string;
  provider: string;
  recipient: string;
  status: "sent" | "pending" | "failed" | "retrying";
  errorMessage?: string;
  channel: "whatsapp" | "voice";
}

const mockLogs: DispatchLog[] = [
  {
    id: "1",
    timestamp: "2025-01-15 14:32:15",
    campaign: "Summer Promo 2025",
    number: "+55 11 98765-4321",
    provider: "Z-API",
    recipient: "+55 11 99999-0001",
    status: "sent",
    channel: "whatsapp",
  },
  {
    id: "2",
    timestamp: "2025-01-15 14:32:14",
    campaign: "Summer Promo 2025",
    number: "+55 11 91234-5678",
    provider: "Evolution API",
    recipient: "+55 11 99999-0002",
    status: "sent",
    channel: "whatsapp",
  },
  {
    id: "3",
    timestamp: "2025-01-15 14:32:13",
    campaign: "Payment Reminder Q1",
    number: "+55 21 98765-1234",
    provider: "Voice/URA",
    recipient: "+55 21 99999-0003",
    status: "pending",
    channel: "voice",
  },
  {
    id: "4",
    timestamp: "2025-01-15 14:32:12",
    campaign: "Summer Promo 2025",
    number: "+55 11 98765-4321",
    provider: "Z-API",
    recipient: "+55 11 99999-0004",
    status: "failed",
    errorMessage: "Rate limit exceeded",
    channel: "whatsapp",
  },
  {
    id: "5",
    timestamp: "2025-01-15 14:32:11",
    campaign: "Summer Promo 2025",
    number: "+55 11 91234-5678",
    provider: "Evolution API",
    recipient: "+55 11 99999-0005",
    status: "retrying",
    errorMessage: "Timeout - Retry attempt 2/3",
    channel: "whatsapp",
  },
  {
    id: "6",
    timestamp: "2025-01-15 14:32:10",
    campaign: "Payment Reminder Q1",
    number: "+55 21 98765-1234",
    provider: "Voice/URA",
    recipient: "+55 21 99999-0006",
    status: "sent",
    channel: "voice",
  },
  {
    id: "7",
    timestamp: "2025-01-15 14:32:09",
    campaign: "Summer Promo 2025",
    number: "+55 11 98765-4321",
    provider: "Z-API",
    recipient: "+55 11 99999-0007",
    status: "sent",
    channel: "whatsapp",
  },
  {
    id: "8",
    timestamp: "2025-01-15 14:32:08",
    campaign: "Summer Promo 2025",
    number: "+55 11 91234-5678",
    provider: "Evolution API",
    recipient: "+55 11 99999-0008",
    status: "sent",
    channel: "whatsapp",
  },
];

export default function DispatchLogs() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<DispatchLog[]>(mockLogs);
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
    
    // Generate CSV content
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

    // Create and download file
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
      title: "Export complete",
      description: `${filteredLogs.length} log entries exported to CSV.`,
    });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsRefreshing(false);
    toast({
      title: "Logs refreshed",
      description: "Dispatch logs have been updated.",
    });
  };

  const handleRetry = (log: DispatchLog) => {
    setLogs((prev) =>
      prev.map((l) => (l.id === log.id ? { ...l, status: "retrying" as const } : l))
    );
    toast({
      title: "Retry initiated",
      description: `Retrying dispatch to ${log.recipient}...`,
    });

    // Simulate successful retry after 2 seconds
    setTimeout(() => {
      setLogs((prev) =>
        prev.map((l) => (l.id === log.id ? { ...l, status: "sent" as const, errorMessage: undefined } : l))
      );
      toast({
        title: "Retry successful",
        description: `Message to ${log.recipient} was sent successfully.`,
      });
    }, 2000);
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
      header: "Campaign",
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
      header: "From",
      render: (log) => <span className="font-mono text-sm">{log.number}</span>,
    },
    {
      key: "recipient",
      header: "To",
      render: (log) => <span className="font-mono text-sm">{log.recipient}</span>,
    },
    {
      key: "provider",
      header: "Provider",
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

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Dispatch Logs"
        description="Real-time monitoring of all dispatch activities"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="outline" className="gap-2" onClick={handleExport} disabled={isExporting}>
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isExporting ? "Exporting..." : "Export"}
            </Button>
          </div>
        }
      />

      {/* Quick Stats */}
      <div className="flex gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Total:</span>
          <span className="font-mono font-semibold">{stats.total}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-success" />
          <span className="text-muted-foreground">Sent:</span>
          <span className="font-mono font-semibold">{stats.sent}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-muted-foreground" />
          <span className="text-muted-foreground">Pending:</span>
          <span className="font-mono font-semibold">{stats.pending}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-error" />
          <span className="text-muted-foreground">Failed:</span>
          <span className="font-mono font-semibold">{stats.failed}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by campaign, number, or recipient..."
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
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="retrying">Retrying</SelectItem>
          </SelectContent>
        </Select>
        <Select value={channelFilter} onValueChange={setChannelFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Channel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Channels</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="voice">Voice/URA</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
          title="No logs found"
          description="Dispatch logs will appear here once campaigns start running"
        />
      )}

      {/* Log Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dispatch Details</DialogTitle>
            <DialogDescription>Full information about this dispatch event</DialogDescription>
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
                  <p className="text-sm text-muted-foreground">Campaign</p>
                  <p className="font-medium">{selectedLog.campaign}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Channel</p>
                  <p className="font-medium capitalize">{selectedLog.channel}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">From</p>
                  <p className="font-mono text-sm">{selectedLog.number}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">To</p>
                  <p className="font-mono text-sm">{selectedLog.recipient}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Provider</p>
                  <p className="font-medium">{selectedLog.provider}</p>
                </div>
              </div>
              {selectedLog.errorMessage && (
                <div className="rounded-lg border border-error/30 bg-error/10 p-3">
                  <p className="text-sm font-medium text-error">Error</p>
                  <p className="text-sm text-muted-foreground">{selectedLog.errorMessage}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              Close
            </Button>
            {selectedLog && selectedLog.status === "failed" && (
              <Button
                onClick={() => {
                  handleRetry(selectedLog);
                  setShowDetailDialog(false);
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
