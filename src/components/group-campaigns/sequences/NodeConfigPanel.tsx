import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, MessageSquare, Clock, GitBranch, Bell, Link2 } from "lucide-react";

interface LocalNode {
  id: string;
  nodeType: string;
  positionX: number;
  positionY: number;
  nodeOrder: number;
  config: Record<string, unknown>;
}

interface NodeConfigPanelProps {
  node: LocalNode;
  onUpdate: (config: Record<string, unknown>) => void;
  onClose: () => void;
}

const NODE_TITLES: Record<string, { title: string; icon: React.ElementType }> = {
  message: { title: "Mensagem", icon: MessageSquare },
  delay: { title: "Delay", icon: Clock },
  condition: { title: "Condição", icon: GitBranch },
  notify: { title: "Notificar", icon: Bell },
  webhook: { title: "Webhook", icon: Link2 },
};

export function NodeConfigPanel({ node, onUpdate, onClose }: NodeConfigPanelProps) {
  const nodeInfo = NODE_TITLES[node.nodeType] || NODE_TITLES.message;
  const Icon = nodeInfo.icon;

  const updateConfig = (key: string, value: unknown) => {
    onUpdate({ ...node.config, [key]: value });
  };

  return (
    <Card className="w-72 shrink-0">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <CardTitle className="text-sm">{nodeInfo.title}</CardTitle>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {node.nodeType === "message" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="content">Conteúdo da Mensagem</Label>
              <Textarea
                id="content"
                placeholder="Digite a mensagem..."
                value={(node.config.content as string) || ""}
                onChange={(e) => updateConfig("content", e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Variáveis: {"{{name}}"}, {"{{phone}}"}, {"{{group}}"}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sendPrivate">Enviar no privado</Label>
              <Switch
                id="sendPrivate"
                checked={(node.config.sendPrivate as boolean) || false}
                onCheckedChange={(checked) => updateConfig("sendPrivate", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="mentionMember">Mencionar membro</Label>
              <Switch
                id="mentionMember"
                checked={(node.config.mentionMember as boolean) || false}
                onCheckedChange={(checked) => updateConfig("mentionMember", checked)}
              />
            </div>
          </>
        )}

        {node.nodeType === "delay" && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="days">Dias</Label>
                <Input
                  id="days"
                  type="number"
                  min="0"
                  value={(node.config.days as number) || 0}
                  onChange={(e) => updateConfig("days", parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hours">Horas</Label>
                <Input
                  id="hours"
                  type="number"
                  min="0"
                  max="23"
                  value={(node.config.hours as number) || 0}
                  onChange={(e) => updateConfig("hours", parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="minutes">Minutos</Label>
                <Input
                  id="minutes"
                  type="number"
                  min="0"
                  max="59"
                  value={(node.config.minutes as number) || 0}
                  onChange={(e) => updateConfig("minutes", parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seconds">Segundos</Label>
                <Input
                  id="seconds"
                  type="number"
                  min="0"
                  max="59"
                  value={(node.config.seconds as number) || 0}
                  onChange={(e) => updateConfig("seconds", parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          </>
        )}

        {node.nodeType === "condition" && (
          <>
            <div className="space-y-2">
              <Label>Campo</Label>
              <Select
                value={(node.config.field as string) || "member_count"}
                onValueChange={(value) => updateConfig("field", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member_count">Quantidade de membros</SelectItem>
                  <SelectItem value="member_role">Cargo do membro</SelectItem>
                  <SelectItem value="message_count">Mensagens enviadas</SelectItem>
                  <SelectItem value="time_in_group">Tempo no grupo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Operador</Label>
              <Select
                value={(node.config.operator as string) || "greater_than"}
                onValueChange={(value) => updateConfig("operator", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equals">Igual a</SelectItem>
                  <SelectItem value="not_equals">Diferente de</SelectItem>
                  <SelectItem value="greater_than">Maior que</SelectItem>
                  <SelectItem value="less_than">Menor que</SelectItem>
                  <SelectItem value="contains">Contém</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">Valor</Label>
              <Input
                id="value"
                value={(node.config.value as string) || ""}
                onChange={(e) => updateConfig("value", e.target.value)}
                placeholder="Digite o valor..."
              />
            </div>
          </>
        )}

        {node.nodeType === "notify" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="message">Mensagem da Notificação</Label>
              <Textarea
                id="message"
                placeholder="Digite a notificação..."
                value={(node.config.message as string) || ""}
                onChange={(e) => updateConfig("message", e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="notifyAdmins">Notificar admins</Label>
              <Switch
                id="notifyAdmins"
                checked={(node.config.notifyAdmins as boolean) ?? true}
                onCheckedChange={(checked) => updateConfig("notifyAdmins", checked)}
              />
            </div>
          </>
        )}

        {node.nodeType === "webhook" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://..."
                value={(node.config.url as string) || ""}
                onChange={(e) => updateConfig("url", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Método</Label>
              <Select
                value={(node.config.method as string) || "POST"}
                onValueChange={(value) => updateConfig("method", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Body (JSON)</Label>
              <Textarea
                id="body"
                placeholder='{"key": "value"}'
                value={(node.config.body as string) || ""}
                onChange={(e) => updateConfig("body", e.target.value)}
                rows={3}
                className="font-mono text-xs"
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
