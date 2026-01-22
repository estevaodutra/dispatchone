import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  X, Plus, Trash2,
  MessageSquare, Clock, GitBranch, Bell, Link2,
  Image, Video, Music, FileText, Smile,
  BarChart3, MousePointerClick, List, MapPin, Contact, Calendar
} from "lucide-react";
import { MediaUploader } from "./MediaUploader";

interface LocalNode {
  id: string;
  nodeType: string;
  positionX?: number;
  positionY?: number;
  nodeOrder: number;
  config: Record<string, unknown>;
}

interface NodeConfigPanelProps {
  node: LocalNode;
  onUpdate: (config: Record<string, unknown>) => void;
  onClose: () => void;
}

const NODE_TITLES: Record<string, { title: string; icon: React.ElementType }> = {
  // Messages
  message: { title: "Texto", icon: MessageSquare },
  // Media
  image: { title: "Imagem", icon: Image },
  video: { title: "Vídeo", icon: Video },
  audio: { title: "Áudio", icon: Music },
  document: { title: "Documento", icon: FileText },
  sticker: { title: "Figurinha", icon: Smile },
  // Interactive
  poll: { title: "Enquete", icon: BarChart3 },
  buttons: { title: "Botões", icon: MousePointerClick },
  list: { title: "Lista", icon: List },
  location: { title: "Localização", icon: MapPin },
  contact: { title: "Contato", icon: Contact },
  event: { title: "Evento", icon: Calendar },
  // Flow
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
    <Card className="w-80 shrink-0 flex flex-col">
      <CardHeader className="pb-3 flex flex-row items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <CardTitle className="text-sm">{nodeInfo.title}</CardTitle>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <ScrollArea className="flex-1">
        <CardContent className="space-y-4">
          {/* MESSAGE */}
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
                <div className="space-y-0.5">
                  <Label htmlFor="viewOnce">Visualização Única</Label>
                  <p className="text-xs text-muted-foreground">Mensagem desaparece após ser lida</p>
                </div>
                <Switch
                  id="viewOnce"
                  checked={(node.config.viewOnce as boolean) || false}
                  onCheckedChange={(checked) => updateConfig("viewOnce", checked)}
                />
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

          {/* IMAGE */}
          {node.nodeType === "image" && (
            <>
              <div className="space-y-2">
                <Label>Mídia</Label>
                <MediaUploader
                  mediaType="image"
                  currentUrl={(node.config.url as string) || ""}
                  onUpload={(url) => updateConfig("url", url)}
                  onUrlChange={(url) => updateConfig("url", url)}
                  placeholder="https://exemplo.com/imagem.jpg"
                />
              </div>
              <div className="space-y-2">
                <Label>Legenda (opcional)</Label>
                <Textarea
                  placeholder="Descrição da mídia..."
                  value={(node.config.caption as string) || ""}
                  onChange={(e) => updateConfig("caption", e.target.value)}
                  rows={2}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Visualização Única</Label>
                  <p className="text-xs text-muted-foreground">Mídia desaparece após ser vista</p>
                </div>
                <Switch
                  checked={(node.config.viewOnce as boolean) || false}
                  onCheckedChange={(checked) => updateConfig("viewOnce", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Enviar no privado</Label>
                <Switch
                  checked={(node.config.sendPrivate as boolean) || false}
                  onCheckedChange={(checked) => updateConfig("sendPrivate", checked)}
                />
              </div>
            </>
          )}

          {/* VIDEO */}
          {node.nodeType === "video" && (
            <>
              <div className="space-y-2">
                <Label>Mídia</Label>
                <MediaUploader
                  mediaType="video"
                  currentUrl={(node.config.url as string) || ""}
                  onUpload={(url) => updateConfig("url", url)}
                  onUrlChange={(url) => updateConfig("url", url)}
                  placeholder="https://exemplo.com/video.mp4"
                />
              </div>
              <div className="space-y-2">
                <Label>Legenda (opcional)</Label>
                <Textarea
                  placeholder="Descrição da mídia..."
                  value={(node.config.caption as string) || ""}
                  onChange={(e) => updateConfig("caption", e.target.value)}
                  rows={2}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Recado (Video Note)</Label>
                  <p className="text-xs text-muted-foreground">Envia como bolinha circular flutuante</p>
                </div>
                <Switch
                  checked={(node.config.isVideoNote as boolean) || false}
                  onCheckedChange={(checked) => updateConfig("isVideoNote", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Visualização Única</Label>
                  <p className="text-xs text-muted-foreground">Mídia desaparece após ser vista</p>
                </div>
                <Switch
                  checked={(node.config.viewOnce as boolean) || false}
                  onCheckedChange={(checked) => updateConfig("viewOnce", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Enviar no privado</Label>
                <Switch
                  checked={(node.config.sendPrivate as boolean) || false}
                  onCheckedChange={(checked) => updateConfig("sendPrivate", checked)}
                />
              </div>
            </>
          )}

          {/* AUDIO */}
          {node.nodeType === "audio" && (
            <>
              <div className="space-y-2">
                <Label>Áudio</Label>
                <MediaUploader
                  mediaType="audio"
                  currentUrl={(node.config.url as string) || ""}
                  onUpload={(url) => updateConfig("url", url)}
                  onUrlChange={(url) => updateConfig("url", url)}
                  placeholder="https://exemplo.com/audio.ogg"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Mensagem de voz (PTT)</Label>
                <Switch
                  checked={(node.config.isVoiceMessage as boolean) ?? true}
                  onCheckedChange={(checked) => updateConfig("isVoiceMessage", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Visualização Única</Label>
                  <p className="text-xs text-muted-foreground">Áudio desaparece após ser ouvido</p>
                </div>
                <Switch
                  checked={(node.config.viewOnce as boolean) || false}
                  onCheckedChange={(checked) => updateConfig("viewOnce", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Enviar no privado</Label>
                <Switch
                  checked={(node.config.sendPrivate as boolean) || false}
                  onCheckedChange={(checked) => updateConfig("sendPrivate", checked)}
                />
              </div>
            </>
          )}

          {/* DOCUMENT */}
          {node.nodeType === "document" && (
            <>
              <div className="space-y-2">
                <Label>Documento</Label>
                <MediaUploader
                  mediaType="document"
                  currentUrl={(node.config.url as string) || ""}
                  onUpload={(url, filename) => {
                    updateConfig("url", url);
                    if (filename) updateConfig("filename", filename);
                  }}
                  onUrlChange={(url) => updateConfig("url", url)}
                  placeholder="https://exemplo.com/documento.pdf"
                />
              </div>
              <div className="space-y-2">
                <Label>Nome do Arquivo</Label>
                <Input
                  placeholder="contrato.pdf"
                  value={(node.config.filename as string) || ""}
                  onChange={(e) => updateConfig("filename", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Legenda (opcional)</Label>
                <Textarea
                  placeholder="Descrição do documento..."
                  value={(node.config.caption as string) || ""}
                  onChange={(e) => updateConfig("caption", e.target.value)}
                  rows={2}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Visualização Única</Label>
                  <p className="text-xs text-muted-foreground">Documento desaparece após ser visto</p>
                </div>
                <Switch
                  checked={(node.config.viewOnce as boolean) || false}
                  onCheckedChange={(checked) => updateConfig("viewOnce", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Enviar no privado</Label>
                <Switch
                  checked={(node.config.sendPrivate as boolean) || false}
                  onCheckedChange={(checked) => updateConfig("sendPrivate", checked)}
                />
              </div>
            </>
          )}

          {/* STICKER */}
          {node.nodeType === "sticker" && (
            <>
              <div className="space-y-2">
                <Label>Sticker</Label>
                <MediaUploader
                  mediaType="sticker"
                  currentUrl={(node.config.url as string) || ""}
                  onUpload={(url) => updateConfig("url", url)}
                  onUrlChange={(url) => updateConfig("url", url)}
                  placeholder="https://exemplo.com/sticker.webp"
                />
                <p className="text-xs text-muted-foreground">
                  WebP 512x512px recomendado
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Visualização Única</Label>
                  <p className="text-xs text-muted-foreground">Sticker desaparece após ser visto</p>
                </div>
                <Switch
                  checked={(node.config.viewOnce as boolean) || false}
                  onCheckedChange={(checked) => updateConfig("viewOnce", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Enviar no privado</Label>
                <Switch
                  checked={(node.config.sendPrivate as boolean) || false}
                  onCheckedChange={(checked) => updateConfig("sendPrivate", checked)}
                />
              </div>
            </>
          )}

          {/* POLL */}
          {node.nodeType === "poll" && (
            <>
              <div className="space-y-2">
                <Label>Pergunta</Label>
                <Input
                  placeholder="Qual sua preferência?"
                  value={(node.config.question as string) || ""}
                  onChange={(e) => updateConfig("question", e.target.value)}
                  maxLength={255}
                />
                <p className="text-xs text-muted-foreground">Máximo 255 caracteres</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Opções (até 12)</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6"
                    onClick={() => {
                      const options = [...((node.config.options as string[]) || [])];
                      if (options.length < 12) {
                        options.push("");
                        updateConfig("options", options);
                      }
                    }}
                    disabled={((node.config.options as string[]) || []).length >= 12}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Adicionar
                  </Button>
                </div>
                {((node.config.options as string[]) || ["", "", ""]).map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      placeholder={`Opção ${i + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const options = [...((node.config.options as string[]) || [])];
                        options[i] = e.target.value;
                        updateConfig("options", options);
                      }}
                    />
                    {((node.config.options as string[]) || []).length > 2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => {
                          const options = [...((node.config.options as string[]) || [])];
                          options.splice(i, 1);
                          updateConfig("options", options);
                        }}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <Label>Múltipla escolha</Label>
                <Switch
                  checked={(node.config.multiSelect as boolean) || false}
                  onCheckedChange={(checked) => updateConfig("multiSelect", checked)}
                />
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                ⚠️ Enquetes funcionam apenas em grupos
              </p>
            </>
          )}

          {/* BUTTONS */}
          {node.nodeType === "buttons" && (
            <>
              <div className="space-y-2">
                <Label>Texto da Mensagem</Label>
                <Textarea
                  placeholder="Escolha uma opção:"
                  value={(node.config.text as string) || ""}
                  onChange={(e) => updateConfig("text", e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Botões (até 3)</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6"
                    onClick={() => {
                      const buttons = [...((node.config.buttons as {id: string; text: string}[]) || [])];
                      if (buttons.length < 3) {
                        buttons.push({ id: String(buttons.length + 1), text: "" });
                        updateConfig("buttons", buttons);
                      }
                    }}
                    disabled={((node.config.buttons as unknown[]) || []).length >= 3}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Adicionar
                  </Button>
                </div>
                {((node.config.buttons as {id: string; text: string}[]) || []).map((btn, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      placeholder={`Botão ${i + 1}`}
                      value={btn.text}
                      onChange={(e) => {
                        const buttons = [...((node.config.buttons as {id: string; text: string}[]) || [])];
                        buttons[i] = { ...buttons[i], text: e.target.value };
                        updateConfig("buttons", buttons);
                      }}
                    />
                    {((node.config.buttons as unknown[]) || []).length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => {
                          const buttons = [...((node.config.buttons as {id: string; text: string}[]) || [])];
                          buttons.splice(i, 1);
                          updateConfig("buttons", buttons);
                        }}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* LIST */}
          {node.nodeType === "list" && (
            <>
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  placeholder="Menu Principal"
                  value={(node.config.title as string) || ""}
                  onChange={(e) => updateConfig("title", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Texto do Botão</Label>
                <Input
                  placeholder="Ver opções"
                  value={(node.config.buttonText as string) || ""}
                  onChange={(e) => updateConfig("buttonText", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Seções</Label>
                {((node.config.sections as {title: string; rows: {id: string; title: string; description: string}[]}[]) || []).map((section, sIdx) => (
                  <div key={sIdx} className="border rounded-lg p-2 space-y-2">
                    <Input
                      placeholder="Título da seção"
                      value={section.title}
                      onChange={(e) => {
                        const sections = [...((node.config.sections as unknown[]) || [])] as typeof node.config.sections;
                        (sections as {title: string}[])[sIdx].title = e.target.value;
                        updateConfig("sections", sections);
                      }}
                    />
                    {section.rows.map((row, rIdx) => (
                      <div key={rIdx} className="ml-2 space-y-1">
                        <Input
                          placeholder="Título do item"
                          value={row.title}
                          className="h-8 text-xs"
                          onChange={(e) => {
                            const sections = JSON.parse(JSON.stringify(node.config.sections || []));
                            sections[sIdx].rows[rIdx].title = e.target.value;
                            updateConfig("sections", sections);
                          }}
                        />
                        <Input
                          placeholder="Descrição (opcional)"
                          value={row.description}
                          className="h-8 text-xs"
                          onChange={(e) => {
                            const sections = JSON.parse(JSON.stringify(node.config.sections || []));
                            sections[sIdx].rows[rIdx].description = e.target.value;
                            updateConfig("sections", sections);
                          }}
                        />
                      </div>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-full"
                      onClick={() => {
                        const sections = JSON.parse(JSON.stringify(node.config.sections || []));
                        sections[sIdx].rows.push({ id: String(Date.now()), title: "", description: "" });
                        updateConfig("sections", sections);
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Adicionar item
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    const sections = JSON.parse(JSON.stringify(node.config.sections || []));
                    sections.push({ title: "", rows: [{ id: String(Date.now()), title: "", description: "" }] });
                    updateConfig("sections", sections);
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" /> Adicionar seção
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Configure seções e até 10 opções
              </p>
            </>
          )}

          {/* LOCATION */}
          {node.nodeType === "location" && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Latitude</Label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="-23.5505"
                    value={(node.config.latitude as string) || ""}
                    onChange={(e) => updateConfig("latitude", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Longitude</Label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="-46.6333"
                    value={(node.config.longitude as string) || ""}
                    onChange={(e) => updateConfig("longitude", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Nome do Local</Label>
                <Input
                  placeholder="Escritório Central"
                  value={(node.config.name as string) || ""}
                  onChange={(e) => updateConfig("name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Endereço</Label>
                <Input
                  placeholder="Av. Paulista, 1000"
                  value={(node.config.address as string) || ""}
                  onChange={(e) => updateConfig("address", e.target.value)}
                />
              </div>
            </>
          )}

          {/* CONTACT */}
          {node.nodeType === "contact" && (
            <>
              <div className="space-y-2">
                <Label>Nome Completo</Label>
                <Input
                  placeholder="João Silva"
                  value={(node.config.fullName as string) || ""}
                  onChange={(e) => updateConfig("fullName", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  placeholder="5511999999999"
                  value={(node.config.phone as string) || ""}
                  onChange={(e) => updateConfig("phone", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Email (opcional)</Label>
                <Input
                  type="email"
                  placeholder="joao@empresa.com"
                  value={(node.config.email as string) || ""}
                  onChange={(e) => updateConfig("email", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Organização (opcional)</Label>
                <Input
                  placeholder="Empresa LTDA"
                  value={(node.config.organization as string) || ""}
                  onChange={(e) => updateConfig("organization", e.target.value)}
                />
              </div>
            </>
          )}

          {/* EVENT */}
          {node.nodeType === "event" && (
            <>
              <div className="space-y-2">
                <Label>Nome do Evento</Label>
                <Input
                  placeholder="Reunião de Equipe"
                  value={(node.config.name as string) || ""}
                  onChange={(e) => updateConfig("name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  placeholder="Detalhes do evento..."
                  value={(node.config.description as string) || ""}
                  onChange={(e) => updateConfig("description", e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Data/Hora Início</Label>
                <Input
                  type="datetime-local"
                  value={(node.config.startDate as string) || ""}
                  onChange={(e) => updateConfig("startDate", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Data/Hora Fim</Label>
                <Input
                  type="datetime-local"
                  value={(node.config.endDate as string) || ""}
                  onChange={(e) => updateConfig("endDate", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Local (opcional)</Label>
                <Input
                  placeholder="Sala de Reuniões"
                  value={(node.config.location as string) || ""}
                  onChange={(e) => updateConfig("location", e.target.value)}
                />
              </div>
            </>
          )}

          {/* DELAY */}
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

          {/* CONDITION */}
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

          {/* NOTIFY */}
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

          {/* WEBHOOK */}
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
      </ScrollArea>
    </Card>
  );
}
