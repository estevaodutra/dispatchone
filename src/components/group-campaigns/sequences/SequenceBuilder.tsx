import { useState, useCallback, useEffect } from "react";
import { MessageSequence, useSequenceNodes } from "@/hooks/useSequences";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  ArrowLeft, Save, Play, Pause, Trash2, GripVertical, ChevronDown, ChevronUp,
  MessageSquare, Clock, GitBranch, Bell, Link2,
  Image, Video, Music, FileText, Smile,
  BarChart3, MousePointerClick, List, MapPin, Contact, Calendar
} from "lucide-react";
import { toast } from "sonner";
import { NodeConfigPanel } from "./NodeConfigPanel";

interface SequenceBuilderProps {
  sequence: MessageSequence;
  onBack: () => void;
  onUpdate: (args: { id: string; updates: Partial<MessageSequence> }) => Promise<void>;
}

interface LocalNode {
  id: string;
  nodeType: string;
  nodeOrder: number;
  config: Record<string, unknown>;
}

interface LocalConnection {
  sourceNodeId: string;
  targetNodeId: string;
  conditionPath?: string;
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
      { type: "sticker", label: "Figurinha", icon: Smile, color: "bg-yellow-500" },
    ],
  },
  {
    id: "interactive",
    label: "Interativo",
    nodes: [
      { type: "poll", label: "Enquete", icon: BarChart3, color: "bg-indigo-500" },
      { type: "buttons", label: "Botões", icon: MousePointerClick, color: "bg-orange-500" },
      { type: "list", label: "Lista", icon: List, color: "bg-teal-500" },
      { type: "location", label: "Localização", icon: MapPin, color: "bg-red-500" },
      { type: "contact", label: "Contato", icon: Contact, color: "bg-violet-500" },
      { type: "event", label: "Evento", icon: Calendar, color: "bg-sky-500" },
    ],
  },
  {
    id: "flow",
    label: "Fluxo",
    nodes: [
      { type: "delay", label: "Delay", icon: Clock, color: "bg-amber-500" },
      { type: "condition", label: "Condição", icon: GitBranch, color: "bg-purple-500" },
      { type: "notify", label: "Notificar", icon: Bell, color: "bg-green-500" },
      { type: "webhook", label: "Webhook", icon: Link2, color: "bg-rose-500" },
    ],
  },
];

// Flatten for quick lookup
const ALL_NODE_TYPES = NODE_CATEGORIES.flatMap(cat => cat.nodes);

