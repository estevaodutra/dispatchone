import { useState, useCallback, useEffect } from "react";
import { DispatchSequence } from "@/hooks/useDispatchSequences";
import { useDispatchSteps } from "@/hooks/useDispatchSteps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ArrowLeft, Save, Play, Pause, Trash2, GripVertical, ChevronDown, ChevronUp, Copy,
  MessageSquare, Clock, Image, Video, Music, FileText, MousePointerClick, List as ListIcon,
} from "lucide-react";
import { toast } from "sonner";
import { DispatchNodeConfigPanel } from "./DispatchNodeConfigPanel";
import { DispatchTriggerConfigCard, DispatchTriggerType, DispatchTriggerConfig } from "./DispatchTriggerConfigCard";

interface DispatchSequenceBuilderProps {
  sequence: DispatchSequence;
  onBack: () => void;
  onUpdate: (args: { id: string; updates: Partial<DispatchSequence> }) => Promise<void>;
}

interface LocalNode {
  id: string;
  nodeType: string;
  nodeOrder: number;
  config: Record<string, unknown>;
}

const NODE_CATEGORIES = [
  {
    id: "messages",
    label: "Mensagens",
    nodes: [
      { type: "message", label: "Texto", icon: MessageSquare, color: "bg-blue-500" },
    ],
  },
  {
    id: "media",
    label: "Mídia",
    nodes: [
      { type: "image", label: "Imagem", icon: Image, color: "bg-emerald-500" },
      { type: "video", label: "Vídeo", icon: Video, color: "bg-cyan-500" },
      { type: "audio", label: "Áudio", icon: Music, color: "bg-pink-500" },
      { type: "document", label: "Documento", icon: FileText, color: "bg-slate-500" },
    ],
  },
  {
    id: "interactive",
    label: "Interativo",
    nodes: [
      { type: "buttons", label: "Botões", icon: MousePointerClick, color: "bg-orange-500" },
      { type: "list", label: "Lista", icon: ListIcon, color: "bg-teal-500" },
    ],
  },
  {
    id: "flow",
    label: "Fluxo",
    nodes: [
      { type: "delay", label: "Delay", icon: Clock, color: "bg-amber-500" },
    ],
  },
];

const ALL_NODE_TYPES = NODE_CATEGORIES.flatMap(cat => cat.nodes);

// Convert DB steps to local nodes
function stepsToNodes(steps: ReturnType<typeof useDispatchSteps>["steps"]): LocalNode[] {
  return steps.map(step => {
    const nodeType = step.stepType === "message" ? (step.messageType || "message") : step.stepType;
    const config: Record<string, unknown> = {};

    if (step.stepType === "delay") {
      // Convert delayValue + delayUnit to days/hours/minutes
      const val = step.delayValue || 0;
      const unit = step.delayUnit || "minutes";
      config.days = unit === "days" ? val : 0;
      config.hours = unit === "hours" ? val : 0;
      config.minutes = unit === "minutes" ? val : 0;
    } else if (step.stepType === "message") {
      if (step.messageType === "text" || step.messageType === "message" || !step.messageType) {
        config.content = step.messageContent || "";
      } else if (step.messageType === "buttons") {
        config.text = step.messageContent || "";
        config.buttons = step.messageButtons || [{ id: "1", label: "" }];
      } else if (step.messageType === "list") {
        config.title = "";
        config.buttonText = "Selecionar";
        config.body = step.messageContent || "";
      } else {
        // image, video, audio, document
        config.url = step.messageMediaUrl || "";
        config.caption = step.messageContent || "";
        if (step.messageType === "document") {
          config.filename = "";
        }
      }
    }

    return {
      id: step.id,
      nodeType: nodeType === "text" ? "message" : nodeType,
      nodeOrder: step.stepOrder,
      config,
    };
  });
}

