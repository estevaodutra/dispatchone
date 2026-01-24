import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Default webhook URL for messages category
const DEFAULT_MESSAGES_WEBHOOK = "https://n8n-n8n.nuwfic.easypanel.host/webhook/messages";

// Max delay per node (20 seconds to stay safe under timeout)
const MAX_DELAY_MS = 20000;

// ============= Types =============

interface ExecuteMessageRequest {
  messageId: string;
  campaignId: string;
  groupIds?: string[];
  sequenceId?: string | null;
}

interface GroupMessage {
  id: string;
  user_id: string;
  group_campaign_id: string;
  content: string;
  active: boolean;
  sequence_id: string | null;
  media_url: string | null;
  media_type: string | null;
  media_caption: string | null;
  mention_member: boolean;
  send_private: boolean;
  delay_seconds: number;
}

interface SequenceNode {
  id: string;
  node_type: string;
  node_order: number;
  config: Record<string, unknown>;
}

interface LinkedGroup {
  id: string;
  group_jid: string;
  group_name: string;
}

interface InstanceData {
  id: string;
  name: string;
  phone: string;
  provider: string;
  external_instance_id: string;
  external_instance_token: string;
  status: string;
}

interface CampaignData {
  id: string;
  name: string;
  status: string;
  instance_id: string;
  instances: InstanceData;
}

// ============= Standardized Payload =============

interface StandardizedPayload {
  action: string;
  node: {
    id: string;
    type: string;
    order: number;
    config: Record<string, unknown>;
  };
  campaign: {
    id: string;
    name: string;
  };
  instance: {
    id: string;
    name: string;
    phone: string;
    provider: string;
    externalId: string;
    externalToken: string;
  };
  destination: {
    phone: string;
    jid: string;
    name: string;
  };
}

function buildStandardPayload(params: {
  action: string;
  node: { id: string; type: string; order: number; config: Record<string, unknown> };
  campaign: { id: string; name: string };
  instance: { id: string; name: string; phone: string; provider: string; externalId: string; externalToken: string };
  destination: { jid: string; name: string };
}): StandardizedPayload {
  return {
    action: params.action,
    node: {
      id: params.node.id,
      type: params.node.type,
      order: params.node.order,
      config: params.node.config,
    },
    campaign: {
      id: params.campaign.id,
      name: params.campaign.name,
    },
    instance: {
      id: params.instance.id,
      name: params.instance.name,
      phone: params.instance.phone,
      provider: params.instance.provider,
      externalId: params.instance.externalId,
      externalToken: params.instance.externalToken,
    },
    destination: {
      phone: params.destination.jid,
      jid: params.destination.jid,
      name: params.destination.name,
    },
  };
}

// ============= Formatting helpers =============

const formatLineBreaks = (text: string | null | undefined): string | null => {
  if (!text) return null;
  return text.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
};

const formatNodeConfig = (
  config: Record<string, unknown>,
  nodeType: string
): Record<string, unknown> => {
  const formatted = { ...config };

  const textFields = ["text", "content", "message", "caption", "title", "description", "footer"];

  textFields.forEach((field) => {
    if (typeof formatted[field] === "string") {
      formatted[field] = formatLineBreaks(formatted[field] as string);
    }
  });

  // For list nodes, process sections
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

  // For button nodes, process labels
  if (nodeType === "buttons" && Array.isArray(formatted.buttons)) {
    formatted.buttons = (formatted.buttons as Array<Record<string, unknown>>).map((btn) => ({
      ...btn,
      label: typeof btn.label === "string" ? formatLineBreaks(btn.label as string) : btn.label,
    }));
  }

  return formatted;
};

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

