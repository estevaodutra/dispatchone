import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Instance } from "@/hooks/useInstances";
import { GroupCampaign } from "@/hooks/useGroupCampaigns";
import { CampaignGroup } from "@/hooks/useCampaignGroups";

const SEND_MESSAGE_WEBHOOK = "https://n8n-n8n.nuwfic.easypanel.host/webhook/send_messages";

// Converte quebras de linha para formato CRLF (padrão WhatsApp/n8n)
const formatLineBreaks = (text: string | null | undefined): string | null => {
  if (!text) return null;
  // Normaliza removendo \r existentes, depois adiciona \r antes de cada \n
  return text.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
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

// Calculate delay in milliseconds from node config
const calculateDelayMs = (config: Record<string, unknown>): number => {
  const days = (config.days as number) || 0;
  const hours = (config.hours as number) || 0;
  const minutes = (config.minutes as number) || 0;
  const seconds = (config.seconds as number) || 0;
  
  return (
    days * 86400000 +
    hours * 3600000 +
    minutes * 60000 +
    seconds * 1000
  );
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

export interface SequenceNode {
  id: string;
  nodeType: string;
  nodeOrder: number;
  config: Record<string, unknown>;
}

export interface GroupResult {
  groupName: string;
  groupJid: string;
  nodesSuccess: number;
  nodesFailed: number;
  completed: boolean;
}

export interface SendProgress {
  currentNode: number;
  totalNodes: number;
  currentGroup: number;
  totalGroups: number;
  groupName: string;
  nodeType: string;
  status: "sending" | "waiting" | "completed" | "error";
  errorMessage?: string;
  // Extended progress tracking
  groupsCompleted: number;
  nodesProcessedTotal: number;
  nodesFailed: number;
  groupResults: GroupResult[];
}

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

  // Orchestrated message sending - sends each node individually to webhook
  const sendMessageMutation = useMutation({
    mutationFn: async (params: {
      message: GroupMessage;
      campaign: GroupCampaign;
      instance: Instance;
      groups: CampaignGroup[];
      trigger?: { phone?: string; name?: string };
      sequenceNodes?: SequenceNode[];
      onProgress?: (progress: SendProgress) => void;
      abortSignal?: AbortSignal;
    }) => {
      const { message, campaign, instance, groups, trigger, sequenceNodes, onProgress, abortSignal } = params;
      
      // If no sequence nodes, send as simple message
      if (!sequenceNodes || sequenceNodes.length === 0) {
        const payload = {
          instance: {
            id: instance.id,
            name: instance.name,
            phone: instance.phoneNumber,
            provider: instance.provider,
            externalInstanceId: instance.idInstance,
            externalInstanceToken: instance.tokenInstance,
          },
          campaign: {
            id: campaign.id,
            name: campaign.name,
            status: campaign.status,
          },
          groups: groups.map(g => ({
            id: g.id,
            groupJid: g.groupJid,
            groupName: g.groupName,
          })),
          message_content: {
            text: formatLineBreaks(message.content),
            variables: message.variables || {},
            mediaUrl: message.mediaUrl || null,
            mediaType: message.mediaType || null,
            mediaCaption: formatLineBreaks(message.mediaCaption),
          },
          message_set: {
            id: message.id,
            type: message.type,
            sendPrivate: message.sendPrivate,
            mentionMember: message.mentionMember,
          },
          trigger,
          triggeredAt: new Date().toISOString(),
        };

        const response = await fetch(SEND_MESSAGE_WEBHOOK, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: abortSignal,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Falha ao enviar mensagem: ${errorText}`);
        }

        return { success: true, nodesProcessed: 0, groupsProcessed: groups.length };
      }

      // Sort nodes by nodeOrder
      const sortedNodes = [...sequenceNodes].sort((a, b) => a.nodeOrder - b.nodeOrder);
      const totalNodes = sortedNodes.length;
      const totalGroups = groups.length;
      
      let nodesProcessed = 0;
      let failedNodes = 0;
      
      // Track stats per group for final results
      const groupStats = new Map<string, { success: number; failed: number }>();
      groups.forEach(g => groupStats.set(g.groupJid, { success: 0, failed: 0 }));
      
      // NODE-FIRST: For each node, send to ALL groups before moving to next node
      for (let nodeIndex = 0; nodeIndex < sortedNodes.length; nodeIndex++) {
        const node = sortedNodes[nodeIndex];
        
        // Check if aborted
        if (abortSignal?.aborted) {
          throw new Error("Envio cancelado pelo usuário");
        }
        
        // If it's a DELAY node, wait ONCE (not per group) and then continue
        if (node.nodeType === "delay") {
          const delayMs = calculateDelayMs(node.config);
          
          if (delayMs > 0) {
            // Report waiting status
            onProgress?.({
              currentNode: nodeIndex + 1,
              totalNodes,
              currentGroup: 0,
              totalGroups,
              groupName: "Aguardando delay...",
              nodeType: node.nodeType,
              status: "waiting",
              groupsCompleted: 0,
              nodesProcessedTotal: nodesProcessed,
              nodesFailed: failedNodes,
              groupResults: [],
            });
            
            // Wait for the delay (with abort support)
            await new Promise<void>((resolve, reject) => {
              const timeoutId = setTimeout(resolve, delayMs);
              
              if (abortSignal) {
                abortSignal.addEventListener("abort", () => {
                  clearTimeout(timeoutId);
                  reject(new Error("Envio cancelado pelo usuário"));
                });
              }
            });
          }
          
          nodesProcessed++;
          console.log(`⏱️ Delay node ${nodeIndex + 1}/${totalNodes} concluído`);
          continue; // Don't send delay to webhook, move to next node
        }
        
        // For each group - send this node to all groups
        for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
          const group = groups[groupIndex];
          
          // Check if aborted
          if (abortSignal?.aborted) {
            throw new Error("Envio cancelado pelo usuário");
          }
          
          // Report sending status
          onProgress?.({
            currentNode: nodeIndex + 1,
            totalNodes,
            currentGroup: groupIndex + 1,
            totalGroups,
            groupName: group.groupName,
            nodeType: node.nodeType,
            status: "sending",
            groupsCompleted: groupIndex,
            nodesProcessedTotal: nodesProcessed,
            nodesFailed: failedNodes,
            groupResults: [],
          });
          
          // Build individual payload for this node + group
          const payload = {
            instance: {
              id: instance.id,
              name: instance.name,
              phone: instance.phoneNumber,
              provider: instance.provider,
              externalInstanceId: instance.idInstance,
              externalInstanceToken: instance.tokenInstance,
            },
            campaign: {
              id: campaign.id,
              name: campaign.name,
              status: campaign.status,
            },
            group: {
              id: group.id,
              groupJid: group.groupJid,
              groupName: group.groupName,
            },
            node: {
              id: node.id,
              nodeType: node.nodeType,
              nodeOrder: node.nodeOrder,
              config: formatNodeConfig(node.config, node.nodeType),
            },
            execution: {
              sequenceId: message.sequenceId,
              totalNodes,
              currentNode: nodeIndex + 1,
              triggeredAt: new Date().toISOString(),
            },
            message_set: {
              id: message.id,
              type: message.type,
              sendPrivate: message.sendPrivate,
              mentionMember: message.mentionMember,
            },
            trigger,
          };
          
          // Get current user for logging
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          const startTime = Date.now();
          
          // Create log entry before sending (using raw insert for new columns)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: logEntry } = await (supabase
            .from("group_message_logs") as any)
            .insert({
              user_id: currentUser?.id,
              group_campaign_id: campaign.id,
              sequence_id: message.sequenceId,
              message_id: message.id,
              node_type: node.nodeType,
              node_order: node.nodeOrder,
              group_jid: group.groupJid,
              group_name: group.groupName,
              instance_id: instance.id,
              instance_name: instance.name,
              campaign_name: campaign.name,
              status: "sending",
              payload: payload,
            })
            .select()
            .single();
          
          try {
            // Send to webhook
            const response = await fetch(SEND_MESSAGE_WEBHOOK, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
              signal: abortSignal,
            });
            
            const responseTimeMs = Date.now() - startTime;
            
            // Parse Z-API response to extract IDs
            let providerResponse = null;
            let zaapId = null;
            let externalMessageId = null;
            
            if (!response.ok) {
              // Try to parse error response as JSON
              let errorText = '';
              try {
                const errorData = await response.json();
                providerResponse = errorData;
                errorText = JSON.stringify(errorData);
              } catch {
                errorText = await response.text();
              }
              
              // Update log to failed with provider response
              if (logEntry?.id) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (supabase
                  .from("group_message_logs") as any)
                  .update({ 
                    status: "failed", 
                    error_message: errorText,
                    response_time_ms: responseTimeMs,
                    provider_response: providerResponse,
                  })
                  .eq("id", logEntry.id);
              }
              
              onProgress?.({
                currentNode: nodeIndex + 1,
                totalNodes,
                currentGroup: groupIndex + 1,
                totalGroups,
                groupName: group.groupName,
                nodeType: node.nodeType,
                status: "error",
                errorMessage: errorText,
                groupsCompleted: groupIndex,
                nodesProcessedTotal: nodesProcessed + 1,
                nodesFailed: failedNodes + 1,
                groupResults: [],
              });
              
              // Increment failed counter and CONTINUE (don't throw)
              const stats = groupStats.get(group.groupJid)!;
              stats.failed++;
              failedNodes++;
              nodesProcessed++;
              console.log(`❌ Node ${nodeIndex + 1}/${totalNodes} falhou para grupo ${groupIndex + 1}/${totalGroups}: ${group.groupName}`);
              continue;
            }
            
            // Parse successful Z-API response
            try {
              const responseData = await response.json();
              providerResponse = responseData;
              
              // Z-API returns array, get first item
              if (Array.isArray(responseData) && responseData.length > 0) {
                const firstResult = responseData[0];
                zaapId = firstResult.zaapId || null;
                externalMessageId = firstResult.messageId || firstResult.id || null;
              }
              
              console.log(`📨 Resposta Z-API:`, { zaapId, externalMessageId });
            } catch (parseError) {
              console.warn(`⚠️ Não foi possível parsear resposta JSON:`, parseError);
            }
            
            // Update log to sent with Z-API response data
            if (logEntry?.id) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (supabase
                .from("group_message_logs") as any)
                .update({ 
                  status: "sent",
                  response_time_ms: responseTimeMs,
                  provider_response: providerResponse,
                  zaap_id: zaapId,
                  external_message_id: externalMessageId,
                })
                .eq("id", logEntry.id);
            }
            
            // Success - increment counter and log
            const stats = groupStats.get(group.groupJid)!;
            stats.success++;
            nodesProcessed++;
            console.log(`✅ Node ${nodeIndex + 1}/${totalNodes} enviado para grupo ${groupIndex + 1}/${totalGroups}: ${group.groupName}`);
          } catch (error) {
            const catchResponseTimeMs = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
            
            // Update log to failed if not already updated
            if (logEntry?.id) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (supabase
                .from("group_message_logs") as any)
                .update({ 
                  status: "failed", 
                  error_message: errorMessage,
                  response_time_ms: catchResponseTimeMs,
                })
                .eq("id", logEntry.id);
            }
            
            // Report error but CONTINUE to next group (don't throw)
            onProgress?.({
              currentNode: nodeIndex + 1,
              totalNodes,
              currentGroup: groupIndex + 1,
              totalGroups,
              groupName: group.groupName,
              nodeType: node.nodeType,
              status: "error",
              errorMessage: errorMessage,
              groupsCompleted: groupIndex,
              nodesProcessedTotal: nodesProcessed + 1,
              nodesFailed: failedNodes + 1,
              groupResults: [],
            });
            
            // Increment failed counter
            const stats = groupStats.get(group.groupJid)!;
            stats.failed++;
            failedNodes++;
            nodesProcessed++;
            console.log(`❌ Node ${nodeIndex + 1}/${totalNodes} erro para grupo ${groupIndex + 1}/${totalGroups}: ${group.groupName} - ${errorMessage}`);
            
            // Only rethrow if it's an abort/cancel error
            if (errorMessage.includes("cancelado") || errorMessage.includes("aborted")) {
              throw error;
            }
            // Continue to next group
          }
        } // End of group loop for this node
        
        console.log(`📦 Node ${nodeIndex + 1}/${totalNodes} enviado para todos os ${totalGroups} grupos`);
      } // End of node loop
      
      // Build final groupResults from stats
      const groupResults: GroupResult[] = groups.map(g => {
        const stats = groupStats.get(g.groupJid)!;
        return {
          groupName: g.groupName,
          groupJid: g.groupJid,
          nodesSuccess: stats.success,
          nodesFailed: stats.failed,
          completed: true,
        };
      });
      
      // Report completion
      onProgress?.({
        currentNode: totalNodes,
        totalNodes,
        currentGroup: totalGroups,
        totalGroups,
        groupName: groups[groups.length - 1]?.groupName || "",
        nodeType: "completed",
        status: "completed",
        groupsCompleted: totalGroups,
        nodesProcessedTotal: nodesProcessed,
        nodesFailed: failedNodes,
        groupResults: [...groupResults],
      });
      
      return { success: failedNodes === 0, nodesProcessed, nodesFailed: failedNodes, groupsProcessed: groups.length };
    },
    onSuccess: (result) => {
      if (result.nodesProcessed > 0) {
        const failedText = result.nodesFailed > 0 ? ` (${result.nodesFailed} falhou)` : "";
        toast({ 
          title: result.nodesFailed === 0 ? "Sequência enviada" : "Sequência enviada com erros", 
          description: `${result.nodesProcessed} nodes processados para ${result.groupsProcessed} grupo(s)${failedText}.`,
          variant: result.nodesFailed > 0 ? "destructive" : "default",
        });
      } else {
        toast({ title: "Enviado", description: "Mensagem enviada com sucesso!" });
      }
    },
    onError: (error) => {
      if (error.message.includes("cancelado")) {
        toast({ title: "Cancelado", description: "Envio cancelado pelo usuário.", variant: "default" });
      } else {
        toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
      }
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
