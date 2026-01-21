import { useState } from "react";
import { useGroupMessages, GroupMessage, MessageType } from "@/hooks/useGroupMessages";
import { useSequences } from "@/hooks/useSequences";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Trash2,
  MessageSquare,
  Hand,
  Clock,
  Hash,
  Loader2,
  Edit,
  GitBranch,
  Info,
  Calendar,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MessagesTabProps {
  campaignId: string;
}

const MESSAGE_TYPES = [
  {
    value: "welcome" as MessageType,
    label: "Boas-vindas",
    description: "Quando membro entra",
    icon: Hand,
    color: "text-green-500",
    bgColor: "bg-green-50 dark:bg-green-950",
    borderColor: "border-green-300 dark:border-green-700",
  },
  {
    value: "farewell" as MessageType,
    label: "Despedida",
    description: "Quando membro sai",
    icon: MessageSquare,
    color: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950",
    borderColor: "border-blue-300 dark:border-blue-700",
  },
  {
    value: "scheduled" as MessageType,
    label: "Agendada",
    description: "Horários programados",
    icon: Clock,
    color: "text-orange-500",
    bgColor: "bg-orange-50 dark:bg-orange-950",
    borderColor: "border-orange-300 dark:border-orange-700",
  },
  {
    value: "keyword_response" as MessageType,
    label: "Palavra-chave",
    description: "Resposta a comandos",
    icon: Hash,
    color: "text-purple-500",
    bgColor: "bg-purple-50 dark:bg-purple-950",
    borderColor: "border-purple-300 dark:border-purple-700",
  },
];

const WEEK_DAYS = [
  { value: 0, label: "D", fullLabel: "Dom" },
  { value: 1, label: "S", fullLabel: "Seg" },
  { value: 2, label: "T", fullLabel: "Ter" },
  { value: 3, label: "Q", fullLabel: "Qua" },
  { value: 4, label: "Q", fullLabel: "Qui" },
  { value: 5, label: "S", fullLabel: "Sex" },
  { value: 6, label: "S", fullLabel: "Sáb" },
];

