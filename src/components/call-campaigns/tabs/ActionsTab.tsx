import { useState } from "react";
import { useCallActions, CallAction, CallActionType } from "@/hooks/useCallActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Edit2, Zap, GripVertical } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ActionsTabProps {
  campaignId: string;
}

const actionTypeLabels: Record<CallActionType, string> = {
  start_sequence: "Iniciar Sequência",
  add_tag: "Adicionar Tag",
  update_status: "Atualizar Status",
  webhook: "Webhook",
  none: "Apenas Registrar",
};

const colorOptions = [
  { value: "#10b981", label: "Verde" },
  { value: "#3b82f6", label: "Azul" },
  { value: "#f59e0b", label: "Amarelo" },
  { value: "#ef4444", label: "Vermelho" },
  { value: "#8b5cf6", label: "Roxo" },
  { value: "#6b7280", label: "Cinza" },
];

const statusOptions = [
  { value: "completed", label: "Concluído" },
  { value: "failed", label: "Falhou" },
  { value: "no_answer", label: "Não Atendeu" },
  { value: "busy", label: "Ocupado" },
  { value: "pending", label: "Pendente" },
];

function getConfigSummary(actionType: CallActionType, config: Record<string, unknown>): string | null {
  switch (actionType) {
    case "start_sequence":
      return config.sequenceId ? `Sequência: ${String(config.sequenceId).slice(0, 8)}...` : null;
    case "add_tag":
      return config.tag ? `Tag: ${config.tag}` : null;
    case "update_status": {
      const opt = statusOptions.find((s) => s.value === config.status);
      return opt ? `Status: ${opt.label}` : null;
    }
    case "webhook":
      return config.url ? `URL: ${String(config.url).slice(0, 30)}${String(config.url).length > 30 ? "..." : ""}` : null;
    default:
      return null;
  }
}

export function ActionsTab({ campaignId }: ActionsTabProps) {
  const { actions, isLoading, createAction, updateAction, deleteAction, isCreating } =
    useCallActions(campaignId);
  const [showDialog, setShowDialog] = useState(false);
  const [editingAction, setEditingAction] = useState<CallAction | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    color: "#10b981",
    actionType: "none" as CallActionType,
    actionConfig: {} as Record<string, unknown>,
  });

  const handleOpenCreate = () => {
    setEditingAction(null);
    setFormData({ name: "", color: "#10b981", actionType: "none", actionConfig: {} });
    setShowDialog(true);
  };

  const handleOpenEdit = (action: CallAction) => {
    setEditingAction(action);
    setFormData({
      name: action.name,
      color: action.color,
      actionType: action.actionType,
      actionConfig: { ...action.actionConfig },
    });
    setShowDialog(true);
  };

  const handleActionTypeChange = (newType: CallActionType) => {
    setFormData({ ...formData, actionType: newType, actionConfig: {} });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;

    if (editingAction) {
      await updateAction({
        id: editingAction.id,
        updates: {
          name: formData.name,
          color: formData.color,
          actionType: formData.actionType,
          actionConfig: formData.actionConfig,
        },
      });
    } else {
      await createAction({
        name: formData.name,
        color: formData.color,
        actionType: formData.actionType,
        actionConfig: formData.actionConfig,
      });
    }
    setShowDialog(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Ação
        </Button>
      </div>

      {actions.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Zap className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">Nenhuma ação cadastrada</h3>
          <p className="text-muted-foreground mb-4">
            Crie ações para classificar o resultado das ligações.
          </p>
          <Button onClick={handleOpenCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Criar Ação
          </Button>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Ações de Resultado ({actions.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {actions.map((action) => {
              const configSummary = getConfigSummary(action.actionType, action.actionConfig);
              return (
                <div
                  key={action.id}
                  className="flex items-center gap-3 p-3 rounded-lg border"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: action.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{action.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {actionTypeLabels[action.actionType]}
                    </p>
                    {configSummary && (
                      <p className="text-xs text-muted-foreground truncate">
                        {configSummary}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenEdit(action)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteAction(action.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAction ? "Editar Ação" : "Nova Ação"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="actionName">Nome da Ação</Label>
              <Input
                id="actionName"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Venda Concluída"
              />
            </div>
            <div className="grid gap-2">
              <Label>Cor</Label>
              <div className="flex gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      formData.color === color.value
                        ? "border-foreground scale-110"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="actionType">Tipo de Ação</Label>
              <Select
                value={formData.actionType}
                onValueChange={(v) => handleActionTypeChange(v as CallActionType)}
              >
                <SelectTrigger id="actionType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(actionTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dynamic config fields */}
            {formData.actionType === "start_sequence" && (
              <div className="grid gap-2">
                <Label htmlFor="sequenceId">ID da Sequência</Label>
                <Input
                  id="sequenceId"
                  value={(formData.actionConfig.sequenceId as string) || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      actionConfig: { ...formData.actionConfig, sequenceId: e.target.value },
                    })
                  }
                  placeholder="UUID da sequência"
                />
                <p className="text-xs text-muted-foreground">
                  Cole o ID da sequência de grupo que será disparada.
                </p>
              </div>
            )}

            {formData.actionType === "add_tag" && (
              <div className="grid gap-2">
                <Label htmlFor="tag">Nome da Tag</Label>
                <Input
                  id="tag"
                  value={(formData.actionConfig.tag as string) || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      actionConfig: { ...formData.actionConfig, tag: e.target.value },
                    })
                  }
                  placeholder="Ex: venda-concluida"
                />
              </div>
            )}

            {formData.actionType === "update_status" && (
              <div className="grid gap-2">
                <Label htmlFor="status">Status do Lead</Label>
                <Select
                  value={(formData.actionConfig.status as string) || ""}
                  onValueChange={(v) =>
                    setFormData({
                      ...formData,
                      actionConfig: { ...formData.actionConfig, status: v },
                    })
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.actionType === "webhook" && (
              <div className="grid gap-2">
                <Label htmlFor="webhookUrl">URL do Webhook</Label>
                <Input
                  id="webhookUrl"
                  type="url"
                  value={(formData.actionConfig.url as string) || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      actionConfig: { ...formData.actionConfig, url: e.target.value },
                    })
                  }
                  placeholder="https://example.com/webhook"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.name.trim() || isCreating}>
              {editingAction ? "Salvar" : isCreating ? "Criando..." : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
