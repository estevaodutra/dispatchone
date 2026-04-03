import { useState, useEffect, useMemo } from "react";
import { useGroupExecutionList } from "@/hooks/useGroupExecutionList";
import { ExecutionListConfigDialog } from "../dialogs/ExecutionListConfigDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ClipboardList, Clock, Zap, Users, Pencil, Play, Webhook, MessageSquare, Phone } from "lucide-react";
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

export function ExecutionListTab({ campaignId }: ExecutionListTabProps) {
  const {
    executionList,
    isLoading,
    leads,
    leadsLoading,
    createList,
    updateList,
    toggleActive,
    executeNow,
  } = useGroupExecutionList(campaignId);

  const [showConfig, setShowConfig] = useState(false);
  const [showExecuteConfirm, setShowExecuteConfirm] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [countdown, setCountdown] = useState("");

  // Countdown timer
  useEffect(() => {
    if (!executionList?.current_window_end || !executionList.is_active) {
      setCountdown("");
      return;
    }

    const update = () => {
      const end = new Date(executionList.current_window_end!).getTime();
      const diff = end - Date.now();
      if (diff <= 0) {
        setCountdown("Expirada");
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setCountdown(`${hours}h ${mins}min`);
    };

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [executionList?.current_window_end, executionList?.is_active]);

  const pendingLeads = useMemo(
    () => leads.filter((l) => l.status === "pending"),
    [leads]
  );

  const displayedLeads = showAll ? leads : leads.slice(0, 10);

  const handleSave = async (config: Parameters<typeof createList.mutateAsync>[0]) => {
    try {
      if (executionList) {
        await updateList.mutateAsync({ id: executionList.id, config });
        toast.success("Lista atualizada com sucesso");
      } else {
        await createList.mutateAsync(config);
        toast.success("Lista criada e ativada");
      }
      setShowConfig(false);
    } catch {
      toast.error("Erro ao salvar lista");
    }
  };

  const handleExecuteNow = async () => {
    if (!executionList) return;
    try {
      await executeNow.mutateAsync(executionList.id);
      toast.success("Execução concluída");
      setShowExecuteConfirm(false);
    } catch {
      toast.error("Erro ao executar lista");
    }
  };

  const handleToggle = async (active: boolean) => {
    if (!executionList) return;
    try {
      await toggleActive.mutateAsync({ id: executionList.id, is_active: active });
      toast.success(active ? "Lista ativada" : "Lista pausada");
    } catch {
      toast.error("Erro ao alterar status");
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-12 text-muted-foreground">Carregando...</div>;
  }

  // Empty state
  if (!executionList) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhuma lista configurada</h3>
          <p className="text-muted-foreground mb-6 max-w-sm">
            Defina uma janela de tempo, os eventos a monitorar e a ação a executar.
          </p>
          <Button onClick={() => setShowConfig(true)}>+ Configurar Lista</Button>

          <ExecutionListConfigDialog
            open={showConfig}
            onOpenChange={setShowConfig}
            onSave={handleSave}
            isSaving={createList.isPending}
          />
        </CardContent>
      </Card>
    );
  }

  const windowLabel =
    executionList.window_type === "fixed"
      ? `${executionList.window_start_time?.slice(0, 5) || "?"} → ${executionList.window_end_time?.slice(0, 5) || "?"} (fixo)`
      : `${executionList.window_duration_hours}h (duração)`;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Lista de Execução</h3>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setShowConfig(true)}>
            <Pencil className="h-4 w-4 mr-1" />
            Editar
          </Button>
          <Switch
            checked={executionList.is_active}
            onCheckedChange={handleToggle}
          />
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Users className="h-4 w-4" />
              Leads no ciclo
            </div>
            <div className="text-2xl font-bold">{pendingLeads.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Clock className="h-4 w-4" />
              Janela fecha em
            </div>
            <div className="text-2xl font-bold">{countdown || "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-muted-foreground text-sm mb-1">Janela</div>
            <div className="text-sm font-medium">{windowLabel}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-muted-foreground text-sm mb-1">Ação configurada</div>
            <div className="flex items-center gap-2 text-sm font-medium">
              {ACTION_ICONS[executionList.action_type]}
              {ACTION_LABELS[executionList.action_type]}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monitored Events */}
      <div>
        <span className="text-sm text-muted-foreground mr-2">Eventos monitorados:</span>
        {executionList.monitored_events.map((e) => (
          <Badge key={e} variant="secondary" className="mr-1">
            {EVENT_LABELS[e] || e}
          </Badge>
        ))}
      </div>

      {/* Leads Table */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold">Leads do ciclo atual</span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowExecuteConfirm(true)}
              disabled={pendingLeads.length === 0 || executeNow.isPending}
            >
              <Play className="h-4 w-4 mr-1" />
              {executeNow.isPending ? "Executando..." : "Executar Agora"}
            </Button>
          </div>

          {leads.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum lead capturado neste ciclo ainda.
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome / Número</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>Entrou às</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedLeads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">
                        {lead.name || lead.phone}
                        {lead.name && (
                          <span className="text-xs text-muted-foreground ml-1">{lead.phone}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{lead.origin_event}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(lead.created_at), "HH:mm")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            lead.status === "executed"
                              ? "default"
                              : lead.status === "failed"
                              ? "destructive"
                              : "secondary"
                          }
                        >
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
        </CardContent>
      </Card>

      {/* Config Dialog */}
      <ExecutionListConfigDialog
        open={showConfig}
        onOpenChange={setShowConfig}
        onSave={handleSave}
        existing={executionList}
        isSaving={updateList.isPending}
      />

      {/* Execute Now Confirmation */}
      <AlertDialog open={showExecuteConfirm} onOpenChange={setShowExecuteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Executar Lista Agora</AlertDialogTitle>
            <AlertDialogDescription>
              Isso irá disparar a ação para os {pendingLeads.length} leads do ciclo atual
              imediatamente. A janela atual será encerrada e uma nova janela começará agora.
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
