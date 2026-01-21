import { useState } from "react";
import { useGroupMessages, GroupMessage, MessageType } from "@/hooks/useGroupMessages";
import { useSequences } from "@/hooks/useSequences";
import { useInstances } from "@/hooks/useInstances";
import { useGroupCampaigns } from "@/hooks/useGroupCampaigns";
import { useCampaignGroups } from "@/hooks/useCampaignGroups";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  RefreshCw,
  Play,
  AlertCircle,
  Image,
  Video,
  FileAudio,
  FileText,
  Paperclip,
  Link,
  Upload,
  Library,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MediaUploader } from "@/components/group-campaigns/sequences/MediaUploader";

type ScheduleMode = "manual" | "interval";

const INTERVAL_OPTIONS = [
  { value: 15, label: "15 minutos" },
  { value: 30, label: "30 minutos" },
  { value: 60, label: "1 hora" },
  { value: 120, label: "2 horas" },
  { value: 180, label: "3 horas" },
  { value: 240, label: "4 horas" },
];

const generateTimesFromInterval = (start: string, end: string, intervalMinutes: number): string[] => {
  const times: string[] = [];
  const [startHour, startMin] = start.split(":").map(Number);
  const [endHour, endMin] = end.split(":").map(Number);
  
  let currentMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  while (currentMinutes <= endMinutes) {
    const hours = Math.floor(currentMinutes / 60);
    const mins = currentMinutes % 60;
    times.push(`${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`);
    currentMinutes += intervalMinutes;
  }
  
  return times;
};

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
    sendMessage,
    isCreating,
    isSending,
  } = useGroupMessages(campaignId);

  const { sequences } = useSequences(campaignId);
  const { instances } = useInstances();
  const { campaigns } = useGroupCampaigns();
  const { linkedGroups, isLoading: isLoadingGroups } = useCampaignGroups(campaignId);
  
  // Debug logs
  console.log("MessagesTab - campaignId:", campaignId);
  console.log("MessagesTab - linkedGroups:", linkedGroups);
  
  const currentCampaign = campaigns.find(c => c.id === campaignId);
  const linkedInstance = instances.find(i => i.id === currentCampaign?.instanceId);
  
  const [sendingMessageId, setSendingMessageId] = useState<string | null>(null);

  const hasNoGroups = !isLoadingGroups && linkedGroups.length === 0;

  const handleTestMessage = async (message: GroupMessage) => {
    if (!currentCampaign) {
      console.warn("handleTestMessage: currentCampaign não encontrado");
      return;
    }
    
    if (!linkedInstance) {
      console.warn("handleTestMessage: linkedInstance não encontrado");
      return;
    }

    if (linkedGroups.length === 0) {
      console.warn("handleTestMessage: nenhum grupo vinculado");
      return;
    }

    console.log("handleTestMessage: enviando para grupos:", linkedGroups);

    setSendingMessageId(message.id);
    try {
      await sendMessage({
        message,
        campaign: currentCampaign,
        instance: linkedInstance,
        groups: linkedGroups,
        trigger: { name: "Usuário Teste", phone: "5500000000000" },
      });
    } finally {
      setSendingMessageId(null);
    }
  };

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
    scheduleMode: "manual" as ScheduleMode,
    intervalStart: "08:00",
    intervalEnd: "19:00",
    intervalMinutes: 60,
    mediaUrl: "",
    mediaType: "" as "" | "image" | "video" | "audio" | "document" | "sticker",
    mediaCaption: "",
  });

  type MediaType = "image" | "video" | "audio" | "document" | "sticker";

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
      scheduleMode: "manual",
      intervalStart: "08:00",
      intervalEnd: "19:00",
      intervalMinutes: 60,
      mediaUrl: "",
      mediaType: "",
      mediaCaption: "",
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
    const scheduleTimes = formData.scheduleMode === "interval"
      ? generateTimesFromInterval(formData.intervalStart, formData.intervalEnd, formData.intervalMinutes)
      : formData.scheduleTimes;

    await createMessage({
      type: formData.type,
      content: formData.sequenceId ? "" : formData.content,
      triggerKeyword: formData.type === "keyword_response" ? formData.triggerKeyword : undefined,
      schedule: formData.type === "scheduled" ? {
        days: formData.scheduleDays,
        times: scheduleTimes,
        mode: formData.scheduleMode,
        intervalConfig: formData.scheduleMode === "interval" ? {
          start: formData.intervalStart,
          end: formData.intervalEnd,
          minutes: formData.intervalMinutes,
        } : undefined,
      } : undefined,
      sendPrivate: formData.sendPrivate,
      mentionMember: formData.mentionMember,
      delaySeconds: formData.delaySeconds,
      sequenceId: formData.sequenceId || undefined,
      mediaUrl: formData.mediaUrl || undefined,
      mediaType: formData.mediaType || undefined,
      mediaCaption: formData.mediaCaption || undefined,
    });
    resetForm();
    setShowCreateDialog(false);
  };

  const handleUpdate = async () => {
    if (!editingMessage) return;
    
    const scheduleTimes = formData.scheduleMode === "interval"
      ? generateTimesFromInterval(formData.intervalStart, formData.intervalEnd, formData.intervalMinutes)
      : formData.scheduleTimes;

    await updateMessage({
      id: editingMessage.id,
      updates: {
        content: formData.sequenceId ? "" : formData.content,
        triggerKeyword: formData.type === "keyword_response" ? formData.triggerKeyword : null,
        schedule: formData.type === "scheduled" ? {
          days: formData.scheduleDays,
          times: scheduleTimes,
          mode: formData.scheduleMode,
          intervalConfig: formData.scheduleMode === "interval" ? {
            start: formData.intervalStart,
            end: formData.intervalEnd,
            minutes: formData.intervalMinutes,
          } : undefined,
        } : null,
        sendPrivate: formData.sendPrivate,
        mentionMember: formData.mentionMember,
        delaySeconds: formData.delaySeconds,
        sequenceId: formData.sequenceId || null,
        mediaUrl: formData.mediaUrl || null,
        mediaType: formData.mediaType || null,
        mediaCaption: formData.mediaCaption || null,
      },
    });
    setEditingMessage(null);
    resetForm();
  };

  const openEditDialog = (message: GroupMessage) => {
    setEditingMessage(message);
    const scheduleData = message.schedule as {
      days?: number[];
      times?: string[];
      mode?: ScheduleMode;
      intervalConfig?: { start: string; end: string; minutes: number };
    } | null;
    
    setFormData({
      type: message.type,
      content: message.content,
      triggerKeyword: message.triggerKeyword || "",
      sendPrivate: message.sendPrivate,
      mentionMember: message.mentionMember,
      delaySeconds: message.delaySeconds,
      sequenceId: message.sequenceId || "",
      scheduleDays: scheduleData?.days || [],
      scheduleTimes: scheduleData?.times || [],
      scheduleMode: scheduleData?.mode || "manual",
      intervalStart: scheduleData?.intervalConfig?.start || "08:00",
      intervalEnd: scheduleData?.intervalConfig?.end || "19:00",
      intervalMinutes: scheduleData?.intervalConfig?.minutes || 60,
      mediaUrl: message.mediaUrl || "",
      mediaType: (message.mediaType as MediaType) || "",
      mediaCaption: message.mediaCaption || "",
    });
    setNewTime("");
  };

  const getSequenceName = (sequenceId: string | null) => {
    if (!sequenceId) return null;
    return sequences.find(s => s.id === sequenceId)?.name || "Sequência";
  };

  const MessageCard = ({ message, onEdit, onDelete, onTest }: { 
    message: GroupMessage; 
    onEdit: () => void; 
    onDelete: () => void;
    onTest: () => void;
  }) => {
    const scheduleData = message.schedule as {
      days?: number[];
      times?: string[];
      mode?: ScheduleMode;
      intervalConfig?: { start: string; end: string; minutes: number };
    } | null;
    
    const scheduleDays = scheduleData?.days || [];
    const scheduleTimes = scheduleData?.times || [];
    const scheduleMode = scheduleData?.mode || "manual";
    const intervalConfig = scheduleData?.intervalConfig;
    const isMessageSending = sendingMessageId === message.id;
    
    const formatInterval = () => {
      if (!intervalConfig) return null;
      const intervalLabel = INTERVAL_OPTIONS.find(o => o.value === intervalConfig.minutes)?.label || `${intervalConfig.minutes}min`;
      return `${intervalConfig.start} - ${intervalConfig.end} (a cada ${intervalLabel})`;
    };
    
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
                  {scheduleMode === "interval" && intervalConfig ? (
                    <>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">
                        {formatInterval()}
                      </span>
                    </>
                  ) : scheduleTimes.length > 0 && (
                    <>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">
                        {scheduleTimes.length > 5 
                          ? `${scheduleTimes.slice(0, 3).join(", ")} +${scheduleTimes.length - 3} horários`
                          : scheduleTimes.join(", ")}
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
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950" 
                        onClick={onTest}
                        disabled={!linkedInstance || isMessageSending || isLoadingGroups || hasNoGroups}
                      >
                        {isMessageSending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {!linkedInstance ? (
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-3 w-3" />
                        Vincule uma instância à campanha
                      </div>
                    ) : hasNoGroups ? (
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-3 w-3" />
                        Vincule grupos na aba "Grupos"
                      </div>
                    ) : isLoadingGroups ? (
                      "Carregando grupos..."
                    ) : (
                      "Testar envio"
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
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

  const previewTimes = formData.scheduleMode === "interval"
    ? generateTimesFromInterval(formData.intervalStart, formData.intervalEnd, formData.intervalMinutes)
    : formData.scheduleTimes;

  const isScheduleValid = formData.type !== "scheduled" || 
    (formData.scheduleDays.length > 0 && (formData.scheduleMode === "interval" || formData.scheduleTimes.length > 0));
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
                  onTest={() => handleTestMessage(msg)}
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
                  onTest={() => handleTestMessage(msg)}
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
                  onTest={() => handleTestMessage(msg)}
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
                  onTest={() => handleTestMessage(msg)}
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

                {/* Schedule Mode Selection */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Modo de Horário</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, scheduleMode: "manual" })}
                      className={cn(
                        "flex flex-col items-center p-3 rounded-lg border-2 transition-all text-center",
                        formData.scheduleMode === "manual"
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      )}
                    >
                      <Clock className="h-5 w-5 mb-1 text-muted-foreground" />
                      <span className="text-sm font-medium">Manual</span>
                      <span className="text-xs text-muted-foreground">Adicionar um a um</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, scheduleMode: "interval" })}
                      className={cn(
                        "flex flex-col items-center p-3 rounded-lg border-2 transition-all text-center",
                        formData.scheduleMode === "interval"
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      )}
                    >
                      <RefreshCw className="h-5 w-5 mb-1 text-muted-foreground" />
                      <span className="text-sm font-medium">Intervalo</span>
                      <span className="text-xs text-muted-foreground">Gerar automático</span>
                    </button>
                  </div>
                </div>

                {/* Manual Time Selection */}
                {formData.scheduleMode === "manual" && (
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
                )}

                {/* Interval Configuration */}
                {formData.scheduleMode === "interval" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Horário Inicial</Label>
                        <Input
                          type="time"
                          value={formData.intervalStart}
                          onChange={(e) => setFormData({ ...formData, intervalStart: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Horário Final</Label>
                        <Input
                          type="time"
                          value={formData.intervalEnd}
                          onChange={(e) => setFormData({ ...formData, intervalEnd: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Repetir a cada</Label>
                        <Select
                          value={formData.intervalMinutes.toString()}
                          onValueChange={(v) => setFormData({ ...formData, intervalMinutes: parseInt(v) })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {INTERVAL_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value.toString()}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Preview Generated Times */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">
                          Horários Gerados ({previewTimes.length})
                        </Label>
                      </div>
                      <div className="flex flex-wrap gap-1.5 p-3 rounded-lg bg-background border max-h-24 overflow-y-auto">
                        {previewTimes.length > 0 ? (
                          previewTimes.map((time) => (
                            <Badge key={time} variant="outline" className="text-xs">
                              {time}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Configure o intervalo para gerar horários
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
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

            {/* Media Section - Only show if no sequence linked */}
            {!formData.sequenceId && (
              <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <Label className="font-medium">Mídia (opcional)</Label>
                </div>
                
                {/* Media Type Selection */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Tipo de Mídia</Label>
                  <Select
                    value={formData.mediaType || "none"}
                    onValueChange={(v) => setFormData({ 
                      ...formData, 
                      mediaType: v === "none" ? "" : v as MediaType,
                      mediaUrl: v === "none" ? "" : formData.mediaUrl,
                      mediaCaption: v === "none" ? "" : formData.mediaCaption,
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sem mídia" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <div className="flex items-center gap-2">
                          <X className="h-4 w-4 text-muted-foreground" />
                          Sem mídia
                        </div>
                      </SelectItem>
                      <SelectItem value="image">
                        <div className="flex items-center gap-2">
                          <Image className="h-4 w-4 text-green-500" />
                          Imagem
                        </div>
                      </SelectItem>
                      <SelectItem value="video">
                        <div className="flex items-center gap-2">
                          <Video className="h-4 w-4 text-blue-500" />
                          Vídeo
                        </div>
                      </SelectItem>
                      <SelectItem value="audio">
                        <div className="flex items-center gap-2">
                          <FileAudio className="h-4 w-4 text-purple-500" />
                          Áudio
                        </div>
                      </SelectItem>
                      <SelectItem value="document">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-orange-500" />
                          Documento
                        </div>
                      </SelectItem>
                      <SelectItem value="sticker">
                        <div className="flex items-center gap-2">
                          <Image className="h-4 w-4 text-pink-500" />
                          Sticker
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Media Uploader - Only show if type is selected */}
                {formData.mediaType && (
                  <div className="space-y-4">
                    <MediaUploader
                      mediaType={formData.mediaType as MediaType}
                      currentUrl={formData.mediaUrl}
                      onUpload={(url, filename) => setFormData({ ...formData, mediaUrl: url })}
                      onUrlChange={(url) => setFormData({ ...formData, mediaUrl: url })}
                      placeholder="https://exemplo.com/arquivo"
                    />

                    {/* Caption - Only for image/video */}
                    {(formData.mediaType === "image" || formData.mediaType === "video") && (
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">Legenda (opcional)</Label>
                        <Input
                          placeholder="Legenda para a mídia..."
                          value={formData.mediaCaption}
                          onChange={(e) => setFormData({ ...formData, mediaCaption: e.target.value })}
                        />
                      </div>
                    )}
                  </div>
                )}
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
