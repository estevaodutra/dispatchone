import { useState } from "react";
import { PageHeader, StatusBadge, DataTable, EmptyState, type Column } from "@/components/dispatch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Megaphone, Plus, Search, MoreHorizontal, Play, Pause, Eye, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

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

const initialCampaigns: Campaign[] = [
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
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    channel: "whatsapp",
    message: "",
    totalRecipients: "1000",
  });

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateCampaign = async () => {
    if (!newCampaign.name) {
      toast({
        title: "Error",
        description: "Campaign name is required.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const campaign: Campaign = {
      id: String(Date.now()),
      name: newCampaign.name,
      channel: newCampaign.channel as "whatsapp" | "voice",
      status: "draft",
      sent: 0,
      total: parseInt(newCampaign.totalRecipients),
      successRate: 0,
      createdAt: new Date().toISOString().split("T")[0],
    };

    setCampaigns((prev) => [campaign, ...prev]);
    setShowCreateDialog(false);
    setNewCampaign({ name: "", channel: "whatsapp", message: "", totalRecipients: "1000" });
    setIsCreating(false);

    toast({
      title: "Campaign created",
      description: `"${campaign.name}" has been created as a draft.`,
    });
  };

  const handleToggleCampaign = (campaign: Campaign) => {
    const newStatus = campaign.status === "running" ? "paused" : "running";
    setCampaigns((prev) =>
      prev.map((c) => (c.id === campaign.id ? { ...c, status: newStatus } : c))
    );
    toast({
      title: newStatus === "running" ? "Campaign started" : "Campaign paused",
      description: `"${campaign.name}" is now ${newStatus}.`,
    });
  };

  const handleViewDetails = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setShowDetailDialog(true);
  };

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
            <DropdownMenuItem onClick={() => handleViewDetails(campaign)}>
              <Eye className="mr-2 h-4 w-4" /> View Details
            </DropdownMenuItem>
            {campaign.status === "running" ? (
              <DropdownMenuItem onClick={() => handleToggleCampaign(campaign)}>
                <Pause className="mr-2 h-4 w-4" /> Pause Campaign
              </DropdownMenuItem>
            ) : campaign.status === "paused" || campaign.status === "draft" ? (
              <DropdownMenuItem onClick={() => handleToggleCampaign(campaign)}>
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
    total: campaigns.length,
    running: campaigns.filter((c) => c.status === "running").length,
    completed: campaigns.filter((c) => c.status === "completed").length,
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Campaigns"
        description="Create and manage your dispatch campaigns"
        actions={
          <Button className="gap-2" onClick={() => setShowCreateDialog(true)}>
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
            <Button className="gap-2" onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4" />
              Create Campaign
            </Button>
          }
        />
      )}

      {/* Create Campaign Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Campaign</DialogTitle>
            <DialogDescription>
              Set up a new dispatch campaign for WhatsApp or Voice.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Campaign Name</Label>
              <Input
                id="name"
                placeholder="e.g., Summer Promo 2025"
                value={newCampaign.name}
                onChange={(e) => setNewCampaign((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="channel">Channel</Label>
              <Select
                value={newCampaign.channel}
                onValueChange={(value) => setNewCampaign((prev) => ({ ...prev, channel: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="voice">Voice/URA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipients">Total Recipients</Label>
              <Input
                id="recipients"
                type="number"
                placeholder="1000"
                value={newCampaign.totalRecipients}
                onChange={(e) => setNewCampaign((prev) => ({ ...prev, totalRecipients: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message Template</Label>
              <Textarea
                id="message"
                placeholder="Enter your message template..."
                value={newCampaign.message}
                onChange={(e) => setNewCampaign((prev) => ({ ...prev, message: e.target.value }))}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCampaign} disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Campaign"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Campaign Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedCampaign?.name}</DialogTitle>
            <DialogDescription>Campaign performance and details</DialogDescription>
          </DialogHeader>
          {selectedCampaign && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <StatusBadge status={selectedCampaign.status} size="lg" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Channel</p>
                  <p className="font-medium capitalize">{selectedCampaign.channel}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <p className="font-mono text-lg font-semibold">
                    {selectedCampaign.successRate > 0 ? `${selectedCampaign.successRate}%` : "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">{selectedCampaign.createdAt}</p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Progress</p>
                <Progress value={(selectedCampaign.sent / selectedCampaign.total) * 100} className="h-3" />
                <p className="text-sm text-muted-foreground">
                  {selectedCampaign.sent.toLocaleString()} of {selectedCampaign.total.toLocaleString()} dispatched
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              Close
            </Button>
            {selectedCampaign && (selectedCampaign.status === "running" || selectedCampaign.status === "paused" || selectedCampaign.status === "draft") && (
              <Button
                onClick={() => {
                  handleToggleCampaign(selectedCampaign);
                  setShowDetailDialog(false);
                }}
              >
                {selectedCampaign.status === "running" ? "Pause" : "Start"} Campaign
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
