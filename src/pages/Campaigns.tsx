import { useState } from "react";
import { PageHeader, StatusBadge, DataTable, EmptyState, type Column } from "@/components/dispatch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Megaphone, Plus, Search, MoreHorizontal, Play, Pause, Eye } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";

// Mock data
interface Campaign {
  id: string;
  name: string;
  channel: "whatsapp" | "voice";
  status: "draft" | "running" | "paused" | "completed" | "terminated";
  sent: number;
  total: number;
  successRate: number;
  createdAt: string;
}

const mockCampaigns: Campaign[] = [
  {
    id: "1",
    name: "Summer Promo 2025",
    channel: "whatsapp",
    status: "running",
    sent: 8420,
    total: 12000,
    successRate: 97.2,
    createdAt: "2025-01-10",
  },
  {
    id: "2",
    name: "Payment Reminder Q1",
    channel: "voice",
    status: "running",
    sent: 3200,
    total: 5000,
    successRate: 94.8,
    createdAt: "2025-01-08",
  },
  {
    id: "3",
    name: "Welcome Series - New Users",
    channel: "whatsapp",
    status: "paused",
    sent: 15000,
    total: 15000,
    successRate: 98.1,
    createdAt: "2025-01-05",
  },
  {
    id: "4",
    name: "Re-engagement Campaign",
    channel: "whatsapp",
    status: "draft",
    sent: 0,
    total: 8000,
    successRate: 0,
    createdAt: "2025-01-12",
  },
  {
    id: "5",
    name: "Holiday Offers",
    channel: "whatsapp",
    status: "completed",
    sent: 25000,
    total: 25000,
    successRate: 96.5,
    createdAt: "2024-12-20",
  },
];

export default function Campaigns() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredCampaigns = mockCampaigns.filter((campaign) => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns: Column<Campaign>[] = [
    {
      key: "name",
      header: "Campaign",
      render: (campaign) => (
        <div className="flex flex-col">
          <span className="font-medium">{campaign.name}</span>
          <span className="text-xs text-muted-foreground capitalize">{campaign.channel}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (campaign) => <StatusBadge status={campaign.status} />,
    },
    {
      key: "progress",
      header: "Progress",
      render: (campaign) => (
        <div className="w-32 space-y-1">
          <Progress value={(campaign.sent / campaign.total) * 100} className="h-1.5" />
          <span className="text-xs text-muted-foreground">
            {campaign.sent.toLocaleString()} / {campaign.total.toLocaleString()}
          </span>
        </div>
      ),
    },
    {
      key: "successRate",
      header: "Success Rate",
      render: (campaign) => (
        <span className="font-mono text-sm">
          {campaign.successRate > 0 ? `${campaign.successRate}%` : "—"}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      render: (campaign) => (
        <span className="text-sm text-muted-foreground">{campaign.createdAt}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (campaign) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Eye className="mr-2 h-4 w-4" /> View Details
            </DropdownMenuItem>
            {campaign.status === "running" ? (
              <DropdownMenuItem>
                <Pause className="mr-2 h-4 w-4" /> Pause Campaign
              </DropdownMenuItem>
            ) : campaign.status === "paused" || campaign.status === "draft" ? (
              <DropdownMenuItem>
                <Play className="mr-2 h-4 w-4" /> Start Campaign
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: "w-12",
    },
  ];

  const stats = {
    total: mockCampaigns.length,
    running: mockCampaigns.filter((c) => c.status === "running").length,
    completed: mockCampaigns.filter((c) => c.status === "completed").length,
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Campaigns"
        description="Create and manage your dispatch campaigns"
        actions={
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Campaign
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-elevation-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="metric-value">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="shadow-elevation-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Running Now</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="metric-value text-success">{stats.running}</p>
          </CardContent>
        </Card>
        <Card className="shadow-elevation-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="metric-value text-info">{stats.completed}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="terminated">Terminated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      {filteredCampaigns.length > 0 ? (
        <DataTable
          columns={columns}
          data={filteredCampaigns}
          keyExtractor={(campaign) => campaign.id}
        />
      ) : (
        <EmptyState
          icon={Megaphone}
          title="No campaigns found"
          description="Create your first campaign to start dispatching messages"
          action={
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Campaign
            </Button>
          }
        />
      )}
    </div>
  );
}