export function MessagesTab({ campaignId }: MessagesTabProps) {
  const {
    welcomeMessages,
    farewellMessages,
    scheduledMessages,
    keywordResponses,
    isLoading,
    createMessage,
    updateMessage,
    deleteMessage,
    isCreating,
  } = useGroupMessages(campaignId);

  const { sequences } = useSequences(campaignId);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingMessage, setEditingMessage] = useState<GroupMessage | null>(null);
  const [newTime, setNewTime] = useState("");
  const [formData, setFormData] = useState({
    type: "welcome" as MessageType,
    content: "",
    triggerKeyword: "",
    sendPrivate: false,
    mentionMember: false,
    delaySeconds: 0,
    sequenceId: "",
    scheduleDays: [] as number[],
    scheduleTimes: [] as string[],
  });

  const resetForm = () => {
    setFormData({
      type: "welcome",
      content: "",
      triggerKeyword: "",
      sendPrivate: false,
      mentionMember: false,
      delaySeconds: 0,
      sequenceId: "",
      scheduleDays: [],
      scheduleTimes: [],
    });
    setNewTime("");
  };

  const toggleDay = (day: number) => {
    setFormData(prev => ({
      ...prev,
      scheduleDays: prev.scheduleDays.includes(day)
        ? prev.scheduleDays.filter(d => d !== day)
        : [...prev.scheduleDays, day].sort((a, b) => a - b)
    }));
  };

  const addTime = () => {
    if (newTime && !formData.scheduleTimes.includes(newTime)) {
      setFormData(prev => ({
        ...prev,
        scheduleTimes: [...prev.scheduleTimes, newTime].sort()
      }));
      setNewTime("");
    }
  };

  const removeTime = (time: string) => {
    setFormData(prev => ({
      ...prev,
      scheduleTimes: prev.scheduleTimes.filter(t => t !== time)
    }));
  };

  const handleCreate = async () => {
    await createMessage({
      type: formData.type,
      content: formData.sequenceId ? "" : formData.content,
      triggerKeyword: formData.type === "keyword_response" ? formData.triggerKeyword : undefined,
      schedule: formData.type === "scheduled" ? {
        days: formData.scheduleDays,
        times: formData.scheduleTimes,
      } : undefined,
      sendPrivate: formData.sendPrivate,
      mentionMember: formData.mentionMember,
      delaySeconds: formData.delaySeconds,
      sequenceId: formData.sequenceId || undefined,
    });
    resetForm();
    setShowCreateDialog(false);
  };

  const handleUpdate = async () => {
    if (!editingMessage) return;
    await updateMessage({
      id: editingMessage.id,
      updates: {
        content: formData.sequenceId ? "" : formData.content,
        triggerKeyword: formData.type === "keyword_response" ? formData.triggerKeyword : null,
        schedule: formData.type === "scheduled" ? {
          days: formData.scheduleDays,
          times: formData.scheduleTimes,
        } : null,
        sendPrivate: formData.sendPrivate,
        mentionMember: formData.mentionMember,
        delaySeconds: formData.delaySeconds,
        sequenceId: formData.sequenceId || null,
      },
    });
    setEditingMessage(null);
    resetForm();
  };

  const openEditDialog = (message: GroupMessage) => {
    setEditingMessage(message);
    setFormData({
      type: message.type,
      content: message.content,
      triggerKeyword: message.triggerKeyword || "",
      sendPrivate: message.sendPrivate,
      mentionMember: message.mentionMember,
      delaySeconds: message.delaySeconds,
      sequenceId: message.sequenceId || "",
      scheduleDays: (message.schedule?.days as number[]) || [],
      scheduleTimes: (message.schedule?.times as string[]) || [],
    });
    setNewTime("");
  };

  const getSequenceName = (sequenceId: string | null) => {
    if (!sequenceId) return null;
    return sequences.find(s => s.id === sequenceId)?.name || "Sequência";
  };

  const MessageCard = ({ message, onEdit, onDelete }: { message: GroupMessage; onEdit: () => void; onDelete: () => void }) => {
    const scheduleDays = (message.schedule?.days as number[]) || [];
    const scheduleTimes = (message.schedule?.times as string[]) || [];
    
    return (
      <Card className="mb-2">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {message.sequenceId ? (
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <GitBranch className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Dispara: {getSequenceName(message.sequenceId)}
                  </span>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              )}
              
              {/* Schedule info for scheduled messages */}
              {message.type === "scheduled" && (scheduleDays.length > 0 || scheduleTimes.length > 0) && (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Calendar className="h-3.5 w-3.5 text-orange-500" />
                  {scheduleDays.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {scheduleDays.map(d => WEEK_DAYS[d]?.fullLabel).join(", ")}
                    </span>
                  )}
                  {scheduleTimes.length > 0 && (
                    <>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">
                        {scheduleTimes.join(", ")}
                      </span>
                    </>
                  )}
                </div>
              )}
              
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {message.triggerKeyword && (
                  <Badge variant="outline">
                    <Hash className="mr-1 h-3 w-3" />
                    {message.triggerKeyword}
                  </Badge>
                )}
                {message.sendPrivate && (
                  <Badge variant="secondary">Privado</Badge>
                )}
                {message.mentionMember && (
                  <Badge variant="secondary">Menciona</Badge>
                )}
                {message.delaySeconds > 0 && (
                  <Badge variant="secondary">
                    <Clock className="mr-1 h-3 w-3" />
                    {message.delaySeconds}s
                  </Badge>
                )}
                <Badge variant={message.active ? "default" : "secondary"}>
                  {message.active ? "Ativo" : "Inativo"}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-48" />)}
      </div>
    );
  }

  const isScheduleValid = formData.type !== "scheduled" || 
    (formData.scheduleDays.length > 0 && formData.scheduleTimes.length > 0);
  const isFormValid = (formData.sequenceId || formData.content.trim()) && isScheduleValid;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Mensagens Automáticas</h2>
          <p className="text-sm text-muted-foreground">
            Configure mensagens de boas-vindas, despedida, agendadas e respostas automáticas.
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Mensagem
        </Button>
      </div>

      {/* Variables Help */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Variáveis Disponíveis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">{"{{nome}}"}</Badge>
            <Badge variant="outline">{"{{telefone}}"}</Badge>
            <Badge variant="outline">{"{{grupo}}"}</Badge>
            <Badge variant="outline">{"{{data}}"}</Badge>
            <Badge variant="outline">{"{{hora}}"}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Messages Accordion */}
      <Accordion type="multiple" defaultValue={["welcome", "farewell", "scheduled", "keyword"]} className="space-y-4">
        <AccordionItem value="welcome" className="border rounded-lg px-4">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <Hand className="h-4 w-4" />
              Mensagens de Boas-vindas
              <Badge variant="secondary">{welcomeMessages.length}</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            {welcomeMessages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma mensagem de boas-vindas configurada.
              </p>
            ) : (
              welcomeMessages.map((msg) => (
                <MessageCard
                  key={msg.id}
                  message={msg}
                  onEdit={() => openEditDialog(msg)}
                  onDelete={() => deleteMessage(msg.id)}
                />
              ))
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="farewell" className="border rounded-lg px-4">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Mensagens de Despedida
              <Badge variant="secondary">{farewellMessages.length}</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            {farewellMessages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma mensagem de despedida configurada.
              </p>
            ) : (
              farewellMessages.map((msg) => (
                <MessageCard
                  key={msg.id}
                  message={msg}
                  onEdit={() => openEditDialog(msg)}
                  onDelete={() => deleteMessage(msg.id)}
                />
              ))
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="scheduled" className="border rounded-lg px-4">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Mensagens Agendadas
              <Badge variant="secondary">{scheduledMessages.length}</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            {scheduledMessages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma mensagem agendada configurada.
              </p>
            ) : (
              scheduledMessages.map((msg) => (
                <MessageCard
                  key={msg.id}
                  message={msg}
                  onEdit={() => openEditDialog(msg)}
                  onDelete={() => deleteMessage(msg.id)}
                />
              ))
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="keyword" className="border rounded-lg px-4">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Respostas por Palavra-chave
              <Badge variant="secondary">{keywordResponses.length}</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            {keywordResponses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma resposta por palavra-chave configurada.
              </p>
            ) : (
              keywordResponses.map((msg) => (
                <MessageCard
                  key={msg.id}
                  message={msg}
                  onEdit={() => openEditDialog(msg)}
                  onDelete={() => deleteMessage(msg.id)}
                />
              ))
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog || !!editingMessage} onOpenChange={(open) => {
        if (!open) {
          setShowCreateDialog(false);
          setEditingMessage(null);
          resetForm();
        }
      }}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMessage ? "Editar Mensagem" : "Nova Mensagem"}
            </DialogTitle>
            <DialogDescription>
              Configure os detalhes da mensagem automática.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Type Selection - Cards for create, Badge for edit */}
            {!editingMessage ? (
              <div className="space-y-3">
                <Label>Selecione o Tipo de Mensagem</Label>
                <div className="grid grid-cols-2 gap-3">
                  {MESSAGE_TYPES.map((type) => {
                    const Icon = type.icon;
                    const isSelected = formData.type === type.value;
                    
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, type: type.value })}
                        className={cn(
                          "flex flex-col items-center p-4 rounded-lg border-2 transition-all text-center",
                          isSelected
                            ? `${type.borderColor} ${type.bgColor}`
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        )}
                      >
                        <Icon className={cn("h-6 w-6 mb-2", type.color)} />
                        <span className="font-medium text-sm">{type.label}</span>
                        <span className="text-xs text-muted-foreground mt-1">
                          {type.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                {(() => {
                  const typeConfig = MESSAGE_TYPES.find(t => t.value === formData.type);
                  if (!typeConfig) return null;
                  const Icon = typeConfig.icon;
                  return (
                    <>
                      <div className={cn("p-2 rounded-lg", typeConfig.bgColor)}>
                        <Icon className={cn("h-5 w-5", typeConfig.color)} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{typeConfig.label}</p>
                        <p className="text-xs text-muted-foreground">{typeConfig.description}</p>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Keyword field for keyword_response type */}
            {formData.type === "keyword_response" && (
              <div className="space-y-2">
                <Label>Palavra-chave</Label>
                <Input
                  placeholder="Ex: menu, ajuda, info"
                  value={formData.triggerKeyword}
                  onChange={(e) => setFormData({ ...formData, triggerKeyword: e.target.value })}
                />
              </div>
            )}

            {/* Scheduling section for scheduled type */}
            {formData.type === "scheduled" && (
              <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-orange-500" />
                  <Label className="font-medium">Agendamento</Label>
                </div>

                {/* Day selection */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Dias da Semana</Label>
                  <div className="flex gap-2">
                    {WEEK_DAYS.map((day) => {
                      const isSelected = formData.scheduleDays.includes(day.value);
                      return (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => toggleDay(day.value)}
                          className={cn(
                            "flex flex-col items-center justify-center w-10 h-12 rounded-lg border-2 transition-all text-xs font-medium",
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border hover:border-primary/50 hover:bg-muted"
                          )}
                        >
                          <span>{day.label}</span>
                          <span className="text-[10px] opacity-70">{day.fullLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                  {formData.scheduleDays.length === 0 && (
                    <p className="text-xs text-destructive">Selecione ao menos um dia</p>
                  )}
                </div>

                {/* Time selection */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Horários de Envio</Label>
                  <div className="flex gap-2">
                    <Input
                      type="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="w-32"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addTime} disabled={!newTime}>
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                  {formData.scheduleTimes.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.scheduleTimes.map((time) => (
                        <Badge key={time} variant="secondary" className="gap-1">
                          <Clock className="h-3 w-3" />
                          {time}
                          <button
                            type="button"
                            onClick={() => removeTime(time)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-destructive">Adicione ao menos um horário</p>
                  )}
                </div>
              </div>
            )}

            {/* Sequence Linking */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                Vincular Sequência (opcional)
              </Label>
              <Select
                value={formData.sequenceId || "none"}
                onValueChange={(v) => setFormData({ ...formData, sequenceId: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhuma - usar conteúdo abaixo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {sequences.map((seq) => (
                    <SelectItem key={seq.id} value={seq.id}>
                      <div className="flex items-center gap-2">
                        <GitBranch className="h-4 w-4 text-muted-foreground" />
                        {seq.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Info when sequence is linked */}
            {formData.sequenceId && (
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <Info className="h-4 w-4 flex-shrink-0" />
                  Esta mensagem irá disparar a sequência automaticamente. O conteúdo vem da própria sequência.
                </p>
              </div>
            )}

            {/* Content - Only show if no sequence linked */}
            {!formData.sequenceId && (
              <div className="space-y-2">
                <Label>Conteúdo da Mensagem</Label>
                <Textarea
                  placeholder="Digite a mensagem... Use {{nome}} para mencionar o membro."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={4}
                />
              </div>
            )}

            {/* Other settings */}
            <div className="space-y-2">
              <Label>Delay (segundos)</Label>
              <Input
                type="number"
                min={0}
                value={formData.delaySeconds}
                onChange={(e) => setFormData({ ...formData, delaySeconds: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="sendPrivate">Enviar no privado</Label>
              <Switch
                id="sendPrivate"
                checked={formData.sendPrivate}
                onCheckedChange={(checked) => setFormData({ ...formData, sendPrivate: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="mentionMember">Mencionar membro</Label>
              <Switch
                id="mentionMember"
                checked={formData.mentionMember}
                onCheckedChange={(checked) => setFormData({ ...formData, mentionMember: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateDialog(false);
              setEditingMessage(null);
              resetForm();
            }}>
              Cancelar
            </Button>
            <Button
              onClick={editingMessage ? handleUpdate : handleCreate}
              disabled={!isFormValid || isCreating}
            >
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingMessage ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
