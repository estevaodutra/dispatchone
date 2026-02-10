import { useState } from "react";
import { DispatchSequence } from "@/hooks/useDispatchSequences";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Workflow, Trash2, Edit, Rocket, Calendar, Plug, UserPlus, Zap } from "lucide-react";

interface DispatchSequenceListProps {
  sequences: DispatchSequence[];
  isLoading: boolean;
  onEdit: (sequence: DispatchSequence) => void;
  onCreate: (data: {
    name: string;
    description?: string;
    triggerType: string;
    triggerConfig?: Record<string, unknown>;
  }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToggleActive: (id: string, isActive: boolean) => Promise<void>;
  isCreating: boolean;
}

const TRIGGER_TYPES = [
  { value: "manual", label: "Manual", description: "Disparo manual pelo admin", icon: Rocket },
  { value: "scheduled", label: "Agendado", description: "Disparo em data/hora específica", icon: Calendar },
  { value: "api", label: "Via API", description: "Disparo via API/n8n", icon: Plug },
  { value: "on_add", label: "Ao adicionar contato", description: "Inicia quando contato entra na campanha", icon: UserPlus },
  { value: "action", label: "Acionador por Ação", description: "Dispara quando uma ação específica é executada", icon: Zap },
];

export function DispatchSequenceList({
  sequences, isLoading, onEdit, onCreate, onDelete, onToggleActive, isCreating,
}: DispatchSequenceListProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", triggerType: "manual" });

  const handleCreate = async () => {
    await onCreate(form);
    setShowCreate(false);
    setForm({ name: "", description: "", triggerType: "manual" });
  };

  const getTriggerInfo = (type: string) =>
    TRIGGER_TYPES.find(t => t.value === type) || TRIGGER_TYPES[0];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40" />)}
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
            Crie fluxos de mensagens automatizadas para seus contatos
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
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
              Crie sua primeira sequência de mensagens automatizadas.
            </p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Sequência
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sequences.map(seq => {
            const trigger = getTriggerInfo(seq.triggerType);
            const TriggerIcon = trigger.icon;
            return (
              <Card key={seq.id} className="group hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Workflow className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{seq.name}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <TriggerIcon className="h-3 w-3" />
                          {trigger.label}
                        </CardDescription>
                      </div>
                    </div>
                    <Switch
                      checked={seq.isActive}
                      onCheckedChange={checked => onToggleActive(seq.id, checked)}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  {seq.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{seq.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <Badge variant={seq.isActive ? "default" : "secondary"}>
                      {seq.isActive ? "Ativa" : "Inativa"}
                    </Badge>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => onEdit(seq)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onDelete(seq.id)}>
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

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nova Sequência</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Sequência *</Label>
              <Input
                placeholder="Ex: Boas-vindas"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                placeholder="Descreva o objetivo..."
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Gatilho *</Label>
              <RadioGroup value={form.triggerType} onValueChange={v => setForm({ ...form, triggerType: v })}>
                {TRIGGER_TYPES.map(trigger => {
                  const Icon = trigger.icon;
                  return (
                    <div key={trigger.value} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent cursor-pointer">
                      <RadioGroupItem value={trigger.value} id={trigger.value} />
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <Label htmlFor={trigger.value} className="font-medium cursor-pointer">{trigger.label}</Label>
                        <p className="text-xs text-muted-foreground">{trigger.description}</p>
                      </div>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!form.name.trim() || isCreating}>
              {isCreating ? "Criando..." : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
