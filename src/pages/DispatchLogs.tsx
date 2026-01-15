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
import { FileText, Search, Download, ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const filteredLogs = mockLogs.filter((log) => {
    const matchesSearch =
      log.campaign.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.recipient.includes(searchQuery) ||
      log.number.includes(searchQuery);
    const matchesStatus = statusFilter === "all" || log.status === statusFilter;
    const matchesChannel = channelFilter === "all" || log.channel === channelFilter;
    return matchesSearch && matchesStatus && matchesChannel;
  });

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
    total: mockLogs.length,
    sent: mockLogs.filter((l) => l.status === "sent").length,
    pending: mockLogs.filter((l) => l.status === "pending").length,
    failed: mockLogs.filter((l) => l.status === "failed" || l.status === "retrying").length,
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Dispatch Logs"
        description="Real-time monitoring of all dispatch activities"
        actions={
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
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
          onRowClick={(log) => setExpandedRow(expandedRow === log.id ? null : log.id)}
        />
      ) : (
        <EmptyState
          icon={FileText}
          title="No logs found"
          description="Dispatch logs will appear here once campaigns start running"
        />
      )}
    </div>
  );
}
