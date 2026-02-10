import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  MessageSquare, Image, Video, Music, FileText, MousePointerClick, List, Clock,
} from "lucide-react";

interface AddStepDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (stepType: string, messageType?: string) => void;
}

const MESSAGE_TYPES = [
  { type: "text", label: "Texto", description: "Mensagem de texto simples", icon: MessageSquare },
  { type: "image", label: "Imagem", description: "Imagem com legenda opcional", icon: Image },
  { type: "video", label: "Vídeo", description: "Vídeo com legenda opcional", icon: Video },
  { type: "audio", label: "Áudio", description: "Mensagem de áudio", icon: Music },
  { type: "document", label: "Documento", description: "Arquivo/documento", icon: FileText },
  { type: "buttons", label: "Botões", description: "Mensagem com botões de resposta", icon: MousePointerClick },
  { type: "list", label: "Lista", description: "Mensagem com lista de opções", icon: List },
];

export function AddStepDialog({ open, onOpenChange, onAdd }: AddStepDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Adicionar Etapa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">📨 MENSAGENS</p>
            <div className="space-y-1">
              {MESSAGE_TYPES.map(({ type, label, description, icon: Icon }) => (
                <Button
                  key={type}
                  variant="ghost"
                  className="w-full justify-start h-auto py-3"
                  onClick={() => onAdd("message", type)}
                >
                  <Icon className="h-4 w-4 mr-3 text-muted-foreground" />
                  <div className="text-left">
                    <p className="font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                </Button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">⏱️ TEMPO</p>
            <Button
              variant="ghost"
              className="w-full justify-start h-auto py-3"
              onClick={() => onAdd("delay")}
            >
              <Clock className="h-4 w-4 mr-3 text-muted-foreground" />
              <div className="text-left">
                <p className="font-medium">Aguardar</p>
                <p className="text-xs text-muted-foreground">Esperar antes da próxima etapa</p>
              </div>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
