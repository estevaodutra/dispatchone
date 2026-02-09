import { useState } from "react";
import { CallCampaign } from "@/hooks/useCallCampaigns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Save } from "lucide-react";

interface ConfigTabProps {
  campaign: CallCampaign;
  onUpdate: (params: { id: string; updates: Partial<CallCampaign> }) => Promise<CallCampaign>;
}

export function ConfigTab({ campaign, onUpdate }: ConfigTabProps) {
  const [name, setName] = useState(campaign.name);
  const [description, setDescription] = useState(campaign.description || "");
  const [status, setStatus] = useState(campaign.status);
  const [dialDelayMinutes, setDialDelayMinutes] = useState(campaign.dialDelayMinutes);
  const [api4comQueueId, setApi4comQueueId] = useState(
    (campaign.api4comConfig?.queueId as string) || ""
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate({
        id: campaign.id,
        updates: {
          name,
          description: description || undefined,
          status,
          dialDelayMinutes,
          api4comConfig: api4comQueueId ? { queueId: api4comQueueId } : {},
        },
      });
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges =
    name !== campaign.name ||
    description !== (campaign.description || "") ||
    status !== campaign.status ||
    dialDelayMinutes !== campaign.dialDelayMinutes ||
    api4comQueueId !== ((campaign.api4comConfig?.queueId as string) || "");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configurações Gerais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nome da Campanha</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da campanha"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição da campanha..."
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="dialDelay">Intervalo para Ligação (minutos)</Label>
            <Input
              id="dialDelay"
              type="number"
              min={1}
              max={120}
              value={dialDelayMinutes}
              onChange={(e) => setDialDelayMinutes(Number(e.target.value) || 10)}
              placeholder="10"
            />
            <p className="text-xs text-muted-foreground">
              Tempo de espera entre o registro e a execução da ligação.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as CallCampaign["status"])}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="paused">Pausado</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integração API4com</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="queueId">ID da Fila (opcional)</Label>
            <Input
              id="queueId"
              value={api4comQueueId}
              onChange={(e) => setApi4comQueueId(e.target.value)}
              placeholder="Ex: queue-12345"
            />
            <p className="text-xs text-muted-foreground">
              Configure o ID da fila para integração com o sistema de telefonia.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>
    </div>
  );
}
