import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

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
  } | null;
  sendPrivate: boolean;
  mentionMember: boolean;
  sequenceOrder: number;
  delaySeconds: number;
  active: boolean;
  createdAt: string;
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
    isCreating: createMessageMutation.isPending,
    isUpdating: updateMessageMutation.isPending,
    isDeleting: deleteMessageMutation.isPending,
  };
}
