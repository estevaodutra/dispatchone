import { Button } from "@/components/ui/button";
import { Tag, Phone, Trash2, X } from "lucide-react";

interface BulkActionsBarProps {
  count: number;
  onAddTag: () => void;
  onAddToQueue: () => void;
  onDelete: () => void;
  onCancel: () => void;
}

export function BulkActionsBar({ count, onAddTag, onAddToQueue, onDelete, onCancel }: BulkActionsBarProps) {
  if (count === 0) return null;
  return (
    <div className="sticky top-0 z-10 bg-primary text-primary-foreground rounded-lg px-4 py-3 flex items-center justify-between gap-4">
      <span className="text-sm font-medium">☑️ {count} leads selecionados</span>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="secondary" onClick={onAddTag} className="gap-1">
          <Tag className="h-3.5 w-3.5" /> Adicionar Tag
        </Button>
        <Button size="sm" variant="secondary" onClick={onAddToQueue} className="gap-1">
          <Phone className="h-3.5 w-3.5" /> Adicionar à Fila
        </Button>
        <Button size="sm" variant="destructive" onClick={onDelete} className="gap-1">
          <Trash2 className="h-3.5 w-3.5" /> Excluir
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} className="text-primary-foreground hover:text-primary-foreground/80">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
