import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Instance } from "@/hooks/useInstances";
import { GroupCampaign } from "@/hooks/useGroupCampaigns";
import { CampaignGroup } from "@/hooks/useCampaignGroups";
const SEND_MESSAGE_WEBHOOK = "https://n8n-n8n.nuwfic.easypanel.host/webhook/send_messages";

// Converte quebras de linha para \r\n literal no payload JSON
const formatLineBreaks = (text: string | null | undefined): string | null => {
  if (!text) return null;
  return text.replace(/\r?\n/g, "\r\n");
};

// Processa config dos nodes para formatar quebras de linha
const formatNodeConfig = (
  config: Record<string, unknown>,
  nodeType: string
): Record<string, unknown> => {
  const formatted = { ...config };

  // Campos de texto que precisam de formatação
  const textFields = ["text", "content", "message", "caption", "title", "description", "footer"];

  textFields.forEach((field) => {
    if (typeof formatted[field] === "string") {
      formatted[field] = formatLineBreaks(formatted[field] as string);
    }
  });

  // Para nodes de lista, processar sections
  if (nodeType === "list" && Array.isArray(formatted.sections)) {
    formatted.sections = (formatted.sections as Array<Record<string, unknown>>).map((section) => ({
      ...section,
      title: typeof section.title === "string" ? formatLineBreaks(section.title as string) : section.title,
      rows: Array.isArray(section.rows)
        ? (section.rows as Array<Record<string, unknown>>).map((row) => ({
            ...row,
            title: typeof row.title === "string" ? formatLineBreaks(row.title as string) : row.title,
            description: typeof row.description === "string" ? formatLineBreaks(row.description as string) : row.description,
          }))
        : section.rows,
    }));
  }

  // Para nodes de botões, processar labels
  if (nodeType === "buttons" && Array.isArray(formatted.buttons)) {
    formatted.buttons = (formatted.buttons as Array<Record<string, unknown>>).map((btn) => ({
      ...btn,
      label: typeof btn.label === "string" ? formatLineBreaks(btn.label as string) : btn.label,
    }));
  }

  return formatted;
};

export type MessageType = "welcome" | "farewell" | "scheduled" | "keyword_response";

export interface GroupMessage {
  id: string;
  groupCampaignId: string;
  type: MessageType;
  triggerKeyword: string | null;
  content: string;
  variables: Record<string, unknown>;
  schedule: {
    days?: number[];
    times?: string[];
    delaySeconds?: number;
    mode?: "manual" | "interval";
    intervalConfig?: {
      start: string;
      end: string;
      minutes: number;
    };
  } | null;
  sendPrivate: boolean;
  mentionMember: boolean;
  sequenceOrder: number;
  delaySeconds: number;
  active: boolean;
  createdAt: string;
  sequenceId: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  mediaCaption: string | null;
}

interface DbGroupMessage {
  id: string;
  group_campaign_id: string;
  user_id: string;
  type: string;
  trigger_keyword: string | null;
  content: string;
  variables: Record<string, unknown> | null;
  schedule: Record<string, unknown> | null;
  send_private: boolean | null;
  mention_member: boolean | null;
  sequence_order: number | null;
  delay_seconds: number | null;
  active: boolean | null;
  created_at: string | null;
  sequence_id: string | null;
  media_url: string | null;
  media_type: string | null;
  media_caption: string | null;
}

const transformDbToFrontend = (db: DbGroupMessage): GroupMessage => ({
  id: db.id,
  groupCampaignId: db.group_campaign_id,
  type: db.type as MessageType,
  triggerKeyword: db.trigger_keyword,
  content: db.content,
  variables: db.variables || {},
  schedule: db.schedule as GroupMessage["schedule"],
  sendPrivate: db.send_private || false,
  mentionMember: db.mention_member || false,
  sequenceOrder: db.sequence_order || 0,
  delaySeconds: db.delay_seconds || 0,
  active: db.active ?? true,
  createdAt: db.created_at || new Date().toISOString(),
  sequenceId: db.sequence_id,
  mediaUrl: db.media_url,
  mediaType: db.media_type,
  mediaCaption: db.media_caption,
});

