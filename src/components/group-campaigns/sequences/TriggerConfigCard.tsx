import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Zap, Users, LogOut, Clock, Keyboard, Webhook, Play,
  ChevronDown, Plus, X, CalendarDays
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WebhookFieldMappings, FieldMapping } from "./WebhookFieldMappings";

export type TriggerType = "member_join" | "member_leave" | "scheduled" | "scheduled_recurring" | "scheduled_once" | "keyword" | "webhook" | "manual";

export interface TriggerConfig {
  sendPrivate?: boolean;
  days?: number[];
  times?: string[];
  mode?: "manual" | "interval";
  intervalConfig?: {
    start: string;
    end: string;
    minutes: number;
  };
  date?: string;
  time?: string;
  keyword?: string;
  matchType?: "exact" | "contains" | "startsWith";
  caseSensitive?: boolean;
  webhookId?: string;
  fieldMappings?: FieldMapping[];
}

interface TriggerConfigCardProps {
  triggerType: TriggerType;
  triggerConfig: TriggerConfig;
  onTriggerTypeChange: (type: TriggerType) => void;
  onTriggerConfigChange: (config: TriggerConfig) => void;
  sequenceId?: string;
}

const TRIGGER_TYPES = [
  { value: "member_join" as TriggerType, label: "Membro entrar", icon: Users, color: "bg-green-500" },
  { value: "member_leave" as TriggerType, label: "Membro sair", icon: LogOut, color: "bg-red-500" },
  { value: "scheduled_recurring" as TriggerType, label: "Agendado recorrente", icon: Clock, color: "bg-orange-500" },
  { value: "scheduled_once" as TriggerType, label: "Agendado pontual", icon: CalendarDays, color: "bg-yellow-500" },
  { value: "keyword" as TriggerType, label: "Palavra-chave", icon: Keyboard, color: "bg-purple-500" },
  { value: "webhook" as TriggerType, label: "Webhook externo", icon: Webhook, color: "bg-blue-500" },
  { value: "manual" as TriggerType, label: "Manual", icon: Play, color: "bg-slate-500" },
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

const INTERVAL_OPTIONS = [
  { value: 15, label: "15 minutos" },
  { value: 30, label: "30 minutos" },
  { value: 60, label: "1 hora" },
  { value: 120, label: "2 horas" },
  { value: 180, label: "3 horas" },
  { value: 240, label: "4 horas" },
];

const MATCH_TYPES = [
  { value: "exact", label: "Exato" },
  { value: "contains", label: "Contém" },
  { value: "startsWith", label: "Começa com" },
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

export function TriggerConfigCard({
  triggerType,
  triggerConfig,
  onTriggerTypeChange,
  onTriggerConfigChange,
  sequenceId,
}: TriggerConfigCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [newTime, setNewTime] = useState("");

  // Map legacy "scheduled" to "scheduled_recurring" for display
  const effectiveTriggerType = triggerType === "scheduled" ? "scheduled_recurring" : triggerType;
  const triggerInfo = TRIGGER_TYPES.find(t => t.value === effectiveTriggerType) || TRIGGER_TYPES[6];
  const TriggerIcon = triggerInfo.icon;

  // Generate webhook URL pointing to the actual Edge Function
  const webhookUrl = sequenceId 
    ? `https://btvzspqcnzcslkdtddwl.supabase.co/functions/v1/trigger-sequence/${sequenceId}`
    : "";

  const toggleDay = (day: number) => {
    const currentDays = triggerConfig.days || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day].sort((a, b) => a - b);
    onTriggerConfigChange({ ...triggerConfig, days: newDays });
  };

  const addTime = () => {
    if (newTime && !(triggerConfig.times || []).includes(newTime)) {
      onTriggerConfigChange({
        ...triggerConfig,
        times: [...(triggerConfig.times || []), newTime].sort(),
      });
      setNewTime("");
    }
  };

  const removeTime = (time: string) => {
    onTriggerConfigChange({
      ...triggerConfig,
      times: (triggerConfig.times || []).filter(t => t !== time),
    });
  };

  const updateIntervalConfig = (field: string, value: string | number) => {
    const intervalConfig = triggerConfig.intervalConfig || { start: "08:00", end: "19:00", minutes: 60 };
    onTriggerConfigChange({
      ...triggerConfig,
      intervalConfig: { ...intervalConfig, [field]: value },
    });
  };

  // Calculate preview times for interval mode
  const previewTimes = triggerConfig.mode === "interval" && triggerConfig.intervalConfig
    ? generateTimesFromInterval(
        triggerConfig.intervalConfig.start,
        triggerConfig.intervalConfig.end,
        triggerConfig.intervalConfig.minutes
      )
    : [];

  return (
    <Card className="border-2 border-primary/30 bg-primary/5">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", triggerInfo.color)}>
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-sm flex items-center gap-2">
                    Gatilho
                    <Badge variant="secondary" className="font-normal">
                      <TriggerIcon className="h-3 w-3 mr-1" />
                      {triggerInfo.label}
                    </Badge>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Define quando esta sequência será executada
                  </p>
                </div>
              </div>
              <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
            </div>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {/* Trigger Type Selector */}
            <div className="space-y-2">
              <Label>Tipo de Gatilho</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {TRIGGER_TYPES.map(trigger => {
                  const Icon = trigger.icon;
                  const isSelected = triggerType === trigger.value;
                  return (
                    <button
                      key={trigger.value}
                      type="button"
                      onClick={() => onTriggerTypeChange(trigger.value)}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-lg border text-left transition-all",
                        isSelected
                          ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className={cn("p-1.5 rounded", trigger.color)}>
                        <Icon className="h-3.5 w-3.5 text-white" />
                      </div>
                      <span className="text-sm font-medium">{trigger.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Member Join/Leave Config */}
            {(triggerType === "member_join" || triggerType === "member_leave") && (
              <div className="space-y-3 p-3 rounded-lg bg-background border">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Enviar no privado</Label>
                    <p className="text-xs text-muted-foreground">
                      Envia a mensagem diretamente para o membro
                    </p>
                  </div>
                  <Switch
                    checked={triggerConfig.sendPrivate || false}
                    onCheckedChange={(checked) => 
                      onTriggerConfigChange({ ...triggerConfig, sendPrivate: checked })
                    }
                  />
                </div>
              </div>
            )}

            {/* Scheduled Config */}
            {triggerType === "scheduled" && (
              <div className="space-y-4 p-3 rounded-lg bg-background border">
                {/* Days selection */}
                <div className="space-y-2">
                  <Label className="text-sm">Dias da semana</Label>
                  <div className="flex gap-1">
                    {WEEK_DAYS.map(day => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleDay(day.value)}
                        className={cn(
                          "w-9 h-9 rounded-full text-sm font-medium transition-all",
                          (triggerConfig.days || []).includes(day.value)
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-muted/80"
                        )}
                        title={day.fullLabel}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mode selection */}
                <div className="space-y-2">
                  <Label className="text-sm">Modo de horários</Label>
                  <Select
                    value={triggerConfig.mode || "manual"}
                    onValueChange={(value) => 
                      onTriggerConfigChange({ ...triggerConfig, mode: value as "manual" | "interval" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Horários específicos</SelectItem>
                      <SelectItem value="interval">Intervalo automático</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Manual times */}
                {(triggerConfig.mode || "manual") === "manual" && (
                  <div className="space-y-2">
                    <Label className="text-sm">Horários</Label>
                    <div className="flex gap-2">
                      <Input
                        type="time"
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                        className="flex-1"
                      />
                      <Button type="button" variant="outline" onClick={addTime}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {(triggerConfig.times || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(triggerConfig.times || []).map(time => (
                          <Badge key={time} variant="secondary" className="gap-1">
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
                    )}
                  </div>
                )}

                {/* Interval mode */}
                {triggerConfig.mode === "interval" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Início</Label>
                        <Input
                          type="time"
                          value={triggerConfig.intervalConfig?.start || "08:00"}
                          onChange={(e) => updateIntervalConfig("start", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Fim</Label>
                        <Input
                          type="time"
                          value={triggerConfig.intervalConfig?.end || "19:00"}
                          onChange={(e) => updateIntervalConfig("end", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Frequência</Label>
                      <Select
                        value={String(triggerConfig.intervalConfig?.minutes || 60)}
                        onValueChange={(value) => updateIntervalConfig("minutes", parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {INTERVAL_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={String(opt.value)}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {previewTimes.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">Preview:</span>{" "}
                        {previewTimes.slice(0, 5).join(", ")}
                        {previewTimes.length > 5 && ` +${previewTimes.length - 5} mais`}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Keyword Config */}
            {triggerType === "keyword" && (
              <div className="space-y-3 p-3 rounded-lg bg-background border">
                <div className="space-y-2">
                  <Label className="text-sm">Palavra-chave</Label>
                  <Input
                    placeholder="Ex: !ajuda, #info, menu"
                    value={triggerConfig.keyword || ""}
                    onChange={(e) => 
                      onTriggerConfigChange({ ...triggerConfig, keyword: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Tipo de match</Label>
                    <Select
                      value={triggerConfig.matchType || "contains"}
                      onValueChange={(value) => 
                        onTriggerConfigChange({ ...triggerConfig, matchType: value as "exact" | "contains" | "startsWith" })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MATCH_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end pb-1">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="caseSensitive"
                        checked={triggerConfig.caseSensitive || false}
                        onCheckedChange={(checked) => 
                          onTriggerConfigChange({ ...triggerConfig, caseSensitive: checked })
                        }
                      />
                      <Label htmlFor="caseSensitive" className="text-xs">
                        Case sensitive
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Webhook Config */}
            {triggerType === "webhook" && (
              <WebhookFieldMappings
                fieldMappings={triggerConfig.fieldMappings || []}
                onFieldMappingsChange={(mappings) =>
                  onTriggerConfigChange({ ...triggerConfig, fieldMappings: mappings })
                }
                webhookUrl={webhookUrl}
              />
            )}

            {/* Manual Config */}
            {triggerType === "manual" && (
              <div className="p-3 rounded-lg bg-background border">
                <p className="text-sm text-muted-foreground">
                  Esta sequência só será executada quando você clicar no botão "Enviar" manualmente.
                </p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
