import { useState } from "react";
import { useGroupMessages, GroupMessage, MessageType } from "@/hooks/useGroupMessages";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";

interface MessagesTabProps {
  campaignId: string;
}

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

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingMessage, setEditingMessage] = useState<GroupMessage | null>(null);
  const [formData, setFormData] = useState({
    type: "welcome" as MessageType,
    content: "",
    triggerKeyword: "",
    sendPrivate: false,
    mentionMember: false,
    delaySeconds: 0,
  });

  const resetForm = () => {
    setFormData({
      type: "welcome",
      content: "",
      triggerKeyword: "",
      sendPrivate: false,
      mentionMember: false,
      delaySeconds: 0,
    });
  };

  const handleCreate = async () => {
    await createMessage({
      type: formData.type,
      content: formData.content,
      triggerKeyword: formData.type === "keyword_response" ? formData.triggerKeyword : undefined,
      sendPrivate: formData.sendPrivate,
      mentionMember: formData.mentionMember,
      delaySeconds: formData.delaySeconds,
    });
    resetForm();
    setShowCreateDialog(false);
  };

  const handleUpdate = async () => {
    if (!editingMessage) return;
    await updateMessage({
      id: editingMessage.id,
      updates: {
        content: formData.content,
        triggerKeyword: formData.type === "keyword_response" ? formData.triggerKeyword : null,
        sendPrivate: formData.sendPrivate,
        mentionMember: formData.mentionMember,
        delaySeconds: formData.delaySeconds,
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
    });
  };

  const MessageCard = ({ message, onEdit, onDelete }: { message: GroupMessage; onEdit: () => void; onDelete: () => void }) => (
    <Card className="mb-2">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            <div className="flex items-center gap-2 mt-2">
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-48" />)}
      </div>
    );
  }

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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingMessage ? "Editar Mensagem" : "Nova Mensagem"}
            </DialogTitle>
            <DialogDescription>
              Configure os detalhes da mensagem automática.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!editingMessage && (
              <div className="space-y-2">
                <Label>Tipo de Mensagem</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData({ ...formData, type: v as MessageType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="welcome">Boas-vindas</SelectItem>
                    <SelectItem value="farewell">Despedida</SelectItem>
                    <SelectItem value="scheduled">Agendada</SelectItem>
                    <SelectItem value="keyword_response">Resposta por Palavra-chave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

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

            <div className="space-y-2">
              <Label>Conteúdo da Mensagem</Label>
              <Textarea
                placeholder="Digite a mensagem... Use {{nome}} para mencionar o membro."
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={4}
              />
            </div>

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
              disabled={!formData.content || isCreating}
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
