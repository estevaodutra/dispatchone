import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Pencil, History, Tag, Phone, Ban, Trash2 } from "lucide-react";
import type { Lead } from "@/hooks/useLeads";

interface LeadActionsMenuProps {
  lead: Lead;
  onEdit: (lead: Lead) => void;
  onHistory: (lead: Lead) => void;
  onAddTag: (lead: Lead) => void;
  onAddToQueue: (lead: Lead) => void;
  onBlock: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
}

export function LeadActionsMenu({ lead, onEdit, onHistory, onAddTag, onAddToQueue, onBlock, onDelete }: LeadActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(lead)}>
          <Pencil className="h-4 w-4 mr-2" /> Editar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onHistory(lead)}>
          <History className="h-4 w-4 mr-2" /> Ver histórico
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAddTag(lead)}>
          <Tag className="h-4 w-4 mr-2" /> Adicionar tag
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAddToQueue(lead)}>
          <Phone className="h-4 w-4 mr-2" /> Adicionar à fila
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onBlock(lead)} className="text-amber-600">
          <Ban className="h-4 w-4 mr-2" /> Bloquear
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDelete(lead)} className="text-destructive">
          <Trash2 className="h-4 w-4 mr-2" /> Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
