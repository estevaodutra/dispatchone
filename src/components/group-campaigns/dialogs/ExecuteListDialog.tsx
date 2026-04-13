import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useGroupMessages, GroupMessage } from "@/hooks/useGroupMessages";
import { GroupMember } from "@/hooks/useGroupMembers";
import { Search, Send, Loader2, FileText, Users, MessageSquare, Clock, Info } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ExecuteListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedMembers: GroupMember[];
  campaignId: string;
}

export function ExecuteListDialog({ open, onOpenChange, selectedMembers, campaignId }: ExecuteListDialogProps) {
  const { messages } = useGroupMessages(campaignId);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [interval, setInterval] = useState(5);
  const [activeOnly, setActiveOnly] = useState(true);
  const [loading, setLoading] = useState(false);

  const activeMessages = useMemo(
    () => (messages || []).filter((m) => m.active),
    [messages]
  );

  const filteredMessages = useMemo(
    () => activeMessages.filter((m) =>
      m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.type.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [activeMessages, searchQuery]
  );

  const selectedMessage = activeMessages.find((m) => m.id === selectedMessageId);
  const targetCount = activeOnly
    ? selectedMembers.filter((m) => m.status === "active").length
    : selectedMembers.length;
  const estimatedTime = Math.ceil((targetCount * interval) / 60);

  const typeLabels: Record<string, string> = {
    welcome: "Boas-vindas",
    farewell: "Despedida",
    scheduled: "Agendada",
    keyword_response: "Resposta por Palavra",
  };

  const handleExecute = async () => {
    if (!selectedMessageId) return;
    setLoading(true);
    try {
      const phones = selectedMembers
        .filter((m) => !activeOnly || m.status === "active")
        .map((m) => m.phone);

      if (phones.length === 0) {
        toast.error("Nenhum membro ativo selecionado.");
        return;
      }

      const { error } = await supabase.functions.invoke("execute-message", {
        body: {
          messageId: selectedMessageId,
          campaignId,
          targetPhones: phones,
        },
      });

      if (error) throw error;
      toast.success(`Mensagem enviada para ${phones.length} membros!`);
      onOpenChange(false);
    } catch (err: any) {
      console.error("Erro ao enviar mensagem:", err);
      toast.error("Erro ao enviar mensagem.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Executar Lista
          </DialogTitle>
          <DialogDescription>
            Enviar uma mensagem para {selectedMembers.length} membros selecionados.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Search */}
          <div>
            <Label className="text-sm font-medium">Selecione a Mensagem *</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar mensagem..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Message list */}
          <ScrollArea className="h-48 border rounded-md">
            <div className="p-2 space-y-2">
              {filteredMessages.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => setSelectedMessageId(msg.id)}
                  className={cn(
                    "p-3 rounded-lg cursor-pointer transition-colors border",
                    selectedMessageId === msg.id
                      ? "bg-primary/10 border-primary"
                      : "hover:bg-muted border-transparent"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{typeLabels[msg.type] || msg.type}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {msg.mediaType || "Texto"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 ml-6 line-clamp-2">
                    {msg.content.substring(0, 80)}{msg.content.length > 80 ? "..." : ""}
                  </p>
                </div>
              ))}
              {filteredMessages.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma mensagem encontrada</p>
              )}
            </div>
          </ScrollArea>

          {/* Preview */}
          {selectedMessage && (
            <div className="border rounded-md p-3 bg-muted/50">
              <Label className="text-xs text-muted-foreground">Pré-visualização</Label>
              <p className="text-sm mt-1 whitespace-pre-wrap">{selectedMessage.content}</p>
            </div>
          )}

          <Separator />

          {/* Send options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Opções de Envio</Label>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Intervalo entre mensagens</Label>
              <Select value={interval.toString()} onValueChange={(v) => setInterval(Number(v))}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[3, 5, 10, 15, 30].map((s) => (
                    <SelectItem key={s} value={s.toString()}>{s} segundos</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" /> Intervalo recomendado para evitar bloqueios.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="list-active-only"
                checked={activeOnly}
                onCheckedChange={(c) => setActiveOnly(!!c)}
              />
              <Label htmlFor="list-active-only" className="text-sm">Enviar apenas para membros ativos</Label>
            </div>
          </div>

          {/* Summary */}
          {selectedMessage && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-medium">Resumo</Label>
                <div className="bg-muted rounded-lg p-3 space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>Mensagem: <strong>{typeLabels[selectedMessage.type] || selectedMessage.type}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>Destinatários: <strong>{targetCount} membros</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span>Total: <strong>{targetCount} mensagens</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>Tempo estimado: <strong>~{estimatedTime} min</strong></span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleExecute} disabled={!selectedMessageId || loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Enviar Agora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