export function SequenceBuilder({ sequence, onBack, onUpdate }: SequenceBuilderProps) {
  const [localNodes, setLocalNodes] = useState<LocalNode[]>([]);
  const [localConnections, setLocalConnections] = useState<LocalConnection[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [sequenceName, setSequenceName] = useState(sequence.name);
  const [openCategories, setOpenCategories] = useState<string[]>(["messages", "media", "interactive", "flow"]);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const { nodes, connections, saveNodes, saveConnections, isSaving } = useSequenceNodes(sequence.id);

  useEffect(() => {
    if (nodes.length > 0 || connections.length > 0) {
      setLocalNodes(nodes.map(n => ({
        id: n.id,
        nodeType: n.nodeType,
        nodeOrder: n.nodeOrder,
        config: n.config,
      })));
      setLocalConnections(connections.map(c => ({
        sourceNodeId: c.sourceNodeId,
        targetNodeId: c.targetNodeId,
        conditionPath: c.conditionPath || undefined,
      })));
    }
  }, [nodes, connections]);

  const generateNodeId = () => `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = useCallback((e: React.DragEvent, targetIndex?: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    
    const source = e.dataTransfer.getData("source");
    
    if (source === "palette") {
      // Adding new node from palette
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
      // Reordering existing node
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

  const getDefaultConfig = (nodeType: string): Record<string, unknown> => {
    switch (nodeType) {
      case "message":
        return { content: "", sendPrivate: false, mentionMember: false, viewOnce: false };
      case "image":
        return { url: "", caption: "", sendPrivate: false, viewOnce: false };
      case "video":
        return { url: "", caption: "", sendPrivate: false, isVideoNote: false, viewOnce: false };
      case "audio":
        return { url: "", isVoiceMessage: true, sendPrivate: false, viewOnce: false };
      case "document":
        return { url: "", filename: "", caption: "", sendPrivate: false, viewOnce: false };
      case "sticker":
        return { url: "", sendPrivate: false, viewOnce: false };
      case "poll":
        return { question: "", options: ["", "", ""], multiSelect: false };
      case "buttons":
        return { text: "", buttons: [{ id: "1", text: "" }] };
      case "list":
        return { 
          title: "", 
          buttonText: "Selecionar",
          sections: [{ title: "Opções", rows: [{ id: "1", title: "", description: "" }] }]
        };
      case "location":
        return { latitude: "", longitude: "", name: "", address: "" };
      case "contact":
        return { fullName: "", phone: "", email: "", organization: "" };
      case "event":
        return { name: "", description: "", startDate: "", endDate: "", location: "" };
      case "delay":
        return { seconds: 0, minutes: 5, hours: 0, days: 0 };
      case "condition":
        return { field: "member_count", operator: "greater_than", value: 0 };
      case "notify":
        return { message: "", notifyAdmins: true };
      case "webhook":
        return { url: "", method: "POST", body: "" };
      default:
        return {};
    }
  };

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
    setLocalNodes(prev => {
      const filtered = prev.filter(n => n.id !== nodeId);
      return filtered.map((node, idx) => ({ ...node, nodeOrder: idx }));
    });
    setLocalConnections(prev => prev.filter(c => c.sourceNodeId !== nodeId && c.targetNodeId !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  };

  const handleUpdateNodeConfig = (nodeId: string, config: Record<string, unknown>) => {
    setLocalNodes(prev => prev.map(node =>
      node.id === nodeId ? { ...node, config } : node
    ));
  };

  const handleSave = async () => {
    try {
      await onUpdate({ id: sequence.id, updates: { name: sequenceName } });
      
      const idMapping = await saveNodes(localNodes.map(node => ({
        localId: node.id,
        nodeType: node.nodeType,
        positionX: 0,
        positionY: node.nodeOrder * 100,
        nodeOrder: node.nodeOrder,
        config: node.config,
      })));
      
      await saveConnections({ 
        connectionsToSave: localConnections, 
        idMapping 
      });
      
      toast.success("Sequência salva com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar sequência");
    }
  };

  const handleToggleActive = async () => {
    await onUpdate({ id: sequence.id, updates: { active: !sequence.active } });
  };

  const toggleCategory = (catId: string) => {
    setOpenCategories(prev => 
      prev.includes(catId) 
        ? prev.filter(id => id !== catId) 
        : [...prev, catId]
    );
  };

  const getNodeInfo = (type: string) => ALL_NODE_TYPES.find(n => n.type === type) || ALL_NODE_TYPES[0];
  const selectedNode = localNodes.find(n => n.id === selectedNodeId);

  const getNodePreview = (node: LocalNode) => {
    const config = node.config;
    switch (node.nodeType) {
      case "message":
        return String(config.content || "Sem conteúdo");
      case "image":
        return config.url ? "📷 Imagem" : "Sem URL";
      case "video":
        return config.url ? "🎬 Vídeo" : "Sem URL";
      case "audio":
        return config.isVoiceMessage ? "🎤 Voz" : "🎵 Áudio";
      case "document":
        return String(config.filename || "📄 Documento");
      case "sticker":
        return "😊 Sticker";
      case "poll":
        return String(config.question || "Enquete");
      case "buttons":
        return `${(config.buttons as unknown[])?.length || 0} botões`;
      case "list":
        return String(config.title || "Lista");
      case "location":
        return String(config.name || "📍 Localização");
      case "contact":
        return String(config.fullName || "👤 Contato");
      case "event":
        return String(config.name || "📅 Evento");
      case "delay":
        return `${config.minutes || 0}min ${config.seconds || 0}s`;
      case "condition":
        return `${config.field || ""} ${config.operator || ""}`;
      case "notify":
        return String(config.message || "Notificação");
      case "webhook":
        return String(config.url || "URL não definida");
      default:
        return "Configurar...";
    }
  };

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
            onChange={(e) => setSequenceName(e.target.value)}
            className="text-lg font-semibold w-64"
          />
          <Badge variant={sequence.active ? "default" : "secondary"}>
            {sequence.active ? "Ativa" : "Inativa"}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleToggleActive}>
            {sequence.active ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            {sequence.active ? "Pausar" : "Ativar"}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      <div className="flex gap-4 h-[calc(100vh-280px)] min-h-[500px]">
        {/* Node Palette */}
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
                      onDragStart={(e) => handleDragStart(e, node.type)}
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

        {/* Canvas - List View */}
        <Card className="flex-1 overflow-hidden flex flex-col">
          <CardHeader className="pb-3 border-b shrink-0">
            <CardTitle className="text-sm">Canvas</CardTitle>
          </CardHeader>
          <CardContent 
            className="flex-1 p-4 overflow-y-auto"
            onDragOver={(e) => {
              e.preventDefault();
              if (localNodes.length === 0) setDragOverIndex(0);
            }}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, localNodes.length)}
          >
            {sortedNodes.length === 0 ? (
              <div 
                className={`flex flex-col items-center justify-center h-full text-center p-8 border-2 border-dashed rounded-lg transition-colors ${
                  dragOverIndex === 0 ? "border-primary bg-primary/5" : "border-muted"
                }`}
              >
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <List className="h-8 w-8 text-muted-foreground" />
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
                      {/* Drop zone indicator */}
                      <div
                        className={`h-1 rounded-full transition-all mx-4 ${
                          dragOverIndex === index ? "bg-primary my-2" : "bg-transparent"
                        }`}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, index)}
                      />
                      
                      {/* Node item */}
                      <div
                        draggable
                        onDragStart={(e) => handleNodeDragStart(e, node.id)}
                        onClick={() => setSelectedNodeId(node.id)}
                        className={`
                          flex items-center gap-3 p-3 rounded-lg border bg-card cursor-pointer transition-all
                          ${isSelected ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"}
                        `}
                      >
                        {/* Grip */}
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab shrink-0" />
                        
                        {/* Icon */}
                        <div className={`p-2 rounded ${nodeInfo.color} shrink-0`}>
                          <NodeIcon className="h-4 w-4 text-white" />
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{nodeInfo.label}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {getNodePreview(node)}
                          </p>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7"
                            disabled={isFirst}
                            onClick={(e) => { e.stopPropagation(); handleMoveNode(node.id, -1); }}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7"
                            disabled={isLast}
                            onClick={(e) => { e.stopPropagation(); handleMoveNode(node.id, 1); }}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={(e) => { e.stopPropagation(); handleDeleteNode(node.id); }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* Final drop zone */}
                <div
                  className={`h-8 rounded-lg border-2 border-dashed transition-all ${
                    dragOverIndex === sortedNodes.length ? "border-primary bg-primary/5" : "border-transparent"
                  }`}
                  onDragOver={(e) => handleDragOver(e, sortedNodes.length)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, sortedNodes.length)}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Config Panel */}
        {selectedNode && (
          <NodeConfigPanel
            node={selectedNode}
            onUpdate={(config) => handleUpdateNodeConfig(selectedNode.id, config)}
            onClose={() => setSelectedNodeId(null)}
          />
        )}
      </div>
    </div>
  );
}