// Convert local nodes back to DB format for batch save
function nodesToSteps(nodes: LocalNode[]) {
  return nodes.map((node, index) => {
    let stepType = "message";
    let messageType: string | null = null;
    let messageContent: string | null = null;
    let messageMediaUrl: string | null = null;
    let messageButtons: unknown[] | null = null;
    let delayValue: number | null = null;
    let delayUnit: string | null = null;

    if (node.nodeType === "delay") {
      stepType = "delay";
      const days = (node.config.days as number) || 0;
      const hours = (node.config.hours as number) || 0;
      const minutes = (node.config.minutes as number) || 0;
      if (days > 0) { delayValue = days; delayUnit = "days"; }
      else if (hours > 0) { delayValue = hours; delayUnit = "hours"; }
      else { delayValue = minutes; delayUnit = "minutes"; }
    } else if (node.nodeType === "message") {
      messageType = "text";
      messageContent = (node.config.content as string) || null;
    } else if (node.nodeType === "buttons") {
      messageType = "buttons";
      messageContent = (node.config.text as string) || null;
      messageButtons = (node.config.buttons as unknown[]) || null;
    } else if (node.nodeType === "list") {
      messageType = "list";
      messageContent = (node.config.body as string) || null;
    } else {
      // image, video, audio, document
      messageType = node.nodeType;
      messageMediaUrl = (node.config.url as string) || null;
      messageContent = (node.config.caption as string) || null;
    }

    return {
      stepOrder: index,
      stepType,
      messageType,
      messageContent,
      messageMediaUrl,
      messageButtons,
      delayValue,
      delayUnit,
    };
  });
}

