import { useState, useRef, useCallback, useEffect } from "react";
import { MessageSequence, useSequenceNodes } from "@/hooks/useSequences";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  ArrowLeft, Save, Play, Pause, Trash2, GripVertical, ChevronDown,
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
  positionX: number;
  positionY: number;
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
  const canvasRef = useRef<HTMLDivElement>(null);
  const [localNodes, setLocalNodes] = useState<LocalNode[]>([]);
  const [localConnections, setLocalConnections] = useState<LocalConnection[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [sequenceName, setSequenceName] = useState(sequence.name);
  const [openCategories, setOpenCategories] = useState<string[]>(["messages", "media", "interactive", "flow"]);

  const { nodes, connections, isLoading, saveNodes, saveConnections, isSaving } = useSequenceNodes(sequence.id);

  useEffect(() => {
    if (nodes.length > 0 || connections.length > 0) {
      setLocalNodes(nodes.map(n => ({
        id: n.id,
        nodeType: n.nodeType,
        positionX: n.positionX,
        positionY: n.positionY,
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
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const nodeType = e.dataTransfer.getData("nodeType");
    if (!nodeType || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - 80;
    const y = e.clientY - rect.top - 30;

    const newNode: LocalNode = {
      id: generateNodeId(),
      nodeType,
      positionX: Math.max(0, x),
      positionY: Math.max(0, y),
      nodeOrder: localNodes.length,
      config: getDefaultConfig(nodeType),
    };

    setLocalNodes(prev => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
  }, [localNodes.length]);

  const getDefaultConfig = (nodeType: string): Record<string, unknown> => {
    switch (nodeType) {
      // Messages
      case "message":
        return { content: "", sendPrivate: false, mentionMember: false, viewOnce: false };
      
      // Media
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
      
      // Interactive
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
      
      // Flow
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

  const handleNodeDragStart = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setIsDragging(true);
    setDraggedNodeId(nodeId);
  };

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !draggedNodeId || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - 80;
    const y = e.clientY - rect.top - 30;

    setLocalNodes(prev => prev.map(node =>
      node.id === draggedNodeId
        ? { ...node, positionX: Math.max(0, x), positionY: Math.max(0, y) }
        : node
    ));
  }, [isDragging, draggedNodeId]);

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
    setDraggedNodeId(null);
  };

  const handleNodeClick = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (connectingFrom) {
      if (connectingFrom !== nodeId) {
        const existingConnection = localConnections.find(
          c => c.sourceNodeId === connectingFrom && c.targetNodeId === nodeId
        );
        if (!existingConnection) {
          setLocalConnections(prev => [...prev, {
            sourceNodeId: connectingFrom,
            targetNodeId: nodeId,
          }]);
        }
      }
      setConnectingFrom(null);
    } else {
      setSelectedNodeId(nodeId);
    }
  };

  const handleStartConnection = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConnectingFrom(nodeId);
  };

  const handleDeleteNode = (nodeId: string) => {
    setLocalNodes(prev => prev.filter(n => n.id !== nodeId));
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
      await saveNodes(localNodes);
      await saveConnections(localConnections);
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

  const renderConnections = () => {
    return localConnections.map((conn, index) => {
      const sourceNode = localNodes.find(n => n.id === conn.sourceNodeId);
      const targetNode = localNodes.find(n => n.id === conn.targetNodeId);
      if (!sourceNode || !targetNode) return null;

      const startX = sourceNode.positionX + 80;
      const startY = sourceNode.positionY + 60;
      const endX = targetNode.positionX + 80;
      const endY = targetNode.positionY;

      const midY = (startY + endY) / 2;

      return (
        <svg
          key={index}
          className="absolute inset-0 pointer-events-none"
          style={{ overflow: "visible" }}
        >
          <path
            d={`M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            strokeDasharray="none"
          />
          <circle cx={endX} cy={endY} r="4" fill="hsl(var(--primary))" />
        </svg>
      );
    });
  };

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
        {/* Node Palette with Categories */}
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

        {/* Canvas */}
        <Card className="flex-1 overflow-hidden">
          <div
            ref={canvasRef}
            className="relative w-full h-full bg-muted/30 overflow-auto"
            style={{ backgroundImage: "radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)", backgroundSize: "20px 20px" }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            onClick={() => { setSelectedNodeId(null); setConnectingFrom(null); }}
          >
            {renderConnections()}
            
            {localNodes.map(node => {
              const nodeInfo = getNodeInfo(node.nodeType);
              const NodeIcon = nodeInfo.icon;
              const isSelected = selectedNodeId === node.id;
              const isConnecting = connectingFrom === node.id;

              return (
                <div
                  key={node.id}
                  className={`absolute w-40 rounded-lg border-2 bg-card shadow-sm cursor-pointer transition-all ${
                    isSelected ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"
                  } ${isConnecting ? "ring-2 ring-green-500" : ""}`}
                  style={{ left: node.positionX, top: node.positionY }}
                  onClick={(e) => handleNodeClick(node.id, e)}
                >
                  <div
                    className="flex items-center gap-2 p-2 border-b cursor-grab"
                    onMouseDown={(e) => handleNodeDragStart(e, node.id)}
                  >
                    <GripVertical className="h-3 w-3 text-muted-foreground" />
                    <div className={`p-1 rounded ${nodeInfo.color}`}>
                      <NodeIcon className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-xs font-medium flex-1 truncate">{nodeInfo.label}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={(e) => { e.stopPropagation(); handleDeleteNode(node.id); }}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                  <div className="p-2 text-xs text-muted-foreground">
                    <p className="line-clamp-2 truncate">{getNodePreview(node)}</p>
                  </div>
                  {/* Connection point */}
                  <div
                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-primary bg-background cursor-crosshair hover:bg-primary transition-colors"
                    onClick={(e) => handleStartConnection(node.id, e)}
                  />
                </div>
              );
            })}

            {localNodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <p className="text-lg mb-2">Arraste componentes aqui</p>
                  <p className="text-sm">Comece arrastando um componente da paleta</p>
                </div>
              </div>
            )}
          </div>
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
