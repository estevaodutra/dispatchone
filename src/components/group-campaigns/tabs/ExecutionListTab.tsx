import { useState, useEffect, useMemo } from "react";
import { useGroupExecutionList, GroupExecutionList } from "@/hooks/useGroupExecutionList";
import { ExecutionListConfigDialog } from "../dialogs/ExecutionListConfigDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ClipboardList, Clock, Zap, Users, Pencil, Play, Webhook, MessageSquare, Phone, ArrowLeft, Plus, Trash2, RefreshCw, Infinity } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ExecutionListTabProps {
  campaignId: string;
}

const EVENT_LABELS: Record<string, string> = {
  group_join: "group_join",
  message: "message",
  poll_response: "poll_response",
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  webhook: <Webhook className="h-4 w-4" />,
  message: <MessageSquare className="h-4 w-4" />,
  call: <Phone className="h-4 w-4" />,
};

const ACTION_LABELS: Record<string, string> = {
  webhook: "Webhook",
  message: "Mensagem",
  call: "Ligação",
};

function isFulltime(list: GroupExecutionList): boolean {
  return list.window_type === "fixed" && list.window_start_time?.slice(0, 5) === "00:00" && list.window_end_time?.slice(0, 5) === "23:59";
}

// ── Detail view for a single list ──
function ExecutionListDetail({
  list,
  campaignId,
  onBack,
  onEdit,
}: {
  list: GroupExecutionList;
  campaignId: string;
  onBack: () => void;
  onEdit: () => void;
}) {
  const { useListLeads, toggleActive, executeNow } = useGroupExecutionList(campaignId);
  const fulltime = isFulltime(list);
  const { data: leads = [], isLoading: leadsLoading } = useListLeads(list.id, list.current_cycle_id, fulltime);

  const [showExecuteConfirm, setShowExecuteConfirm] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [countdown, setCountdown] = useState("");
  const [windowExpired, setWindowExpired] = useState(false);

  useEffect(() => {
    if (!list.current_window_end || !list.is_active) {
      setCountdown("");
      setWindowExpired(false);
      return;
    }
    const update = () => {
      const diff = new Date(list.current_window_end!).getTime() - Date.now();
      if (diff <= 0) {
        setWindowExpired(true);
        if (list.window_type === "fixed" && list.window_start_time) {
          setCountdown(`Reabre às ${list.window_start_time.slice(0, 5)}`);
        } else if (list.window_type === "duration" && list.window_duration_hours) {
          setCountdown(`Próximo ciclo: ${list.window_duration_hours}h`);
        } else {
          setCountdown("Aguardando próximo ciclo");
        }
        return;
      }
      setWindowExpired(false);
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setCountdown(`${h}h ${m}min`);
    };
    update();
    const iv = setInterval(update, 60000);
    return () => clearInterval(iv);
  }, [list.current_window_end, list.is_active, list.window_type, list.window_start_time, list.window_duration_hours]);

  const pendingLeads = useMemo(() => leads.filter((l) => l.status === "pending"), [leads]);
  const displayedLeads = showAll ? leads : leads.slice(0, 10);

  const handleToggle = async (active: boolean) => {
    try {
      await toggleActive.mutateAsync({ id: list.id, is_active: active, list });
      toast.success(active ? "Lista ativada" : "Lista pausada");
    } catch { toast.error("Erro ao alterar status"); }
  };

  const handleExecuteNow = async () => {
    try {
      await executeNow.mutateAsync(list.id);
      toast.success("Execução concluída");
      setShowExecuteConfirm(false);
    } catch { toast.error("Erro ao executar lista"); }
  };

  const windowLabel =
    list.window_type === "fixed"
      ? `${list.window_start_time?.slice(0, 5) || "?"} → ${list.window_end_time?.slice(0, 5) || "?"} (fixo)`
      : `${list.window_duration_hours}h (duração)`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <h3 className="text-lg font-semibold">{list.name}</h3>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-1" /> Editar
          </Button>
          <Switch checked={list.is_active} onCheckedChange={handleToggle} />
        </div>
      </div>

      <div className={`grid grid-cols-2 ${fulltime ? "md:grid-cols-3" : "md:grid-cols-4"} gap-3`}>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><Users className="h-4 w-4" />{fulltime ? "Total de leads (24h)" : "Leads no ciclo"}</div>
          <div className="text-2xl font-bold">{fulltime ? leads.length : pendingLeads.length}</div>
        </CardContent></Card>
        {!fulltime && (
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              {windowExpired ? <RefreshCw className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
              {windowExpired ? "Próxima janela" : "Janela fecha em"}
            </div>
            <div className={`text-2xl font-bold ${windowExpired ? "text-muted-foreground" : ""}`}>{countdown || "—"}</div>
          </CardContent></Card>
        )}
        <Card><CardContent className="p-4">
          {fulltime ? (
            <>
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><Infinity className="h-4 w-4" />Modo</div>
              <div className="text-sm font-medium">Cumulativo (24h)</div>
            </>
          ) : (
            <>
              <div className="text-muted-foreground text-sm mb-1">Janela</div>
              <div className="text-sm font-medium">{windowLabel}</div>
            </>
          )}
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-muted-foreground text-sm mb-1">Ação configurada</div>
          <div className="flex items-center gap-2 text-sm font-medium">
            {ACTION_ICONS[list.action_type]}{ACTION_LABELS[list.action_type]}
          </div>
        </CardContent></Card>
      </div>

      <div>
        <span className="text-sm text-muted-foreground mr-2">Eventos monitorados:</span>
        {list.monitored_events.map((e) => (
          <Badge key={e} variant="secondary" className="mr-1">{EVENT_LABELS[e] || e}</Badge>
        ))}
      </div>

      <Card><CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold">{fulltime ? "Histórico das últimas 24h" : "Leads do ciclo atual"}</span>
          <Button variant="destructive" size="sm" onClick={() => setShowExecuteConfirm(true)} disabled={pendingLeads.length === 0 || executeNow.isPending}>
            <Play className="h-4 w-4 mr-1" />{executeNow.isPending ? "Executando..." : "Executar Agora"}
          </Button>
        </div>
        {leads.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">{fulltime ? "Nenhum lead processado nas últimas 24h." : "Nenhum lead capturado neste ciclo ainda."}</p>
        ) : (
          <>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Nome / Número</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>{fulltime ? "Capturado em" : "Entrou às"}</TableHead>
                <TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {displayedLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">
                      {lead.name || lead.phone}
                      {lead.name && <span className="text-xs text-muted-foreground ml-1">{lead.phone}</span>}
                    </TableCell>
                    <TableCell><Badge variant="outline">{lead.origin_event}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(lead.created_at), fulltime ? "dd/MM HH:mm" : "HH:mm")}</TableCell>
                    <TableCell>
                      <Badge variant={lead.status === "executed" ? "default" : lead.status === "failed" ? "destructive" : "secondary"}>
                        {lead.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {leads.length > 10 && !showAll && (
              <div className="text-center mt-3">
                <Button variant="ghost" size="sm" onClick={() => setShowAll(true)}>
                  Exibindo 10 de {leads.length} leads — Ver todos
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent></Card>

      <AlertDialog open={showExecuteConfirm} onOpenChange={setShowExecuteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Executar Lista Agora</AlertDialogTitle>
            <AlertDialogDescription>
              Isso irá disparar a ação para os {pendingLeads.length} leads do ciclo atual imediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleExecuteNow} disabled={executeNow.isPending}>
              {executeNow.isPending ? "Executando..." : "Confirmar Execução"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Main tab component ──
export function ExecutionListTab({ campaignId }: ExecutionListTabProps) {
  const { lists, isLoading, createList, updateList, deleteList } = useGroupExecutionList(campaignId);

  const [selectedList, setSelectedList] = useState<GroupExecutionList | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [editingList, setEditingList] = useState<GroupExecutionList | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Sync selectedList with fresh data
  useEffect(() => {
    if (selectedList) {
      const fresh = lists.find((l) => l.id === selectedList.id);
      if (fresh) setSelectedList(fresh);
      else setSelectedList(null);
    }
  }, [lists]);

  const handleSave = async (config: Parameters<typeof createList.mutateAsync>[0]) => {
    try {
      if (editingList) {
        await updateList.mutateAsync({ id: editingList.id, config });
        toast.success("Lista atualizada");
      } else {
        await createList.mutateAsync(config);
        toast.success("Lista criada");
      }
      setShowConfig(false);
      setEditingList(null);
    } catch { toast.error("Erro ao salvar lista"); }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteList.mutateAsync(deletingId);
      toast.success("Lista removida");
      setDeletingId(null);
    } catch { toast.error("Erro ao remover lista"); }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-12 text-muted-foreground">Carregando...</div>;
  }

  // Detail view
  if (selectedList) {
    return (
      <>
        <ExecutionListDetail
          list={selectedList}
          campaignId={campaignId}
          onBack={() => setSelectedList(null)}
          onEdit={() => { setEditingList(selectedList); setShowConfig(true); }}
        />
        <ExecutionListConfigDialog
          open={showConfig}
          onOpenChange={(v) => { setShowConfig(v); if (!v) setEditingList(null); }}
          onSave={handleSave}
          existing={editingList}
          isSaving={updateList.isPending}
        />
      </>
    );
  }

  // List view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Listas de Execução</h3>
        <Button size="sm" onClick={() => { setEditingList(null); setShowConfig(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Nova Lista
        </Button>
      </div>

      {lists.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma lista configurada</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Crie listas para capturar leads de diferentes eventos — entradas, enquetes, saídas — cada uma com sua própria janela e ação.
            </p>
            <Button onClick={() => setShowConfig(true)}>+ Nova Lista</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {lists.map((list) => (
            <Card
              key={list.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setSelectedList(list)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold truncate">{list.name}</span>
                      <Badge variant={list.is_active ? "default" : "secondary"}>
                        {list.is_active ? "Ativo" : "Pausado"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {ACTION_ICONS[list.action_type]}
                      <span>{ACTION_LABELS[list.action_type]}</span>
                      <span>·</span>
                      <span>
                        {isFulltime(list)
                          ? "24h · Cumulativo"
                          : list.window_type === "fixed"
                            ? `${list.window_start_time?.slice(0, 5) || "?"} → ${list.window_end_time?.slice(0, 5) || "?"}`
                            : `${list.window_duration_hours}h`}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); setDeletingId(list.id); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {list.monitored_events.map((e) => (
                    <Badge key={e} variant="outline" className="text-xs">{EVENT_LABELS[e] || e}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ExecutionListConfigDialog
        open={showConfig}
        onOpenChange={(v) => { setShowConfig(v); if (!v) setEditingList(null); }}
        onSave={handleSave}
        existing={editingList}
        isSaving={createList.isPending || updateList.isPending}
      />

      <AlertDialog open={!!deletingId} onOpenChange={(v) => { if (!v) setDeletingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Lista</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. Todos os leads do ciclo atual serão perdidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteList.isPending}>
              {deleteList.isPending ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
