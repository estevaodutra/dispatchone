import { useState } from "react";
import { DispatchStep } from "@/hooks/useDispatchSteps";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface EditStepDialogProps {
  step: DispatchStep;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updates: Record<string, unknown>) => Promise<void>;
}

const QUICK_DELAYS = [
  { label: "15 min", value: 15, unit: "minutes" },
  { label: "30 min", value: 30, unit: "minutes" },
  { label: "1 hora", value: 1, unit: "hours" },
  { label: "2 horas", value: 2, unit: "hours" },
  { label: "1 dia", value: 1, unit: "days" },
  { label: "2 dias", value: 2, unit: "days" },
];

export function EditStepDialog({ step, open, onOpenChange, onSave }: EditStepDialogProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [content, setContent] = useState(step.messageContent || "");
  const [mediaUrl, setMediaUrl] = useState(step.messageMediaUrl || "");
  const [delayValue, setDelayValue] = useState(step.delayValue || 5);
  const [delayUnit, setDelayUnit] = useState(step.delayUnit || "minutes");

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (step.stepType === "delay") {
        await onSave({ delayValue, delayUnit });
      } else {
        await onSave({ messageContent: content, messageMediaUrl: mediaUrl || null });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const title = step.stepType === "delay"
    ? "Editar Etapa: Aguardar"
    : `Editar Etapa: ${step.messageType === "text" ? "Mensagem de Texto" : step.messageType || "Mensagem"}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {step.stepType === "delay" ? (
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="space-y-2 flex-1">
                <Label>Valor</Label>
                <Input
                  type="number"
                  min={1}
                  value={delayValue}
                  onChange={e => setDelayValue(parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2 flex-1">
                <Label>Unidade</Label>
                <Select value={delayUnit} onValueChange={setDelayUnit}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minutes">Minuto(s)</SelectItem>
                    <SelectItem value="hours">Hora(s)</SelectItem>
                    <SelectItem value="days">Dia(s)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Atalhos rápidos:</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {QUICK_DELAYS.map(qd => (
                  <Button
                    key={qd.label}
                    variant="outline"
                    size="sm"
                    onClick={() => { setDelayValue(qd.value); setDelayUnit(qd.unit); }}
                  >
                    {qd.label}
                  </Button>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              ℹ️ O sistema aguardará este tempo antes de enviar a próxima mensagem da sequência.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Mensagem *</Label>
              <Textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Digite o conteúdo da mensagem..."
                rows={5}
              />
              <p className="text-xs text-muted-foreground">
                Variáveis disponíveis: {"{nome}"} {"{telefone}"} {"{email}"}
              </p>
            </div>
            {step.messageType && step.messageType !== "text" && step.messageType !== "buttons" && step.messageType !== "list" && (
              <div className="space-y-2">
                <Label>URL da Mídia</Label>
                <Input
                  value={mediaUrl}
                  onChange={e => setMediaUrl(e.target.value)}
                  placeholder="https://exemplo.com/arquivo.jpg"
                />
              </div>
            )}
            {content && (
              <div>
                <Label className="text-sm text-muted-foreground">Prévia:</Label>
                <div className="mt-2 p-3 rounded-lg bg-muted text-sm whitespace-pre-wrap">
                  {content.replace("{nome}", "João").replace("{telefone}", "+55 11 99999-9999").replace("{email}", "joao@email.com")}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
