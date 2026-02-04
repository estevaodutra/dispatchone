import { useState } from "react";
import { useCallLeads, CallLeadStatus } from "@/hooks/useCallLeads";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, UserPlus, Clock, CheckCircle, XCircle, Phone } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricCard } from "@/components/dispatch";

interface LeadsTabProps {
  campaignId: string;
}

const statusLabels: Record<CallLeadStatus, string> = {
  pending: "Pendente",
  calling: "Ligando",
  in_progress: "Em andamento",
  completed: "Concluído",
  no_answer: "Não atendeu",
  busy: "Ocupado",
  failed: "Falhou",
};

const statusColors: Record<CallLeadStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  calling: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  no_answer: "bg-orange-100 text-orange-800",
  busy: "bg-red-100 text-red-800",
  failed: "bg-red-100 text-red-800",
};

export function LeadsTab({ campaignId }: LeadsTabProps) {
  const [statusFilter, setStatusFilter] = useState<CallLeadStatus | undefined>();
  const { leads, stats, isLoading, addLead, deleteLead, isAdding } = useCallLeads(
    campaignId,
    statusFilter
  );
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newLead, setNewLead] = useState({ phone: "", name: "", email: "" });

  const handleAddLead = async () => {
    if (!newLead.phone.trim()) return;
    await addLead({
      phone: newLead.phone.trim(),
      name: newLead.name.trim() || undefined,
      email: newLead.email.trim() || undefined,
    });
    setNewLead({ phone: "", name: "", email: "" });
    setShowAddDialog(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Total"
          value={stats.total}
          icon={UserPlus}
        />
        <MetricCard
          title="Pendentes"
          value={stats.pending}
          icon={Clock}
        />
        <MetricCard
          title="Concluídos"
          value={stats.completed}
          icon={CheckCircle}
        />
        <MetricCard
          title="Falhas"
          value={stats.failed}
          icon={XCircle}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Select
          value={statusFilter || "all"}
          onValueChange={(v) => setStatusFilter(v === "all" ? undefined : (v as CallLeadStatus))}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(statusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Lead
        </Button>
      </div>

      {/* Table */}
      {leads.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Phone className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">Nenhum lead cadastrado</h3>
          <p className="text-muted-foreground mb-4">
            Adicione leads para iniciar as ligações desta campanha.
          </p>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Lead
          </Button>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Leads ({leads.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tentativas</TableHead>
                  <TableHead className="w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.phone}</TableCell>
                    <TableCell>{lead.name || "-"}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[lead.status]}>
                        {statusLabels[lead.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>{lead.attempts}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteLead(lead.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Lead</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="phone">Telefone *</Label>
              <Input
                id="phone"
                value={newLead.phone}
                onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                placeholder="Ex: 5511999999999"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="leadName">Nome (opcional)</Label>
              <Input
                id="leadName"
                value={newLead.name}
                onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                placeholder="Ex: João Silva"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">E-mail (opcional)</Label>
              <Input
                id="email"
                type="email"
                value={newLead.email}
                onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                placeholder="Ex: joao@email.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddLead} disabled={!newLead.phone.trim() || isAdding}>
              {isAdding ? "Adicionando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
