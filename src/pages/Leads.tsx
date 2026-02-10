import { useState, useMemo } from "react";
import { useLeads, Lead, LeadFilters } from "@/hooks/useLeads";
import { useCallQueue } from "@/hooks/useCallQueue";
import { useCallCampaigns } from "@/hooks/useCallCampaigns";
import { useDispatchCampaigns } from "@/hooks/useDispatchCampaigns";
import { useGroupCampaigns } from "@/hooks/useGroupCampaigns";
import { CampaignOption } from "@/components/leads/ImportLeadsDialog";
import { PageHeader } from "@/components/dispatch/PageHeader";
import { MetricCard } from "@/components/dispatch/MetricCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  CreateLeadDialog,
  EditLeadDialog,
  ImportLeadsDialog,
  AddToQueueDialog,
  LeadActionsMenu,
  BulkActionsBar,
  LeadHistoryDialog,
} from "@/components/leads";
import {
  Users,
  UserCheck,
  Megaphone,
  UserX,
  Plus,
  Search,
  Menu,
  Download,
  Upload,
  Tag,
  Phone,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export default function Leads() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [historyLead, setHistoryLead] = useState<Lead | null>(null);
  const [bulkTagOpen, setBulkTagOpen] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const filters: LeadFilters = {
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    page,
  };

  const {
    leads, totalCount, stats, isLoading,
    createLead, updateLead, deleteLead, bulkDelete, bulkAddTags, importLeads, pageSize,
  } = useLeads(filters);

  const { addToQueue } = useCallQueue();
  const { campaigns: callCampaigns } = useCallCampaigns();
  const { campaigns: dispatchCampaigns } = useDispatchCampaigns();
  const { campaigns: groupCampaigns } = useGroupCampaigns();

  const allCampaigns = useMemo<CampaignOption[]>(() => [
    ...callCampaigns.map((c) => ({ id: c.id, name: c.name, type: "ligacao" })),
    ...dispatchCampaigns.map((c) => ({ id: c.id, name: c.name, type: "despacho" })),
    ...groupCampaigns.map((c) => ({ id: c.id, name: c.name, type: "grupos" })),
  ], [callCampaigns, dispatchCampaigns, groupCampaigns]);

  const totalPages = Math.ceil(totalCount / pageSize);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === leads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map((l) => l.id)));
    }
  };

  const formatPhone = (phone: string) => {
    const clean = phone.replace(/\D/g, "");
    if (clean.length === 13) return `+${clean.slice(0, 2)} (${clean.slice(2, 4)}) ${clean.slice(4, 9)}-${clean.slice(9)}`;
    if (clean.length === 11) return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
    return phone;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        description="Consulte, crie, modifique ou remova seus leads"
        actions={
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Novo Lead
          </Button>
        }
      />

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Total" value={stats.total.toLocaleString()} icon={Users} />
        <MetricCard title="Ativos" value={stats.active.toLocaleString()} icon={UserCheck} />
        <MetricCard title="Em Campanha" value={stats.inCampaign.toLocaleString()} icon={Megaphone} />
        <MetricCard title="Inativos" value={stats.inactive.toLocaleString()} icon={UserX} />
      </div>

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        count={selectedIds.size}
        onAddTag={() => setBulkTagOpen(true)}
        onAddToQueue={() => setQueueOpen(true)}
        onDelete={() => {
          bulkDelete.mutate(Array.from(selectedIds));
          setSelectedIds(new Set());
        }}
        onCancel={() => setSelectedIds(new Set())}
      />

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <span className="text-sm text-muted-foreground">{totalCount} resultados</span>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
            <SelectItem value="blocked">Bloqueados</SelectItem>
          </SelectContent>
        </Select>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon"><Menu className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 mr-2" /> Importar leads
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              // Export CSV
              const csv = ["nome,telefone,email,tags", ...leads.map((l) =>
                `"${l.name || ""}","${l.phone}","${l.email || ""}","${(l.tags || []).join(",")}"`
              )].join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = "leads.csv"; a.click();
              URL.revokeObjectURL(url);
            }}>
              <Download className="h-4 w-4 mr-2" /> Exportar leads
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={leads.length > 0 && selectedIds.size === leads.length}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Campanha</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : leads.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum lead encontrado.</TableCell></TableRow>
            ) : (
              leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <Checkbox checked={selectedIds.has(lead.id)} onCheckedChange={() => toggleSelect(lead.id)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <Users className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <span className="font-medium">{lead.name || "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatPhone(lead.phone)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(lead.tags || []).slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                      {(lead.tags || []).length > 3 && (
                        <Badge variant="outline" className="text-xs">+{lead.tags.length - 3}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{lead.active_campaign_type || "—"}</TableCell>
                  <TableCell>
                    <LeadActionsMenu
                      lead={lead}
                      onEdit={setEditLead}
                      onHistory={setHistoryLead}
                      onAddTag={(l) => { setSelectedIds(new Set([l.id])); setBulkTagOpen(true); }}
                      onAddToQueue={(l) => { setSelectedIds(new Set([l.id])); setQueueOpen(true); }}
                      onBlock={(l) => updateLead.mutate({ id: l.id, status: "blocked" })}
                      onDelete={(l) => deleteLead.mutate(l.id)}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <CreateLeadDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={(data) => { createLead.mutate(data); setCreateOpen(false); }}
        isLoading={createLead.isPending}
      />

      <EditLeadDialog
        lead={editLead}
        onOpenChange={(o) => !o && setEditLead(null)}
        onSubmit={(data) => { updateLead.mutate(data); setEditLead(null); }}
        isLoading={updateLead.isPending}
      />

      <ImportLeadsDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={(data) => { importLeads.mutate(data); setImportOpen(false); }}
        isLoading={importLeads.isPending}
        campaigns={allCampaigns}
      />

      <AddToQueueDialog
        open={queueOpen}
        onOpenChange={setQueueOpen}
        selectedCount={selectedIds.size}
        onSubmit={(campaignId, position) => {
          addToQueue.mutate({ campaignId, leadIds: Array.from(selectedIds), position });
          setQueueOpen(false);
          setSelectedIds(new Set());
        }}
        isLoading={addToQueue.isPending}
      />

      <LeadHistoryDialog
        lead={historyLead}
        onOpenChange={(o) => !o && setHistoryLead(null)}
      />

      {/* Bulk Tag Dialog */}
      {bulkTagOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-background rounded-lg p-6 w-80 space-y-4">
            <h3 className="font-semibold">Adicionar Tag</h3>
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Nome da tag"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const tag = tagInput.trim().toLowerCase();
                  if (tag) {
                    bulkAddTags.mutate({ ids: Array.from(selectedIds), tags: [tag] });
                    setTagInput("");
                    setBulkTagOpen(false);
                    setSelectedIds(new Set());
                  }
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setBulkTagOpen(false)}>Cancelar</Button>
              <Button size="sm" onClick={() => {
                const tag = tagInput.trim().toLowerCase();
                if (tag) {
                  bulkAddTags.mutate({ ids: Array.from(selectedIds), tags: [tag] });
                  setTagInput("");
                  setBulkTagOpen(false);
                  setSelectedIds(new Set());
                }
              }}>Adicionar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
