import { useState } from "react";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import { useGroupMessages } from "@/hooks/useGroupMessages";
import { useGroupModeration } from "@/hooks/useGroupModeration";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  MessageSquare,
  Shield,
  Download,
  TrendingUp,
  Clock,
  UserCheck,
  AlertTriangle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface AnalyticsTabProps {
  campaignId: string;
}

export function AnalyticsTab({ campaignId }: AnalyticsTabProps) {
  const { members, stats, isLoading: isLoadingMembers } = useGroupMembers(campaignId);
  const { messages, isLoading: isLoadingMessages } = useGroupMessages(campaignId);
  const { logs, isLoading: isLoadingModeration } = useGroupModeration(campaignId);

  const [exportFormat, setExportFormat] = useState<"csv" | "json" | "xlsx">("csv");

  const isLoading = isLoadingMembers || isLoadingMessages || isLoadingModeration;

  // Mock data for charts (would be real data in production)
  const activityData = [
    { name: "Seg", mensagens: 45, membros: 120 },
    { name: "Ter", mensagens: 52, membros: 122 },
    { name: "Qua", mensagens: 38, membros: 125 },
    { name: "Qui", mensagens: 65, membros: 128 },
    { name: "Sex", mensagens: 72, membros: 130 },
    { name: "Sáb", mensagens: 41, membros: 132 },
    { name: "Dom", mensagens: 28, membros: 132 },
  ];

  const memberStatusData = [
    { name: "Ativos", value: stats.active, color: "hsl(var(--primary))" },
    { name: "Removidos", value: stats.removed, color: "hsl(var(--destructive))" },
    { name: "Admins", value: stats.admins, color: "hsl(var(--chart-3))" },
  ].filter((d) => d.value > 0);

  const handleExport = (type: "members" | "messages" | "moderation" | "full") => {
    let data: unknown[];
    let filename: string;

    switch (type) {
      case "members":
        data = members.map((m) => ({
          telefone: m.phone,
          nome: m.name,
          status: m.status,
          strikes: m.strikes,
          admin: m.isAdmin,
          entrada: m.joinedAt,
          mensagens: m.messageCount,
        }));
        filename = `membros-${campaignId}`;
        break;
      case "messages":
        data = messages.map((m) => ({
          tipo: m.type,
          conteudo: m.content,
          gatilho: m.triggerKeyword,
          ativo: m.active,
          criado: m.createdAt,
        }));
        filename = `mensagens-${campaignId}`;
        break;
      case "moderation":
        data = logs.map((l) => ({
          data: l.createdAt,
          telefone: l.memberPhone,
          acao: l.action,
          motivo: l.reason,
        }));
        filename = `moderacao-${campaignId}`;
        break;
      default:
        data = {
          membros: members,
          mensagens: messages,
          moderacao: logs,
          estatisticas: stats,
        } as unknown as unknown[];
        filename = `relatorio-completo-${campaignId}`;
    }

    if (exportFormat === "json") {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (exportFormat === "csv") {
      if (!Array.isArray(data) || data.length === 0) return;
      const headers = Object.keys(data[0] as Record<string, unknown>);
      const csv = [
        headers.join(","),
        ...(data as Record<string, unknown>[]).map((row) =>
          headers.map((h) => JSON.stringify(row[h] ?? "")).join(",")
        ),
      ].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Membros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Mensagens Configuradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{messages.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Moderações (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-yellow-500" />
              <span className="text-2xl font-bold">{logs.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa de Retenção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">
                {stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Atividade Semanal</CardTitle>
            <CardDescription>Mensagens e crescimento de membros.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="mensagens"
                  stackId="1"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Member Status Pie */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Membros</CardTitle>
            <CardDescription>Status atual dos membros do grupo.</CardDescription>
          </CardHeader>
          <CardContent>
            {memberStatusData.length === 0 ? (
              <div className="flex items-center justify-center h-[300px]">
                <p className="text-muted-foreground">Sem dados para exibir</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={memberStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {memberStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Members */}
      <Card>
        <CardHeader>
          <CardTitle>Membros Mais Ativos</CardTitle>
          <CardDescription>
            Ranking por quantidade de mensagens enviadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum membro no grupo ainda.
            </p>
          ) : (
            <div className="space-y-4">
              {members
                .sort((a, b) => b.messageCount - a.messageCount)
                .slice(0, 5)
                .map((member, index) => (
                  <div key={member.id} className="flex items-center gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{member.name || member.phone}</p>
                      <p className="text-sm text-muted-foreground">{member.phone}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{member.messageCount}</p>
                      <p className="text-sm text-muted-foreground">mensagens</p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exportar Dados
          </CardTitle>
          <CardDescription>
            Exporte relatórios e dados do grupo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as typeof exportFormat)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="xlsx" disabled>Excel (em breve)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2 md:grid-cols-4">
            <Button variant="outline" onClick={() => handleExport("members")}>
              <Users className="mr-2 h-4 w-4" />
              Membros
            </Button>
            <Button variant="outline" onClick={() => handleExport("messages")}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Mensagens
            </Button>
            <Button variant="outline" onClick={() => handleExport("moderation")}>
              <Shield className="mr-2 h-4 w-4" />
              Moderação
            </Button>
            <Button onClick={() => handleExport("full")}>
              <Download className="mr-2 h-4 w-4" />
              Relatório Completo
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