export function useGroupMessages(groupCampaignId: string | null) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading, error, refetch } = useQuery({
    queryKey: ["group_messages", groupCampaignId],
    queryFn: async () => {
      if (!groupCampaignId) return [];

      const { data, error } = await supabase
        .from("group_messages")
        .select("*")
        .eq("group_campaign_id", groupCampaignId)
        .order("sequence_order", { ascending: true });

      if (error) throw error;
      return (data as DbGroupMessage[]).map(transformDbToFrontend);
    },
    enabled: !!user && !!groupCampaignId,
  });

  const createMessageMutation = useMutation({
    mutationFn: async (message: {
      type: MessageType;
      content: string;
      triggerKeyword?: string;
      schedule?: GroupMessage["schedule"];
      sendPrivate?: boolean;
      mentionMember?: boolean;
      sequenceOrder?: number;
      delaySeconds?: number;
      sequenceId?: string;
      mediaUrl?: string;
      mediaType?: string;
      mediaCaption?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      if (!groupCampaignId) throw new Error("No group campaign selected");

      const { data, error } = await supabase
        .from("group_messages")
        .insert({
          user_id: user.id,
          group_campaign_id: groupCampaignId,
          type: message.type,
          content: message.content,
          trigger_keyword: message.triggerKeyword || null,
          schedule: message.schedule || null,
          send_private: message.sendPrivate || false,
          mention_member: message.mentionMember || false,
          sequence_order: message.sequenceOrder || 0,
          delay_seconds: message.delaySeconds || 0,
          sequence_id: message.sequenceId || null,
          media_url: message.mediaUrl || null,
          media_type: message.mediaType || null,
          media_caption: message.mediaCaption || null,
        })
        .select()
        .single();

      if (error) throw error;
      return transformDbToFrontend(data as DbGroupMessage);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group_messages", groupCampaignId] });
      toast({ title: "Mensagem criada", description: "Mensagem automática configurada." });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const updateMessageMutation = useMutation({
    mutationFn: async ({ id, updates }: {
      id: string;
      updates: Partial<{
        type: MessageType;
        content: string;
        triggerKeyword: string | null;
        schedule: GroupMessage["schedule"];
        sendPrivate: boolean;
        mentionMember: boolean;
        sequenceOrder: number;
        delaySeconds: number;
        active: boolean;
        sequenceId: string | null;
        mediaUrl: string | null;
        mediaType: string | null;
        mediaCaption: string | null;
      }>;
    }) => {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.type !== undefined) dbUpdates.type = updates.type;
      if (updates.content !== undefined) dbUpdates.content = updates.content;
      if (updates.triggerKeyword !== undefined) dbUpdates.trigger_keyword = updates.triggerKeyword;
      if (updates.schedule !== undefined) dbUpdates.schedule = updates.schedule;
      if (updates.sendPrivate !== undefined) dbUpdates.send_private = updates.sendPrivate;
      if (updates.mentionMember !== undefined) dbUpdates.mention_member = updates.mentionMember;
      if (updates.sequenceOrder !== undefined) dbUpdates.sequence_order = updates.sequenceOrder;
      if (updates.delaySeconds !== undefined) dbUpdates.delay_seconds = updates.delaySeconds;
      if (updates.active !== undefined) dbUpdates.active = updates.active;
      if (updates.sequenceId !== undefined) dbUpdates.sequence_id = updates.sequenceId;
      if (updates.mediaUrl !== undefined) dbUpdates.media_url = updates.mediaUrl;
      if (updates.mediaType !== undefined) dbUpdates.media_type = updates.mediaType;
      if (updates.mediaCaption !== undefined) dbUpdates.media_caption = updates.mediaCaption;

      const { error } = await supabase
        .from("group_messages")
        .update(dbUpdates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group_messages", groupCampaignId] });
      toast({ title: "Atualizado", description: "Mensagem atualizada com sucesso." });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("group_messages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group_messages", groupCampaignId] });
      toast({ title: "Removido", description: "Mensagem removida com sucesso." });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  // Send message to webhook
  const sendMessageMutation = useMutation({
    mutationFn: async (params: {
      message: GroupMessage;
      campaign: GroupCampaign;
      instance: Instance;
      groups: CampaignGroup[];
      trigger?: { phone?: string; name?: string };
      sequenceNodes?: Array<{
        id: string;
        nodeType: string;
        nodeOrder: number;
        config: Record<string, unknown>;
      }>;
    }) => {
      const payload = {
        instance: {
          id: params.instance.id,
          name: params.instance.name,
          phone: params.instance.phoneNumber,
          provider: params.instance.provider,
          externalInstanceId: params.instance.idInstance,
          externalInstanceToken: params.instance.tokenInstance,
        },
        campaign: {
          id: params.campaign.id,
          name: params.campaign.name,
          status: params.campaign.status,
        },
        groups: params.groups.map(g => ({
          id: g.id,
          groupJid: g.groupJid,
          groupName: g.groupName,
          instanceId: g.instanceId,
          addedAt: g.addedAt,
        })),
        message_set: {
          id: params.message.id,
          type: params.message.type,
          triggerKeyword: params.message.triggerKeyword,
          schedule: params.message.schedule,
          sendPrivate: params.message.sendPrivate,
          mentionMember: params.message.mentionMember,
          delaySeconds: params.message.delaySeconds,
          sequenceId: params.message.sequenceId,
          active: params.message.active,
        },
        message_content: {
          text: formatLineBreaks(params.message.content),
          variables: params.message.variables || {},
          mediaUrl: params.message.mediaUrl || null,
          mediaType: params.message.mediaType || null,
          mediaCaption: formatLineBreaks(params.message.mediaCaption),
        },
        // Include sequence nodes when available (for sequence-linked messages)
        sequence_nodes: params.sequenceNodes?.map(node => ({
          id: node.id,
          nodeType: node.nodeType,
          nodeOrder: node.nodeOrder,
          config: formatNodeConfig(node.config, node.nodeType),
        })) || null,
        trigger: params.trigger,
        triggeredAt: new Date().toISOString(),
      };

      const response = await fetch(SEND_MESSAGE_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Falha ao enviar mensagem: ${errorText}`);
      }

      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Enviado", description: "Mensagem enviada para o webhook com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
    },
  });

  // Group messages by type
  const welcomeMessages = messages.filter((m) => m.type === "welcome");
  const farewellMessages = messages.filter((m) => m.type === "farewell");
  const scheduledMessages = messages.filter((m) => m.type === "scheduled");
  const keywordResponses = messages.filter((m) => m.type === "keyword_response");

  return {
    messages,
    welcomeMessages,
    farewellMessages,
    scheduledMessages,
    keywordResponses,
    isLoading,
    error,
    refetch,
    createMessage: createMessageMutation.mutateAsync,
    updateMessage: updateMessageMutation.mutateAsync,
    deleteMessage: deleteMessageMutation.mutateAsync,
    sendMessage: sendMessageMutation.mutateAsync,
    isCreating: createMessageMutation.isPending,
    isUpdating: updateMessageMutation.isPending,
    isDeleting: deleteMessageMutation.isPending,
    isSending: sendMessageMutation.isPending,
  };
}
