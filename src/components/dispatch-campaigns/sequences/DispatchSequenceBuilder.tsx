import { useState } from "react";
import { DispatchSequence } from "@/hooks/useDispatchSequences";
import { useDispatchSteps, DispatchStep } from "@/hooks/useDispatchSteps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Save, Plus, Play, Pause } from "lucide-react";
import { toast } from "sonner";
import { StepCard } from "./StepCard";
import { AddStepDialog } from "./AddStepDialog";
import { EditStepDialog } from "./EditStepDialog";

interface DispatchSequenceBuilderProps {
  sequence: DispatchSequence;
  onBack: () => void;
  onUpdate: (args: { id: string; updates: Partial<DispatchSequence> }) => Promise<void>;
}

export function DispatchSequenceBuilder({ sequence, onBack, onUpdate }: DispatchSequenceBuilderProps) {
  const { steps, isLoading, createStep, updateStep, deleteStep, reorderSteps } = useDispatchSteps(sequence.id);
  const [sequenceName, setSequenceName] = useState(sequence.name);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingStep, setEditingStep] = useState<DispatchStep | null>(null);

  const handleSave = async () => {
    try {
      await onUpdate({ id: sequence.id, updates: { name: sequenceName } });
      toast.success("Sequência salva!");
    } catch {
      toast.error("Erro ao salvar");
    }
  };

  const handleToggleActive = async () => {
    await onUpdate({ id: sequence.id, updates: { isActive: !sequence.isActive } });
  };

  const handleAddStep = async (stepType: string, messageType?: string) => {
    await createStep({
      stepType,
      stepOrder: steps.length,
      messageType,
    });
    setShowAddDialog(false);
  };

  const handleDeleteStep = async (stepId: string) => {
    await deleteStep(stepId);
  };

  const handleMoveStep = async (stepId: string, direction: -1 | 1) => {
    const sorted = [...steps].sort((a, b) => a.stepOrder - b.stepOrder);
    const idx = sorted.findIndex(s => s.id === stepId);
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= sorted.length) return;

    const reordered = [...sorted];
    [reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]];
    await reorderSteps(reordered.map(s => s.id));
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
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
        </div>
      </div>

      {/* Steps */}
      <div className="max-w-2xl mx-auto space-y-0">
        {steps.sort((a, b) => a.stepOrder - b.stepOrder).map((step, index) => (
          <div key={step.id}>
            <StepCard
              step={step}
              index={index}
              onEdit={() => setEditingStep(step)}
              onDelete={() => handleDeleteStep(step.id)}
              onMoveUp={() => handleMoveStep(step.id, -1)}
              onMoveDown={() => handleMoveStep(step.id, 1)}
              isFirst={index === 0}
              isLast={index === steps.length - 1}
            />
            {index < steps.length - 1 && (
              <div className="flex justify-center py-2">
                <div className="w-px h-8 bg-border" />
              </div>
            )}
          </div>
        ))}

        {/* Add Step Button */}
        {steps.length > 0 && (
          <div className="flex justify-center py-2">
            <div className="w-px h-8 bg-border" />
          </div>
        )}
        <Card
          className="border-dashed cursor-pointer hover:bg-accent transition-colors"
          onClick={() => setShowAddDialog(true)}
        >
          <CardContent className="flex items-center justify-center py-6">
            <Plus className="h-5 w-5 mr-2 text-muted-foreground" />
            <span className="text-muted-foreground font-medium">Adicionar Etapa</span>
          </CardContent>
        </Card>
      </div>

      <AddStepDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAdd={handleAddStep}
      />

      {editingStep && (
        <EditStepDialog
          step={editingStep}
          open={!!editingStep}
          onOpenChange={open => !open && setEditingStep(null)}
          onSave={async (updates) => {
            await updateStep({ id: editingStep.id, updates });
            setEditingStep(null);
          }}
        />
      )}
    </div>
  );
}
