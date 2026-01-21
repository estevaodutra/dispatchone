import { useState } from "react";
import { MessageSequence } from "@/hooks/useSequences";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Workflow, Trash2, Edit, Users, MessageSquare, Clock, Keyboard } from "lucide-react";

interface SequenceListProps {
  sequences: MessageSequence[];
  isLoading: boolean;
  onEdit: (sequence: MessageSequence) => void;
  onCreate: (data: { name: string; description?: string; triggerType: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToggleActive: (id: string, active: boolean) => Promise<void>;
  isCreating: boolean;
}

const TRIGGER_TYPES = [
  { value: "member_join", label: "Novo membro entra", icon: Users },
  { value: "member_leave", label: "Membro sai", icon: Users },
  { value: "keyword", label: "Palavra-chave", icon: Keyboard },
  { value: "scheduled", label: "Agendado", icon: Clock },
  { value: "manual", label: "Manual", icon: MessageSquare },
];

export function SequenceList({
  sequences,
  isLoading,
  onEdit,
  onCreate,
  onDelete,
  onToggleActive,
  isCreating,
}: SequenceListProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    triggerType: "manual",
  });

  const handleCreate = async () => {
    await onCreate(formData);
    setShowCreateDialog(false);
    setFormData({ name: "", description: "", triggerType: "manual" });
  };

  const getTriggerInfo = (type: string) => {
    return TRIGGER_TYPES.find(t => t.value === type) || TRIGGER_TYPES[4];
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Sequências de Automação</h2>
          <p className="text-sm text-muted-foreground">
            Crie fluxos de mensagens e ações automatizadas
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Sequência
        </Button>
      </div>

      {sequences.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Workflow className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma sequência criada</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Crie sua primeira sequência para automatizar mensagens e ações no grupo.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Sequência
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sequences.map(sequence => {
            const triggerInfo = getTriggerInfo(sequence.triggerType);
            const TriggerIcon = triggerInfo.icon;
            
            return (
              <Card key={sequence.id} className="group hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Workflow className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{sequence.name}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <TriggerIcon className="h-3 w-3" />
                          {triggerInfo.label}
                        </CardDescription>
                      </div>
                    </div>
                    <Switch
                      checked={sequence.active}
                      onCheckedChange={(checked) => onToggleActive(sequence.id, checked)}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  {sequence.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {sequence.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <Badge variant={sequence.active ? "default" : "secondary"}>
                      {sequence.active ? "Ativa" : "Inativa"}
                    </Badge>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(sequence)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(sequence.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Sequência</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Sequência</Label>
              <Input
                id="name"
                placeholder="Ex: Boas-vindas completo"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                placeholder="Descreva o objetivo desta sequência..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Gatilho</Label>
              <Select
                value={formData.triggerType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, triggerType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_TYPES.map(trigger => (
                    <SelectItem key={trigger.value} value={trigger.value}>
                      <div className="flex items-center gap-2">
                        <trigger.icon className="h-4 w-4" />
                        {trigger.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!formData.name || isCreating}>
              {isCreating ? "Criando..." : "Criar e Editar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
