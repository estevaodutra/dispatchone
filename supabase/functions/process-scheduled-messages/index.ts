import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Default webhook URL for messages category
const DEFAULT_MESSAGES_WEBHOOK = "https://n8n-n8n.nuwfic.easypanel.host/webhook/messages";

// Max delay per node in Edge Function (20 seconds to stay under timeout)
const MAX_DELAY_MS = 20000;

interface ScheduleConfig {
  days: number[];
  times: string[];
  mode?: string;
}

interface GroupMessage {
  id: string;
  user_id: string;
  group_campaign_id: string;
  type: string;
  content: string;
  active: boolean;
  schedule: ScheduleConfig;
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

// ============= Standardized Payload Builder =============

interface StandardizedPayload {
  body: {
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
    body: {
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
    },
  };
}

// ============= Formatting helpers =============

// Format line breaks for WhatsApp/n8n (CRLF)
const formatLineBreaks = (text: string | null | undefined): string | null => {
  if (!text) return null;
  return text.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
};

// Process node config to format line breaks
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

// Get action name based on node type
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
  return actionMap[nodeType] || "message.send_text";
};

// ============= Main handler =============

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current time in Brazil timezone
    const now = new Date();
    const brasilFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const brasilDateFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Sao_Paulo",
      weekday: "short",
    });

    const timeParts = brasilFormatter.formatToParts(now);
    const hour = timeParts.find(p => p.type === "hour")?.value || "00";
    const minute = timeParts.find(p => p.type === "minute")?.value || "00";
    const currentTime = `${hour}:${minute}`;
    
    // Get day of week (0 = Sunday, 6 = Saturday)
    const dayString = brasilDateFormatter.format(now);
    const dayMap: Record<string, number> = {
      "Sun": 0, "Mon": 1, "Tue": 2, "Wed": 3, "Thu": 4, "Fri": 5, "Sat": 6
    };
    const currentDay = dayMap[dayString] ?? new Date().getDay();
    
    // Get today's date for execution tracking
    const todayDate = new Date().toISOString().split("T")[0];

    console.log(`[Scheduler] Running at ${currentTime} (Brazil), day ${currentDay}, date ${todayDate}`);

    // Fetch all active scheduled messages
    const { data: messages, error: messagesError } = await supabase
      .from("group_messages")
      .select(`
        id,
        user_id,
        group_campaign_id,
        type,
        content,
        active,
        schedule,
        sequence_id,
        media_url,
        media_type,
        media_caption,
        mention_member,
        send_private,
        delay_seconds
      `)
      .eq("type", "scheduled")
      .eq("active", true);

    if (messagesError) {
      console.error("[Scheduler] Error fetching messages:", messagesError);
      throw messagesError;
    }

    console.log(`[Scheduler] Found ${messages?.length || 0} active scheduled messages`);

    // Filter messages that match current day and time
    const messagesToSend = (messages || []).filter((msg: GroupMessage) => {
      const schedule = msg.schedule as ScheduleConfig;
      if (!schedule?.days || !schedule?.times) {
        console.log(`[Scheduler] Message ${msg.id} has invalid schedule`);
        return false;
      }
      
      const matchesDay = schedule.days.includes(currentDay);
      const matchesTime = schedule.times.includes(currentTime);
      
      console.log(`[Scheduler] Message ${msg.id}: day ${currentDay} in [${schedule.days.join(",")}]=${matchesDay}, time ${currentTime} in [${schedule.times.join(",")}]=${matchesTime}`);
      
      return matchesDay && matchesTime;
    });

    console.log(`[Scheduler] ${messagesToSend.length} messages match current schedule`);

    const results: Array<{ messageId: string; status: string; nodesProcessed?: number; error?: string }> = [];

    for (const message of messagesToSend) {
      try {
        // Check if already executed today at this time
        const { data: existingExecution } = await supabase
          .from("scheduled_message_executions")
          .select("id")
          .eq("message_id", message.id)
          .eq("scheduled_date", todayDate)
          .eq("scheduled_time", currentTime)
          .maybeSingle();

        if (existingExecution) {
          console.log(`[Scheduler] Message ${message.id} already executed at ${currentTime} today, skipping`);
          results.push({ messageId: message.id, status: "skipped", error: "Already executed" });
          continue;
        }

        // Get campaign details
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
          .eq("id", message.group_campaign_id)
          .single();

        if (campaignError || !campaign) {
          console.error(`[Scheduler] Campaign not found for message ${message.id}:`, campaignError);
          results.push({ messageId: message.id, status: "failed", error: "Campaign not found" });
          continue;
        }

        if (campaign.status !== "active") {
          console.log(`[Scheduler] Campaign ${campaign.id} is not active, skipping`);
          results.push({ messageId: message.id, status: "skipped", error: "Campaign not active" });
          continue;
        }

        const instance = campaign.instances as unknown as InstanceData;

        if (instance.status !== "connected") {
          console.log(`[Scheduler] Instance ${instance.id} is not connected, skipping`);
          results.push({ messageId: message.id, status: "skipped", error: "Instance not connected" });
          continue;
        }

        // Get linked groups
        const { data: linkedGroups, error: groupsError } = await supabase
          .from("campaign_groups")
          .select("group_jid, group_name")
          .eq("campaign_id", campaign.id);

        if (groupsError || !linkedGroups || linkedGroups.length === 0) {
          console.log(`[Scheduler] No linked groups for campaign ${campaign.id}`);
          results.push({ messageId: message.id, status: "skipped", error: "No linked groups" });
          continue;
        }

        // Get user's webhook config for messages
        const { data: webhookConfig } = await supabase
          .from("webhook_configs")
          .select("url, is_active")
          .eq("user_id", message.user_id)
          .eq("category", "messages")
          .maybeSingle();

        const webhookUrl = (webhookConfig?.is_active && webhookConfig?.url) 
          ? webhookConfig.url 
          : DEFAULT_MESSAGES_WEBHOOK;

        // Get sequence nodes if sequence is linked
        let sequenceNodes: SequenceNode[] = [];
        if (message.sequence_id) {
          const { data: nodes } = await supabase
            .from("sequence_nodes")
            .select("id, node_type, node_order, config")
            .eq("sequence_id", message.sequence_id)
            .order("node_order", { ascending: true });
          
          sequenceNodes = (nodes || []) as SequenceNode[];
        }

        console.log(`[Scheduler] Message ${message.id}: ${sequenceNodes.length} sequence nodes, ${linkedGroups.length} groups`);

        // Record execution start
        await supabase
          .from("scheduled_message_executions")
          .insert({
            message_id: message.id,
            scheduled_date: todayDate,
            scheduled_time: currentTime,
            status: "executing",
            groups_count: linkedGroups.length,
            user_id: message.user_id,
          });

        let nodesProcessed = 0;
        let nodesFailed = 0;

        // ============= NODE-FIRST ORCHESTRATION =============
        // If no sequence nodes, send as simple message
        if (sequenceNodes.length === 0) {
          // Simple message without sequence
          const action = message.media_url ? "message.send_media" : "message.send_text";
          
          // Build node config for simple message
          const simpleNodeConfig: Record<string, unknown> = {
            text: formatLineBreaks(message.content),
            sendPrivate: message.send_private,
            mentionMember: message.mention_member,
          };
          
          if (message.media_url) {
            simpleNodeConfig.url = message.media_url;
            simpleNodeConfig.mediaType = message.media_type;
            simpleNodeConfig.caption = formatLineBreaks(message.media_caption);
          }
          
          for (const group of linkedGroups) {
            const payload = buildStandardPayload({
              action,
              node: {
                id: message.id,
                type: message.media_url ? "media" : "text",
                order: 0,
                config: simpleNodeConfig,
              },
              campaign: {
                id: campaign.id,
                name: campaign.name,
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

            try {
              const response = await fetch(webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });

              const responseText = await response.text();
              let responseData;
              try {
                responseData = JSON.parse(responseText);
              } catch {
                responseData = { raw: responseText };
              }

              // Log individual send
              await supabase.from("group_message_logs").insert({
                user_id: message.user_id,
                group_campaign_id: message.group_campaign_id,
                message_id: message.id,
                node_type: "simple_message",
                node_order: 0,
                group_jid: group.group_jid,
                group_name: group.group_name,
                instance_id: instance.id,
                instance_name: instance.name,
                campaign_name: campaign.name,
                status: response.ok ? "sent" : "failed",
                error_message: response.ok ? null : `HTTP ${response.status}`,
                payload,
                provider_response: responseData,
              });

              if (response.ok) {
                nodesProcessed++;
              } else {
                nodesFailed++;
              }
            } catch (err) {
              nodesFailed++;
              console.error(`[Scheduler] Error sending to group ${group.group_jid}:`, err);
            }
          }
        } else {
          // ============= SEQUENCE NODE-BY-NODE PROCESSING =============
          const sortedNodes = [...sequenceNodes].sort((a, b) => a.node_order - b.node_order);

          for (let nodeIndex = 0; nodeIndex < sortedNodes.length; nodeIndex++) {
            const node = sortedNodes[nodeIndex];
            
            console.log(`[Scheduler] Processing node ${nodeIndex + 1}/${sortedNodes.length}: ${node.node_type}`);

            // If it's a DELAY node, wait and continue (only once, not per group)
            if (node.node_type === "delay") {
              const delayMs = calculateDelayMs(node.config);
              
              if (delayMs > 0) {
                // Cap delay at MAX_DELAY_MS to avoid timeout
                const effectiveDelay = Math.min(delayMs, MAX_DELAY_MS);
                console.log(`[Scheduler] ⏱️ Delay node: waiting ${effectiveDelay}ms (requested: ${delayMs}ms)`);
                
                await new Promise(resolve => setTimeout(resolve, effectiveDelay));
              }
              
              nodesProcessed++;
              continue; // Don't send delay to webhook
            }

            // For each group - send this node to all groups (Node-First strategy)
            for (const group of linkedGroups) {
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
                  id: campaign.id,
                  name: campaign.name,
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

              try {
                const response = await fetch(webhookUrl, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload),
                });

                const responseText = await response.text();
                let responseData;
                try {
                  responseData = JSON.parse(responseText);
                } catch {
                  responseData = { raw: responseText };
                }

                // Log individual node execution
                await supabase.from("group_message_logs").insert({
                  user_id: message.user_id,
                  group_campaign_id: message.group_campaign_id,
                  message_id: message.id,
                  sequence_id: message.sequence_id,
                  node_type: node.node_type,
                  node_order: node.node_order,
                  group_jid: group.group_jid,
                  group_name: group.group_name,
                  instance_id: instance.id,
                  instance_name: instance.name,
                  campaign_name: campaign.name,
                  status: response.ok ? "sent" : "failed",
                  error_message: response.ok ? null : `HTTP ${response.status}`,
                  payload,
                  provider_response: responseData,
                });

                if (response.ok) {
                  console.log(`[Scheduler] ✅ Node ${node.node_type} sent to ${group.group_name}`);
                } else {
                  nodesFailed++;
                  console.error(`[Scheduler] ❌ Node ${node.node_type} failed for ${group.group_name}: HTTP ${response.status}`);
                }
              } catch (err) {
                nodesFailed++;
                console.error(`[Scheduler] ❌ Error sending node to ${group.group_jid}:`, err);
                
                // Log failed attempt
                await supabase.from("group_message_logs").insert({
                  user_id: message.user_id,
                  group_campaign_id: message.group_campaign_id,
                  message_id: message.id,
                  sequence_id: message.sequence_id,
                  node_type: node.node_type,
                  node_order: node.node_order,
                  group_jid: group.group_jid,
                  group_name: group.group_name,
                  instance_id: instance.id,
                  instance_name: instance.name,
                  campaign_name: campaign.name,
                  status: "failed",
                  error_message: err instanceof Error ? err.message : "Unknown error",
                  payload: {},
                });
              }
            }
            
            nodesProcessed++;
          }
        }

        // Update execution status
        await supabase
          .from("scheduled_message_executions")
          .update({ status: nodesFailed === 0 ? "executed" : "partial" })
          .eq("message_id", message.id)
          .eq("scheduled_date", todayDate)
          .eq("scheduled_time", currentTime);

        console.log(`[Scheduler] ✅ Message ${message.id} completed: ${nodesProcessed} nodes processed, ${nodesFailed} failed`);
        results.push({ messageId: message.id, status: "sent", nodesProcessed });

      } catch (error) {
        console.error(`[Scheduler] Error processing message ${message.id}:`, error);
        results.push({ 
          messageId: message.id, 
          status: "failed", 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: now.toISOString(),
        brasilTime: currentTime,
        brasilDay: currentDay,
        totalMessages: messages?.length || 0,
        matchingMessages: messagesToSend.length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Scheduler] Fatal error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
