import { useState } from "react";
import {
  PageHeader,
  StatusBadge,
  DataTable,
  HealthBar,
  EmptyState,
  type Column,
} from "@/components/dispatch";
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
import { Phone, Plus, Search, MoreHorizontal, RefreshCw, Pause, Play } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

// Mock data
interface PhoneNumber {
  id: string;
  number: string;
  type: "whatsapp_business" | "whatsapp_normal";
  provider: string;
  status: "active" | "paused" | "banned" | "warming";
  health: number;
  cycleUsage: { used: number; total: number };
  lastUsed: string;
}

const mockNumbers: PhoneNumber[] = [
  {
    id: "1",
    number: "+55 11 98765-4321",
    type: "whatsapp_business",
    provider: "Z-API",
    status: "active",
    health: 98,
    cycleUsage: { used: 45, total: 100 },
    lastUsed: "2 min ago",
  },
  {
    id: "2",
    number: "+55 11 91234-5678",
    type: "whatsapp_business",
    provider: "Evolution API",
    status: "active",
    health: 95,
    cycleUsage: { used: 72, total: 100 },
    lastUsed: "5 min ago",
  },
  {
    id: "3",
    number: "+55 21 99876-5432",
    type: "whatsapp_normal",
    provider: "Z-API",
    status: "warming",
    health: 65,
    cycleUsage: { used: 12, total: 50 },
    lastUsed: "1 hour ago",
  },
  {
    id: "4",
    number: "+55 31 98765-1234",
    type: "whatsapp_business",
    provider: "Evolution API",
    status: "paused",
    health: 88,
    cycleUsage: { used: 0, total: 100 },
    lastUsed: "2 days ago",
  },
  {
    id: "5",
    number: "+55 41 91234-8765",
    type: "whatsapp_normal",
    provider: "Z-API",
    status: "banned",
    health: 0,
    cycleUsage: { used: 0, total: 0 },
    lastUsed: "5 days ago",
  },
];

export default function PhoneNumbers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [providerFilter, setProviderFilter] = useState<string>("all");

  const filteredNumbers = mockNumbers.filter((num) => {
    const matchesSearch = num.number.includes(searchQuery);
    const matchesStatus = statusFilter === "all" || num.status === statusFilter;
    const matchesProvider = providerFilter === "all" || num.provider === providerFilter;
    return matchesSearch && matchesStatus && matchesProvider;
  });

  const columns: Column<PhoneNumber>[] = [
    {
      key: "number",
      header: "Number",
      render: (num) => (
        <div className="flex flex-col">
          <span className="font-mono font-medium">{num.number}</span>
          <span className="text-xs text-muted-foreground">
            {num.type === "whatsapp_business" ? "Business" : "Normal"}
          </span>
        </div>
      ),
    },
    {
      key: "provider",
      header: "Provider",
      render: (num) => (
        <Badge variant="secondary" className="font-normal">
          {num.provider}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (num) => <StatusBadge status={num.status} />,
    },
    {
      key: "health",
      header: "Health",
      render: (num) => (
        <div className="w-24">
          <HealthBar value={num.health} size="sm" />
        </div>
      ),
    },
    {
      key: "cycleUsage",
      header: "Cycle Usage",
      render: (num) => (
        <div className="font-mono text-sm">
          {num.cycleUsage.total > 0
            ? `${num.cycleUsage.used} / ${num.cycleUsage.total}`
            : "—"}
        </div>
      ),
    },
    {
      key: "lastUsed",
      header: "Last Used",
      render: (num) => <span className="text-sm text-muted-foreground">{num.lastUsed}</span>,
    },
    {
      key: "actions",
      header: "",
      render: (num) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {num.status === "active" ? (
              <DropdownMenuItem>
                <Pause className="mr-2 h-4 w-4" /> Pause
              </DropdownMenuItem>
            ) : num.status === "paused" ? (
              <DropdownMenuItem>
                <Play className="mr-2 h-4 w-4" /> Activate
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem>
              <RefreshCw className="mr-2 h-4 w-4" /> Reset Cycle
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: "w-12",
    },
  ];

  const stats = {
    total: mockNumbers.length,
    active: mockNumbers.filter((n) => n.status === "active").length,
    warming: mockNumbers.filter((n) => n.status === "warming").length,
    banned: mockNumbers.filter((n) => n.status === "banned").length,
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Phone Numbers"
        description="Manage your phone number registry and rotation cycles"
        actions={
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Number
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-elevation-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Numbers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="metric-value">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="shadow-elevation-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="metric-value text-success">{stats.active}</p>
          </CardContent>
        </Card>
        <Card className="shadow-elevation-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Warming</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="metric-value text-warning">{stats.warming}</p>
          </CardContent>
        </Card>
        <Card className="shadow-elevation-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Banned</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="metric-value text-error">{stats.banned}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="warming">Warming</SelectItem>
            <SelectItem value="banned">Banned</SelectItem>
          </SelectContent>
        </Select>
        <Select value={providerFilter} onValueChange={setProviderFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Providers</SelectItem>
            <SelectItem value="Z-API">Z-API</SelectItem>
            <SelectItem value="Evolution API">Evolution API</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      {filteredNumbers.length > 0 ? (
        <DataTable
          columns={columns}
          data={filteredNumbers}
          keyExtractor={(num) => num.id}
        />
      ) : (
        <EmptyState
          icon={Phone}
          title="No numbers found"
          description="Add phone numbers to start dispatching messages"
          action={
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Number
            </Button>
          }
        />
      )}
    </div>
  );
}
