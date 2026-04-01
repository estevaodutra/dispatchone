import { useState, useEffect } from "react";
import { MessageSequence, useSequenceNodes } from "@/hooks/useSequences";
import { UnifiedSequenceBuilder } from "@/components/sequences/UnifiedSequenceBuilder";
import { UnifiedNodeConfigPanel } from "@/components/sequences/UnifiedNodeConfigPanel";
import { LocalNode, NodeCategory } from "@/components/sequences/shared-types";
import { TriggerConfigCard, TriggerType, TriggerConfig } from "./TriggerConfigCard";
import { MediaUploader } from "./MediaUploader";
import { PollActionDialog, PollActionConfig, getActionIconColor, getActionLabel } from "./PollActionDialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  MessageSquare, Clock, GitBranch, Bell, Link2,
  Image, Video, Music, FileText, Smile,
  BarChart3, MousePointerClick, List, MapPin, Contact, Calendar,
} from "lucide-react";

interface SequenceBuilderProps {
  sequence: MessageSequence;
  onBack: () => void;
  onUpdate: (args: { id: string; updates: Partial<MessageSequence> }) => Promise<void>;
}

const NODE_CATEGORIES: NodeCategory[] = [
  { id: "messages", label: "Mensagens", nodes: [
    { type: "message", label: "Texto", icon: MessageSquare, color: "bg-blue-500" },
  ]},
  { id: "media", label: "Mídia", nodes: [
    { type: "image", label: "Imagem", icon: Image, color: "bg-emerald-500" },
    { type: "video", label: "Vídeo", icon: Video, color: "bg-cyan-500" },
    { type: "audio", label: "Áudio", icon: Music, color: "bg-pink-500" },
    { type: "document", label: "Documento", icon: FileText, color: "bg-slate-500" },
    { type: "sticker", label: "Figurinha", icon: Smile, color: "bg-yellow-500" },
  ]},
  { id: "interactive", label: "Interativo", nodes: [
    { type: "poll", label: "Enquete", icon: BarChart3, color: "bg-indigo-500" },
    { type: "buttons", label: "Botões", icon: MousePointerClick, color: "bg-orange-500" },
    { type: "list", label: "Lista", icon: List, color: "bg-teal-500" },
    { type: "location", label: "Localização", icon: MapPin, color: "bg-red-500" },
    { type: "contact", label: "Contato", icon: Contact, color: "bg-violet-500" },
    { type: "event", label: "Evento", icon: Calendar, color: "bg-sky-500" },
  ]},
  { id: "flow", label: "Fluxo", nodes: [
    { type: "delay", label: "Delay", icon: Clock, color: "bg-amber-500" },
    { type: "condition", label: "Condição", icon: GitBranch, color: "bg-purple-500" },
    { type: "notify", label: "Notificar", icon: Bell, color: "bg-green-500" },
    { type: "webhook", label: "Webhook", icon: Link2, color: "bg-rose-500" },
  ]},
];

const getDefaultConfig = (nodeType: string): Record<string, unknown> => {
  switch (nodeType) {
    case "message": return { content: "", sendPrivate: false, mentionMember: false, viewOnce: false };
    case "image": return { url: "", caption: "", sendPrivate: false, viewOnce: false };
    case "video": return { url: "", caption: "", sendPrivate: false, isVideoNote: false, viewOnce: false };
    case "audio": return { url: "", isVoiceMessage: true, sendPrivate: false, viewOnce: false };
    case "document": return { url: "", filename: "", caption: "", sendPrivate: false, viewOnce: false };
    case "sticker": return { url: "", sendPrivate: false, viewOnce: false };
    case "poll": return { question: "", options: ["", "", ""], multiSelect: false };
    case "buttons": return { text: "", buttons: [{ id: "1", label: "", type: "REPLY" }] };
    case "list": return { title: "", buttonText: "Selecionar", sections: [{ title: "Opções", rows: [{ id: "1", title: "", description: "" }] }] };
    case "location": return { latitude: "", longitude: "", name: "", address: "" };
    case "contact": return { fullName: "", phone: "", email: "", organization: "" };
    case "event": return { name: "", description: "", startDate: "", endDate: "", location: "" };
    case "delay": return { seconds: 0, minutes: 5, hours: 0, days: 0 };
    case "condition": return { field: "member_count", operator: "greater_than", value: 0 };
    case "notify": return { message: "", notifyAdmins: true };
    case "webhook": return { url: "", method: "POST", body: "" };
    default: return {};
  }
};

