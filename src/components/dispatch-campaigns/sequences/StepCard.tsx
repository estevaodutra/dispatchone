import { DispatchStep } from "@/hooks/useDispatchSteps";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MessageSquare, Image, Video, Music, FileText, MousePointerClick, List, Clock,
  Edit, Trash2, ChevronUp, ChevronDown,
} from "lucide-react";

interface StepCardProps {
  step: DispatchStep;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}

const stepIcons: Record<string, { icon: typeof MessageSquare; label: string; color: string }> = {
  "message-text": { icon: MessageSquare, label: "Mensagem de Texto", color: "bg-blue-500" },
  "message-image": { icon: Image, label: "Imagem", color: "bg-emerald-500" },
  "message-video": { icon: Video, label: "Vídeo", color: "bg-cyan-500" },
  "message-audio": { icon: Music, label: "Áudio", color: "bg-pink-500" },
  "message-document": { icon: FileText, label: "Documento", color: "bg-slate-500" },
  "message-buttons": { icon: MousePointerClick, label: "Botões", color: "bg-orange-500" },
  "message-list": { icon: List, label: "Lista", color: "bg-teal-500" },
  delay: { icon: Clock, label: "Aguardar", color: "bg-amber-500" },
};

function getStepKey(step: DispatchStep): string {
  if (step.stepType === "message" && step.messageType) return `message-${step.messageType}`;
  return step.stepType;
}

function getPreview(step: DispatchStep): string {
  if (step.stepType === "delay") {
    const value = step.delayValue || 0;
    const unitLabels: Record<string, string> = { minutes: "minuto(s)", hours: "hora(s)", days: "dia(s)" };
    return `Esperar ${value} ${unitLabels[step.delayUnit || "minutes"] || step.delayUnit}`;
  }
  if (step.stepType === "message") {
    if (step.messageContent) return step.messageContent.substring(0, 80) + (step.messageContent.length > 80 ? "..." : "");
    if (step.messageMediaUrl) return "📎 Mídia anexada";
    return "Sem conteúdo";
  }
  return "Configurar...";
}

export function StepCard({ step, index, onEdit, onDelete, onMoveUp, onMoveDown, isFirst, isLast }: StepCardProps) {
  const key = getStepKey(step);
  const info = stepIcons[key] || stepIcons["message-text"];
  const Icon = info.icon;

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-bold text-muted-foreground">{index + 1}</span>
            <div className={`p-2 rounded-lg ${info.color}`}>
              <Icon className="h-4 w-4 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{info.label}</p>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{getPreview(step)}</p>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMoveUp} disabled={isFirst}>
              <ChevronUp className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMoveDown} disabled={isLast}>
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
