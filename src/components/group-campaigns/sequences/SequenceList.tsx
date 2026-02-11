import { MessageSequence } from "@/hooks/useSequences";
import { UnifiedSequenceList } from "@/components/sequences/UnifiedSequenceList";
import { UnifiedSequenceItem } from "@/components/sequences/shared-types";
import { Users, Keyboard, Clock, MessageSquare } from "lucide-react";

const TRIGGER_TYPES = [
  { value: "member_join", label: "Membro entrar", icon: Users, color: "bg-green-500" },
  { value: "member_leave", label: "Membro sair", icon: Users, color: "bg-red-500" },
  { value: "keyword", label: "Palavra-chave", icon: Keyboard, color: "bg-purple-500" },
  { value: "scheduled", label: "Agendado", icon: Clock, color: "bg-orange-500" },
  { value: "webhook", label: "Webhook", icon: MessageSquare, color: "bg-blue-500" },
  { value: "manual", label: "Manual", icon: MessageSquare, color: "bg-slate-500" },
];

interface SequenceListProps {
  sequences: MessageSequence[];
  isLoading: boolean;
  onEdit: (sequence: MessageSequence) => void;
  onCreate: (data: { name: string; description?: string; triggerType: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToggleActive: (id: string, active: boolean) => Promise<void>;
  isCreating: boolean;
}

const getSequenceItem = (seq: MessageSequence): UnifiedSequenceItem => ({
  id: seq.id,
  name: seq.name,
  description: seq.description,
  triggerType: seq.triggerType,
  isActive: seq.active,
});

const getTriggerPreview = (seq: MessageSequence) => {
  const config = seq.triggerConfig as Record<string, unknown>;
  switch (seq.triggerType) {
    case "scheduled": {
      const days = (config?.days as number[]) || [];
      const times = (config?.times as string[]) || [];
      const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
      const dayStr = days.length === 7 ? "Todos os dias" : days.length === 0 ? "Sem dias" : days.map(d => dayNames[d]).join(", ");
      const timeStr = times.length === 0 ? "" : times.length <= 3 ? ` às ${times.join(", ")}` : ` às ${times.slice(0, 2).join(", ")} +${times.length - 2}`;
      return `${dayStr}${timeStr}`;
    }
    case "keyword": {
      const keyword = config?.keyword as string;
      const matchType = config?.matchType as string;
      return keyword ? `"${keyword}" (${matchType || "contains"})` : "Sem palavra-chave";
    }
    case "member_join":
    case "member_leave":
      return config?.sendPrivate ? "No privado" : "No grupo";
    case "webhook":
      return "Via API externa";
    default:
      return "Disparo manual";
  }
};

export function SequenceList({ sequences, isLoading, onEdit, onCreate, onDelete, onToggleActive, isCreating }: SequenceListProps) {
  return (
    <UnifiedSequenceList<MessageSequence>
      sequences={sequences}
      isLoading={isLoading}
      onEdit={onEdit}
      onCreate={onCreate}
      onDelete={onDelete}
      onToggleActive={onToggleActive}
      isCreating={isCreating}
      triggerTypes={TRIGGER_TYPES}
      triggerSelectorType="select"
      getSequenceItem={getSequenceItem}
      renderTriggerPreview={getTriggerPreview}
    />
  );
}