const getActionForNodeType = (nodeType: string): string => {
  const actionMap: Record<string, string> = {
    message: "message.send_text",
    text: "message.send_text",
    image: "message.send_image",
    video: "message.send_video",
    audio: "message.send_audio",
    document: "message.send_document",
    sticker: "message.send_sticker",
    location: "message.send_location",
    contact: "message.send_contact",
    buttons: "message.send_buttons",
    list: "message.send_list",
    poll: "message.send_poll",
    reaction: "message.send_reaction",
    media: "message.send_media",
  };
  return actionMap[nodeType] || `message.send_${nodeType}`;
};

// ============= Main handler =============

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body: ExecuteMessageRequest = await req.json();
    const { messageId, campaignId, sequenceId } = body;

    if (!messageId || !campaignId) {
      return new Response(
        JSON.stringify({ error: "messageId and campaignId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[ExecuteMessage] Starting execution for message ${messageId}, campaign ${campaignId}`);

    // Get message details
    const { data: message, error: messageError } = await supabase
      .from("group_messages")
      .select("*")
      .eq("id", messageId)
      .single();

    if (messageError || !message) {
      console.error("[ExecuteMessage] Message not found:", messageError);
      return new Response(
        JSON.stringify({ error: "Message not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const typedMessage = message as GroupMessage;

    // Get campaign with instance
    const { data: campaign, error: campaignError } = await supabase
      .from("group_campaigns")
      .select(`
        id,
        name,
        status,
        instance_id,
        instances!inner(
          id,
          name,
          phone,
          provider,
          external_instance_id,
          external_instance_token,
          status
        )
      `)
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      console.error("[ExecuteMessage] Campaign not found:", campaignError);
      return new Response(
        JSON.stringify({ error: "Campaign not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const typedCampaign = campaign as unknown as CampaignData;
    const instance = typedCampaign.instances;

    if (instance.status !== "connected") {
      return new Response(
        JSON.stringify({ error: "Instance is not connected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get linked groups
    const { data: linkedGroups, error: groupsError } = await supabase
      .from("campaign_groups")
      .select("id, group_jid, group_name")
      .eq("campaign_id", campaignId);

    if (groupsError || !linkedGroups || linkedGroups.length === 0) {
      return new Response(
        JSON.stringify({ error: "No linked groups found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const groups = linkedGroups as LinkedGroup[];

    // Get user's webhook config
    const { data: webhookConfig } = await supabase
      .from("webhook_configs")
      .select("url, is_active")
      .eq("user_id", typedMessage.user_id)
      .eq("category", "messages")
      .maybeSingle();

    const webhookUrl = (webhookConfig?.is_active && webhookConfig?.url) 
      ? webhookConfig.url 
      : DEFAULT_MESSAGES_WEBHOOK;

    // Get sequence nodes if sequence is linked
    let sequenceNodes: SequenceNode[] = [];
    const effectiveSequenceId = sequenceId || typedMessage.sequence_id;
    
    if (effectiveSequenceId) {
      const { data: nodes } = await supabase
        .from("sequence_nodes")
        .select("id, node_type, node_order, config")
        .eq("sequence_id", effectiveSequenceId)
        .order("node_order", { ascending: true });
      
      sequenceNodes = (nodes || []) as SequenceNode[];
    }

    console.log(`[ExecuteMessage] ${sequenceNodes.length} sequence nodes, ${groups.length} groups, webhook: ${webhookUrl}`);

    let nodesProcessed = 0;
    let nodesFailed = 0;

    // ============= NODE-FIRST ORCHESTRATION =============
    if (sequenceNodes.length === 0) {
      // Simple message without sequence
      const action = typedMessage.media_url ? "message.send_media" : "message.send_text";
      
      const simpleNodeConfig: Record<string, unknown> = {
        text: formatLineBreaks(typedMessage.content),
        sendPrivate: typedMessage.send_private,
        mentionMember: typedMessage.mention_member,
      };
      
      if (typedMessage.media_url) {
        simpleNodeConfig.url = typedMessage.media_url;
        simpleNodeConfig.mediaType = typedMessage.media_type;
        simpleNodeConfig.caption = formatLineBreaks(typedMessage.media_caption);
      }
      
      for (const group of groups) {
        const payload = buildStandardPayload({
          action,
          node: {
            id: typedMessage.id,
            type: typedMessage.media_url ? "media" : "text",
            order: 0,
            config: simpleNodeConfig,
          },
          campaign: {
            id: typedCampaign.id,
            name: typedCampaign.name,
          },
          instance: {
            id: instance.id,
            name: instance.name,
            phone: instance.phone || "",
            provider: instance.provider,
            externalId: instance.external_instance_id || "",
            externalToken: instance.external_instance_token || "",
          },
          destination: {
            jid: group.group_jid,
            name: group.group_name,
          },
        });

        const sendStartTime = Date.now();
        
        // Create log entry
        const { data: logEntry } = await supabase
          .from("group_message_logs")
          .insert({
            user_id: typedMessage.user_id,
            group_campaign_id: typedCampaign.id,
            message_id: typedMessage.id,
            node_type: "simple_message",
            node_order: 0,
            group_jid: group.group_jid,
            group_name: group.group_name,
            instance_id: instance.id,
            instance_name: instance.name,
            campaign_name: typedCampaign.name,
            status: "sending",
            payload,
          })
          .select()
          .single();

        try {
          const response = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          const responseTimeMs = Date.now() - sendStartTime;
          const responseText = await response.text();
          let responseData;
          try {
            responseData = JSON.parse(responseText);
          } catch {
            responseData = { raw: responseText };
          }

          // Parse Z-API response
          let zaapId = null;
          let externalMessageId = null;
          if (Array.isArray(responseData) && responseData.length > 0) {
            const firstResult = responseData[0];
            zaapId = firstResult.zaapId || null;
            externalMessageId = firstResult.messageId || firstResult.id || null;
          }

          // Update log
          if (logEntry?.id) {
            await supabase
              .from("group_message_logs")
              .update({
                status: response.ok ? "sent" : "failed",
                error_message: response.ok ? null : `HTTP ${response.status}`,
                response_time_ms: responseTimeMs,
                provider_response: responseData,
                zaap_id: zaapId,
                external_message_id: externalMessageId,
              })
              .eq("id", logEntry.id);
          }

          if (response.ok) {
            nodesProcessed++;
            console.log(`[ExecuteMessage] ✅ Sent to ${group.group_name}`);
          } else {
            nodesFailed++;
            console.log(`[ExecuteMessage] ❌ Failed for ${group.group_name}: HTTP ${response.status}`);
          }
        } catch (err) {
          nodesFailed++;
          console.error(`[ExecuteMessage] ❌ Error sending to ${group.group_name}:`, err);
          
          if (logEntry?.id) {
            await supabase
              .from("group_message_logs")
              .update({
                status: "failed",
                error_message: err instanceof Error ? err.message : "Unknown error",
                response_time_ms: Date.now() - sendStartTime,
              })
              .eq("id", logEntry.id);
          }
        }
      }
    } else {
      // ============= SEQUENCE NODE-BY-NODE PROCESSING =============
      const sortedNodes = [...sequenceNodes].sort((a, b) => a.node_order - b.node_order);

      for (let nodeIndex = 0; nodeIndex < sortedNodes.length; nodeIndex++) {
        const node = sortedNodes[nodeIndex];
        
        console.log(`[ExecuteMessage] Processing node ${nodeIndex + 1}/${sortedNodes.length}: ${node.node_type}`);

        // Handle DELAY nodes
        if (node.node_type === "delay") {
          const delayMs = calculateDelayMs(node.config);
          
          if (delayMs > 0) {
            const effectiveDelay = Math.min(delayMs, MAX_DELAY_MS);
            console.log(`[ExecuteMessage] ⏱️ Delay: waiting ${effectiveDelay}ms (requested: ${delayMs}ms)`);
            await new Promise(resolve => setTimeout(resolve, effectiveDelay));
          }
          
          nodesProcessed++;
          continue;
        }

        // Send this node to ALL groups
        for (const group of groups) {
          const action = getActionForNodeType(node.node_type);
          const formattedConfig = formatNodeConfig(node.config, node.node_type);
          
          const payload = buildStandardPayload({
            action,
            node: {
              id: node.id,
              type: node.node_type,
              order: node.node_order,
              config: formattedConfig,
            },
            campaign: {
              id: typedCampaign.id,
              name: typedCampaign.name,
            },
            instance: {
              id: instance.id,
              name: instance.name,
              phone: instance.phone || "",
              provider: instance.provider,
              externalId: instance.external_instance_id || "",
              externalToken: instance.external_instance_token || "",
            },
            destination: {
              jid: group.group_jid,
              name: group.group_name,
            },
          });

          const sendStartTime = Date.now();

          // Create log entry
          const { data: logEntry } = await supabase
            .from("group_message_logs")
            .insert({
              user_id: typedMessage.user_id,
              group_campaign_id: typedCampaign.id,
              message_id: typedMessage.id,
              sequence_id: effectiveSequenceId,
              node_type: node.node_type,
              node_order: node.node_order,
              group_jid: group.group_jid,
              group_name: group.group_name,
              instance_id: instance.id,
              instance_name: instance.name,
              campaign_name: typedCampaign.name,
              status: "sending",
              payload,
            })
            .select()
            .single();

          try {
            const response = await fetch(webhookUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

            const responseTimeMs = Date.now() - sendStartTime;
            const responseText = await response.text();
            let responseData;
            try {
              responseData = JSON.parse(responseText);
            } catch {
              responseData = { raw: responseText };
            }

            // Parse Z-API response
            let zaapId = null;
            let externalMessageId = null;
            if (Array.isArray(responseData) && responseData.length > 0) {
              const firstResult = responseData[0];
              zaapId = firstResult.zaapId || null;
              externalMessageId = firstResult.messageId || firstResult.id || null;
            }

            // Update log
            if (logEntry?.id) {
              await supabase
                .from("group_message_logs")
                .update({
                  status: response.ok ? "sent" : "failed",
                  error_message: response.ok ? null : `HTTP ${response.status}`,
                  response_time_ms: responseTimeMs,
                  provider_response: responseData,
                  zaap_id: zaapId,
                  external_message_id: externalMessageId,
                })
                .eq("id", logEntry.id);
            }

            if (response.ok) {
              console.log(`[ExecuteMessage] ✅ Node ${node.node_type} sent to ${group.group_name}`);
            } else {
              nodesFailed++;
              console.log(`[ExecuteMessage] ❌ Node ${node.node_type} failed for ${group.group_name}: HTTP ${response.status}`);
            }
          } catch (err) {
            nodesFailed++;
            console.error(`[ExecuteMessage] ❌ Error sending node to ${group.group_name}:`, err);
            
            if (logEntry?.id) {
              await supabase
                .from("group_message_logs")
                .update({
                  status: "failed",
                  error_message: err instanceof Error ? err.message : "Unknown error",
                  response_time_ms: Date.now() - sendStartTime,
                })
                .eq("id", logEntry.id);
            }
          }
        }
        
        nodesProcessed++;
      }
    }

    const totalTimeMs = Date.now() - startTime;

    console.log(`[ExecuteMessage] ✅ Completed: ${nodesProcessed} nodes processed, ${nodesFailed} failed, ${totalTimeMs}ms`);

    return new Response(
      JSON.stringify({
        success: nodesFailed === 0,
        nodesProcessed,
        nodesFailed,
        groupsProcessed: groups.length,
        totalTimeMs,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const totalTimeMs = Date.now() - startTime;
    console.error("[ExecuteMessage] Fatal error:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        totalTimeMs,
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