export function DispatchSequenceBuilder({ sequence, onBack, onUpdate }: DispatchSequenceBuilderProps) {
  const { steps, isLoading, saveAllSteps, isSaving } = useDispatchSteps(sequence.id);
  const [localNodes, setLocalNodes] = useState<LocalNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [sequenceName, setSequenceName] = useState(sequence.name);
  const [openCategories, setOpenCategories] = useState<string[]>(["messages", "media", "interactive", "flow"]);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const [triggerType, setTriggerType] = useState<DispatchTriggerType>(
    (sequence.triggerType as DispatchTriggerType) || "manual"
  );
  const [triggerConfig, setTriggerConfig] = useState<DispatchTriggerConfig>(
    (sequence.triggerConfig as DispatchTriggerConfig) || {}
  );

  // Load steps into local state
  useEffect(() => {
    if (steps.length > 0) {
      setLocalNodes(stepsToNodes(steps));
    }
  }, [steps]);

  useEffect(() => {
    setTriggerType((sequence.triggerType as DispatchTriggerType) || "manual");
    setTriggerConfig((sequence.triggerConfig as DispatchTriggerConfig) || {});
  }, [sequence.id, sequence.triggerType, sequence.triggerConfig]);

  const generateNodeId = () => `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const getDefaultConfig = (nodeType: string): Record<string, unknown> => {
    switch (nodeType) {
      case "message": return { content: "" };
      case "image": return { url: "", caption: "" };
      case "video": return { url: "", caption: "" };
      case "audio": return { url: "", caption: "" };
      case "document": return { url: "", filename: "", caption: "" };
      case "buttons": return { text: "", buttons: [{ id: "1", label: "" }] };
      case "list": return { title: "", buttonText: "Selecionar", body: "" };
      case "delay": return { minutes: 5, hours: 0, days: 0 };
      default: return {};
    }
  };

  const handleDragStart = (e: React.DragEvent, nodeType: string) => {
    e.dataTransfer.setData("nodeType", nodeType);
    e.dataTransfer.setData("source", "palette");
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleNodeDragStart = (e: React.DragEvent, nodeId: string) => {
    e.dataTransfer.setData("nodeId", nodeId);
    e.dataTransfer.setData("source", "list");
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => setDragOverIndex(null);

  const handleDrop = useCallback((e: React.DragEvent, targetIndex?: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    const source = e.dataTransfer.getData("source");

    if (source === "palette") {
      const nodeType = e.dataTransfer.getData("nodeType");
      if (!nodeType) return;
      const insertIndex = targetIndex ?? localNodes.length;
      const newNode: LocalNode = {
        id: generateNodeId(),
        nodeType,
        nodeOrder: insertIndex,
        config: getDefaultConfig(nodeType),
      };
      setLocalNodes(prev => {
        const updated = [...prev];
        updated.splice(insertIndex, 0, newNode);
        return updated.map((node, idx) => ({ ...node, nodeOrder: idx }));
      });
      setSelectedNodeId(newNode.id);
    } else if (source === "list") {
      const nodeId = e.dataTransfer.getData("nodeId");
      if (!nodeId || targetIndex === undefined) return;
      setLocalNodes(prev => {
        const sorted = [...prev].sort((a, b) => a.nodeOrder - b.nodeOrder);
        const draggedIndex = sorted.findIndex(n => n.id === nodeId);
        if (draggedIndex === -1 || draggedIndex === targetIndex) return prev;
        const [removed] = sorted.splice(draggedIndex, 1);
        sorted.splice(targetIndex > draggedIndex ? targetIndex - 1 : targetIndex, 0, removed);
        return sorted.map((node, idx) => ({ ...node, nodeOrder: idx }));
      });
    }
  }, [localNodes.length]);

  const handleMoveNode = (nodeId: string, direction: -1 | 1) => {
    setLocalNodes(prev => {
      const sorted = [...prev].sort((a, b) => a.nodeOrder - b.nodeOrder);
      const index = sorted.findIndex(n => n.id === nodeId);
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= sorted.length) return prev;
      [sorted[index], sorted[newIndex]] = [sorted[newIndex], sorted[index]];
      return sorted.map((node, idx) => ({ ...node, nodeOrder: idx }));
    });
  };

  const handleDeleteNode = (nodeId: string) => {
    setLocalNodes(prev => prev.filter(n => n.id !== nodeId).map((n, idx) => ({ ...n, nodeOrder: idx })));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  };

  const handleDuplicateNode = (nodeId: string) => {
    const node = localNodes.find(n => n.id === nodeId);
    if (!node) return;
    const sorted = [...localNodes].sort((a, b) => a.nodeOrder - b.nodeOrder);
    const idx = sorted.findIndex(n => n.id === nodeId);
    const newNode: LocalNode = {
      id: generateNodeId(),
      nodeType: node.nodeType,
      nodeOrder: idx + 1,
      config: JSON.parse(JSON.stringify(node.config)),
    };
    setLocalNodes(prev => {
      const s = [...prev].sort((a, b) => a.nodeOrder - b.nodeOrder);
      s.splice(idx + 1, 0, newNode);
      return s.map((n, i) => ({ ...n, nodeOrder: i }));
    });
    setSelectedNodeId(newNode.id);
  };

  const handleUpdateNodeConfig = (nodeId: string, config: Record<string, unknown>) => {
    setLocalNodes(prev => prev.map(n => n.id === nodeId ? { ...n, config } : n));
  };

  const handleSave = async () => {
    try {
      await onUpdate({
        id: sequence.id,
        updates: {
          name: sequenceName,
          triggerType,
          triggerConfig: triggerConfig as Record<string, unknown>,
        },
      });
      await saveAllSteps(nodesToSteps(
        [...localNodes].sort((a, b) => a.nodeOrder - b.nodeOrder)
      ));
      toast.success("Sequência salva com sucesso!");
    } catch {
      toast.error("Erro ao salvar sequência");
    }
  };

  const handleToggleActive = async () => {
    await onUpdate({ id: sequence.id, updates: { isActive: !sequence.isActive } });
  };

  const toggleCategory = (catId: string) => {
    setOpenCategories(prev =>
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  };

  const getNodeInfo = (type: string) => ALL_NODE_TYPES.find(n => n.type === type) || ALL_NODE_TYPES[0];
  const selectedNode = localNodes.find(n => n.id === selectedNodeId);
  const sortedNodes = [...localNodes].sort((a, b) => a.nodeOrder - b.nodeOrder);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Input
            value={sequenceName}
            onChange={e => setSequenceName(e.target.value)}
            className="text-lg font-semibold w-64"
          />
          <Badge variant={sequence.isActive ? "default" : "secondary"}>
            {sequence.isActive ? "Ativa" : "Inativa"}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleToggleActive}>
            {sequence.isActive ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            {sequence.isActive ? "Pausar" : "Ativar"}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      {/* Trigger */}
      <DispatchTriggerConfigCard
        triggerType={triggerType}
        triggerConfig={triggerConfig}
        onTriggerTypeChange={setTriggerType}
        onTriggerConfigChange={setTriggerConfig}
        sequenceId={sequence.id}
      />

      {/* 3-Panel Layout */}
      <div className="flex gap-4 h-[calc(100vh-380px)] min-h-[400px]">
        {/* Palette */}
        <Card className="w-52 shrink-0 overflow-y-auto">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Componentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-3">
            {NODE_CATEGORIES.map(category => (
              <Collapsible
                key={category.id}
                open={openCategories.includes(category.id)}
                onOpenChange={() => toggleCategory(category.id)}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-accent transition-colors text-sm font-medium">
                  {category.label}
                  <ChevronDown className={`h-4 w-4 transition-transform ${openCategories.includes(category.id) ? "rotate-180" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1 mt-1">
                  {category.nodes.map(node => (
                    <div
                      key={node.type}
                      draggable
                      onDragStart={e => handleDragStart(e, node.type)}
                      className="flex items-center gap-2 p-2 rounded-lg border cursor-grab hover:bg-accent transition-colors ml-2"
                    >
                      <div className={`p-1.5 rounded ${node.color}`}>
                        <node.icon className="h-3.5 w-3.5 text-white" />
                      </div>
                      <span className="text-xs font-medium">{node.label}</span>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </CardContent>
        </Card>

        {/* Canvas */}
        <Card className="flex-1 overflow-hidden flex flex-col">
          <CardHeader className="pb-3 border-b shrink-0">
            <CardTitle className="text-sm">Canvas</CardTitle>
          </CardHeader>
          <CardContent
            className="flex-1 p-4 overflow-y-auto"
            onDragOver={e => {
              e.preventDefault();
              if (localNodes.length === 0) setDragOverIndex(0);
            }}
            onDragLeave={handleDragLeave}
            onDrop={e => handleDrop(e, localNodes.length)}
          >
            {sortedNodes.length === 0 ? (
              <div
                className={`flex flex-col items-center justify-center h-full text-center p-8 border-2 border-dashed rounded-lg transition-colors ${
                  dragOverIndex === 0 ? "border-primary bg-primary/5" : "border-muted"
                }`}
              >
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <ListIcon className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-lg font-medium mb-2">Arraste componentes aqui</p>
                <p className="text-sm text-muted-foreground">
                  Arraste itens da paleta à esquerda para começar
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedNodes.map((node, index) => {
                  const nodeInfo = getNodeInfo(node.nodeType);
                  const NodeIcon = nodeInfo.icon;
                  const isSelected = selectedNodeId === node.id;
                  const isFirst = index === 0;
                  const isLast = index === sortedNodes.length - 1;

                  return (
                    <div key={node.id}>
                      <div
                        className={`h-1 rounded-full transition-all mx-4 ${
                          dragOverIndex === index ? "bg-primary my-2" : "bg-transparent"
                        }`}
                        onDragOver={e => handleDragOver(e, index)}
                        onDragLeave={handleDragLeave}
                        onDrop={e => handleDrop(e, index)}
                      />
                      <div
                        draggable
                        onDragStart={e => handleNodeDragStart(e, node.id)}
                        onClick={() => setSelectedNodeId(node.id)}
                        className={`
                          flex items-center gap-3 p-3 rounded-lg border bg-card cursor-pointer transition-all
                          ${isSelected ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"}
                        `}
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab shrink-0" />
                        <div className={`p-2 rounded ${nodeInfo.color} shrink-0`}>
                          <NodeIcon className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{nodeInfo.label}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isFirst}
                            onClick={e => { e.stopPropagation(); handleMoveNode(node.id, -1); }}>
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isLast}
                            onClick={e => { e.stopPropagation(); handleMoveNode(node.id, 1); }}>
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Duplicar"
                            onClick={e => { e.stopPropagation(); handleDuplicateNode(node.id); }}>
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7"
                            onClick={e => { e.stopPropagation(); handleDeleteNode(node.id); }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div
                  className={`h-8 rounded-lg border-2 border-dashed transition-all ${
                    dragOverIndex === sortedNodes.length ? "border-primary bg-primary/5" : "border-transparent"
                  }`}
                  onDragOver={e => handleDragOver(e, sortedNodes.length)}
                  onDragLeave={handleDragLeave}
                  onDrop={e => handleDrop(e, sortedNodes.length)}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Config Panel */}
        {selectedNode && (
          <DispatchNodeConfigPanel
            node={selectedNode}
            onUpdate={config => handleUpdateNodeConfig(selectedNode.id, config)}
            onClose={() => setSelectedNodeId(null)}
          />
        )}
      </div>
    </div>
  );
}
