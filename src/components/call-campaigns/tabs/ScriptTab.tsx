import { useState } from "react";
import { useCallScript, CallScriptNode } from "@/hooks/useCallScript";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Circle,
  MessageSquare,
  HelpCircle,
  StickyNote,
  XCircle,
  Plus,
  Save,
  Trash2,
  GripVertical,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ScriptTabProps {
  campaignId: string;
}

const nodeTypeConfig = {
  start: { icon: Circle, color: "bg-green-100 text-green-800", label: "Início" },
  speech: { icon: MessageSquare, color: "bg-blue-100 text-blue-800", label: "Fala" },
  question: { icon: HelpCircle, color: "bg-purple-100 text-purple-800", label: "Pergunta" },
  note: { icon: StickyNote, color: "bg-yellow-100 text-yellow-800", label: "Nota" },
  end: { icon: XCircle, color: "bg-red-100 text-red-800", label: "Fim" },
};

export function ScriptTab({ campaignId }: ScriptTabProps) {
  const { script, isLoading, saveScript, isSaving } = useCallScript(campaignId);
  const [nodes, setNodes] = useState<CallScriptNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize nodes from script
  useState(() => {
    if (script?.nodes) {
      setNodes([...script.nodes].sort((a, b) => a.order - b.order));
    }
  });

  // Update local state when script loads
  if (script && nodes.length === 0 && script.nodes.length > 0) {
    setNodes([...script.nodes].sort((a, b) => a.order - b.order));
  }

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  const handleAddNode = (type: CallScriptNode["type"]) => {
    const newNode: CallScriptNode = {
      id: `${type}-${Date.now()}`,
      type,
      data: { text: "" },
      order: nodes.length,
    };
    
    // Insert before the last node (end) if it exists
    const endIndex = nodes.findIndex((n) => n.type === "end");
    if (endIndex > -1 && type !== "end") {
      const newNodes = [...nodes];
      newNodes.splice(endIndex, 0, newNode);
      // Reorder
      newNodes.forEach((n, i) => (n.order = i));
      setNodes(newNodes);
    } else {
      setNodes([...nodes, newNode]);
    }
    setHasChanges(true);
    setSelectedNodeId(newNode.id);
  };

  const handleUpdateNode = (id: string, updates: Partial<CallScriptNode["data"]>) => {
    setNodes(
      nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...updates } } : n
      )
    );
    setHasChanges(true);
  };

  const handleDeleteNode = (id: string) => {
    const node = nodes.find((n) => n.id === id);
    if (node?.type === "start" || node?.type === "end") return; // Cannot delete start/end
    
    setNodes(nodes.filter((n) => n.id !== id));
    setHasChanges(true);
    if (selectedNodeId === id) setSelectedNodeId(null);
  };

  const handleSave = async () => {
    if (!script) return;
    
    // Generate edges based on node order
    const edges = nodes.slice(0, -1).map((node, i) => ({
      id: `edge-${i}`,
      source: node.id,
      target: nodes[i + 1].id,
    }));

    await saveScript({ nodes, edges });
    setHasChanges(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Palette */}
      <Card>
        <CardHeader>
          <CardTitle>Componentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(["speech", "question", "note"] as const).map((type) => {
            const config = nodeTypeConfig[type];
            const Icon = config.icon;
            return (
              <Button
                key={type}
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleAddNode(type)}
              >
                <Icon className="mr-2 h-4 w-4" />
                {config.label}
              </Button>
            );
          })}
        </CardContent>
      </Card>

      {/* Canvas */}
      <Card className="lg:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Roteiro</CardTitle>
          <Button onClick={handleSave} disabled={!hasChanges || isSaving} size="sm">
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {nodes.map((node) => {
            const config = nodeTypeConfig[node.type];
            const Icon = config.icon;
            const isSelected = selectedNodeId === node.id;
            
            return (
              <div
                key={node.id}
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                }`}
                onClick={() => setSelectedNodeId(node.id)}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <Badge className={config.color}>
                  <Icon className="h-3 w-3 mr-1" />
                  {config.label}
                </Badge>
                <span className="flex-1 text-sm truncate">
                  {node.data.text || "(vazio)"}
                </span>
                {node.type !== "start" && node.type !== "end" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteNode(node.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Config Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Configuração</CardTitle>
        </CardHeader>
        <CardContent>
          {selectedNode ? (
            <div className="space-y-4">
              <div>
                <Badge className={nodeTypeConfig[selectedNode.type].color}>
                  {nodeTypeConfig[selectedNode.type].label}
                </Badge>
              </div>
              
              {selectedNode.type === "question" ? (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Pergunta</label>
                    <Textarea
                      value={selectedNode.data.text || ""}
                      onChange={(e) =>
                        handleUpdateNode(selectedNode.id, { text: e.target.value })
                      }
                      placeholder="Digite a pergunta..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Opções de Resposta</label>
                    {(selectedNode.data.options || []).map((opt, i) => (
                      <div key={i} className="flex gap-2">
                        <Input
                          value={opt}
                          onChange={(e) => {
                            const newOptions = [...(selectedNode.data.options || [])];
                            newOptions[i] = e.target.value;
                            handleUpdateNode(selectedNode.id, { options: newOptions });
                          }}
                          placeholder={`Opção ${i + 1}`}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newOptions = (selectedNode.data.options || []).filter(
                              (_, idx) => idx !== i
                            );
                            handleUpdateNode(selectedNode.id, { options: newOptions });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newOptions = [...(selectedNode.data.options || []), ""];
                        handleUpdateNode(selectedNode.id, { options: newOptions });
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar Opção
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Texto</label>
                  <Textarea
                    value={selectedNode.data.text || ""}
                    onChange={(e) =>
                      handleUpdateNode(selectedNode.id, { text: e.target.value })
                    }
                    placeholder={
                      selectedNode.type === "speech"
                        ? "Digite o texto para falar..."
                        : selectedNode.type === "note"
                        ? "Digite uma nota interna..."
                        : "Texto..."
                    }
                    rows={4}
                    disabled={selectedNode.type === "start" || selectedNode.type === "end"}
                  />
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Selecione um componente do roteiro para editar.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