export function SequenceBuilder({ sequence, onBack, onUpdate }: SequenceBuilderProps) {
  const { nodes, connections, saveNodes, saveConnections, isSaving } = useSequenceNodes(sequence.id);
  const [triggerType, setTriggerType] = useState<TriggerType>(sequence.triggerType as TriggerType || "manual");
  const [triggerConfig, setTriggerConfig] = useState<TriggerConfig>((sequence.triggerConfig as TriggerConfig) || {});

  useEffect(() => {
    setTriggerType(sequence.triggerType as TriggerType || "manual");
    setTriggerConfig((sequence.triggerConfig as TriggerConfig) || {});
  }, [sequence.id, sequence.triggerType, sequence.triggerConfig]);

  const initialNodes: LocalNode[] = nodes.map(n => ({
    id: n.id, nodeType: n.nodeType, nodeOrder: n.nodeOrder, config: n.config,
  }));

  const initialConnections = connections.map(c => ({
    sourceNodeId: c.sourceNodeId, targetNodeId: c.targetNodeId, conditionPath: c.conditionPath || undefined,
  }));

  const handleSave = async (name: string, localNodes: LocalNode[], localConnections: { sourceNodeId: string; targetNodeId: string; conditionPath?: string }[]) => {
    try {
      await onUpdate({ id: sequence.id, updates: { name, triggerType, triggerConfig: triggerConfig as Record<string, unknown> } });
      const idMapping = await saveNodes(localNodes.map(node => ({
        localId: node.id, nodeType: node.nodeType, positionX: 0, positionY: node.nodeOrder * 100, nodeOrder: node.nodeOrder, config: node.config,
      })));
      await saveConnections({ connectionsToSave: localConnections, idMapping });
      toast.success("Sequência salva com sucesso!");
    } catch {
      toast.error("Erro ao salvar sequência");
    }
  };

  const handleToggleActive = async () => {
    await onUpdate({ id: sequence.id, updates: { active: !sequence.active } });
  };

  const getOptionAction = (node: LocalNode, index: number): PollActionConfig | null => {
    const optionActions = (node.config.optionActions as Record<string, PollActionConfig>) || {};
    return optionActions[String(index)] || null;
  };

  return (
    <UnifiedSequenceBuilder
      sequenceName={sequence.name}
      isActive={sequence.active}
      sequenceId={sequence.id}
      nodeCategories={NODE_CATEGORIES}
      getDefaultConfig={getDefaultConfig}
      renderTrigger={() => (
        <TriggerConfigCard
          triggerType={triggerType}
          triggerConfig={triggerConfig}
          onTriggerTypeChange={setTriggerType}
          onTriggerConfigChange={setTriggerConfig}
          sequenceId={sequence.id}
        />
      )}
      renderConfigPanel={(node, onUpdateConfig, onClose) => (
        <UnifiedNodeConfigPanel
          node={node}
          onUpdate={onUpdateConfig}
          onClose={onClose}
          mode="group"
          renderMediaUploader={(props) => (
            <MediaUploader
              mediaType={props.mediaType as "image" | "video" | "audio" | "document" | "sticker"}
              currentUrl={props.currentUrl}
              onUpload={props.onUpload}
              onUrlChange={props.onUrlChange}
              placeholder={props.placeholder}
            />
          )}
          renderPollActionDialog={(props) => (
            <PollActionDialog
              open={props.open}
              onClose={props.onClose}
              optionIndex={props.optionIndex}
              optionText={props.optionText}
              currentAction={props.currentAction as PollActionConfig | null}
              onSave={props.onSave as (action: PollActionConfig) => void}
            />
          )}
          getOptionAction={getOptionAction}
          getActionIconColor={getActionIconColor}
          getActionLabel={getActionLabel}
        />
      )}
      onSave={handleSave}
      onToggleActive={handleToggleActive}
      onBack={onBack}
      initialNodes={initialNodes}
      initialConnections={initialConnections}
      isSaving={isSaving}
    />
  );
}
