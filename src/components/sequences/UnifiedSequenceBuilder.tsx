import { useState, useCallback, useEffect, ReactNode } from "react";
import { LocalNode, LocalConnection, NodeCategory, NodeTypeInfo } from "./shared-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ArrowLeft, Save, Play, Pause, Trash2, GripVertical, ChevronDown, ChevronUp, Copy, List,
} from "lucide-react";

export interface UnifiedSequenceBuilderProps {
  sequenceName: string;
  isActive: boolean;
  sequenceId: string;
  nodeCategories: NodeCategory[];
  getDefaultConfig: (nodeType: string) => Record<string, unknown>;
  getNodePreview?: (node: LocalNode) => string;
  renderTrigger: () => ReactNode;
  renderConfigPanel: (node: LocalNode, onUpdate: (config: Record<string, unknown>) => void, onClose: () => void, onManualSend?: () => void, isSendingManual?: boolean) => ReactNode;
  onSave: (name: string, nodes: LocalNode[], connections: LocalConnection[]) => Promise<void>;
  onToggleActive: () => Promise<void>;
  onManualSendNode?: (node: LocalNode) => Promise<void>;
  onBack: () => void;
  initialNodes: LocalNode[];
  initialConnections: LocalConnection[];
  isSaving: boolean;
}

const ALL_NODES_FROM = (categories: NodeCategory[]): NodeTypeInfo[] =>
  categories.flatMap(cat => cat.nodes);

export function UnifiedSequenceBuilder({
  sequenceName: initialName,
  isActive,
  nodeCategories,
  getDefaultConfig,
  renderTrigger,
  renderConfigPanel,
  onSave,
  onToggleActive,
  onManualSendNode,
  onBack,
  initialNodes,
  initialConnections,
  isSaving,
}: UnifiedSequenceBuilderProps) {
  const [localNodes, setLocalNodes] = useState<LocalNode[]>(initialNodes);
  const [localConnections, setLocalConnections] = useState<LocalConnection[]>(initialConnections);

  useEffect(() => {
    setLocalNodes(initialNodes);
  }, [initialNodes]);

  useEffect(() => {
    setLocalConnections(initialConnections);
  }, [initialConnections]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [sequenceName, setSequenceName] = useState(initialName);
  const [openCategories, setOpenCategories] = useState<string[]>(nodeCategories.map(c => c.id));
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isSendingManual, setIsSendingManual] = useState(false);

  const allNodeTypes = ALL_NODES_FROM(nodeCategories);

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
  }, [localNodes.length, getDefaultConfig]);

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
    setLocalConnections(prev => prev.filter(c => c.sourceNodeId !== nodeId && c.targetNodeId !== nodeId));
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
    await onSave(sequenceName, localNodes, localConnections);
  };

  const toggleCategory = (catId: string) => {
    setOpenCategories(prev =>
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  };

  const getNodeInfo = (type: string) => allNodeTypes.find(n => n.type === type) || allNodeTypes[0];
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
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Ativa" : "Inativa"}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onToggleActive}>
            {isActive ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            {isActive ? "Pausar" : "Ativar"}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      {/* Trigger */}
      {renderTrigger()}

      {/* 3-Panel Layout */}
      <div className="flex gap-4 h-[calc(100vh-380px)] min-h-[400px]">
        {/* Palette */}
        <Card className="w-52 shrink-0 overflow-y-auto">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Componentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-3">
            {nodeCategories.map(category => (
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
        {selectedNode && renderConfigPanel(
          selectedNode,
          (config) => handleUpdateNodeConfig(selectedNode.id, config),
          () => setSelectedNodeId(null)
        )}
      </div>
    </div>
  );
}
