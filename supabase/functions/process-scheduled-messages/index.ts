import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Default webhook URL for messages category
const DEFAULT_MESSAGES_WEBHOOK = "https://n8n-n8n.nuwfic.easypanel.host/webhook/messages";

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

    // Fetch all active scheduled messages with their campaign and instance data
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

    const results: Array<{ messageId: string; status: string; error?: string }> = [];

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

        const instance = campaign.instances as unknown as {
          id: string;
          name: string;
          phone: string;
          provider: string;
          external_instance_id: string;
          external_instance_token: string;
          status: string;
        };

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

        // Build payload
        let sequenceNodes: SequenceNode[] = [];
        if (message.sequence_id) {
          const { data: nodes } = await supabase
            .from("sequence_nodes")
            .select("id, node_type, node_order, config")
            .eq("sequence_id", message.sequence_id)
            .order("node_order", { ascending: true });
          
          sequenceNodes = (nodes || []) as SequenceNode[];
        }

        const payload = {
          action: "message.send_scheduled",
          body: {
            messageId: message.id,
            campaignId: campaign.id,
            campaignName: campaign.name,
            content: message.content,
            mediaUrl: message.media_url,
            mediaType: message.media_type,
            mediaCaption: message.media_caption,
            mentionMember: message.mention_member,
            sendPrivate: message.send_private,
            delaySeconds: message.delay_seconds,
            sequenceId: message.sequence_id,
            sequenceNodes: sequenceNodes.map(node => ({
              id: node.id,
              type: node.node_type,
              order: node.node_order,
              config: node.config,
            })),
          },
          instance: {
            id: instance.id,
            name: instance.name,
            phone: instance.phone,
            provider: instance.provider,
            externalId: instance.external_instance_id,
            externalToken: instance.external_instance_token,
          },
          groups: linkedGroups.map(g => ({
            jid: g.group_jid,
            name: g.group_name,
          })),
          userId: message.user_id,
          scheduledTime: currentTime,
          scheduledDate: todayDate,
        };

        console.log(`[Scheduler] Sending message ${message.id} to ${linkedGroups.length} groups via ${webhookUrl}`);

        // Send to webhook
        const webhookResponse = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const responseText = await webhookResponse.text();
        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch {
          responseData = { raw: responseText };
        }

        // Record execution
        await supabase
          .from("scheduled_message_executions")
          .insert({
            message_id: message.id,
            scheduled_date: todayDate,
            scheduled_time: currentTime,
            status: webhookResponse.ok ? "executed" : "failed",
            groups_count: linkedGroups.length,
            user_id: message.user_id,
          });

        // Log to group_message_logs
        for (const group of linkedGroups) {
          await supabase
            .from("group_message_logs")
            .insert({
              user_id: message.user_id,
              group_campaign_id: message.group_campaign_id,
              message_id: message.id,
              sequence_id: message.sequence_id,
              node_type: "scheduled_trigger",
              node_order: 0,
              group_jid: group.group_jid,
              group_name: group.group_name,
              instance_id: instance.id,
              instance_name: instance.name,
              campaign_name: campaign.name,
              status: webhookResponse.ok ? "sent" : "failed",
              error_message: webhookResponse.ok ? null : `Webhook returned ${webhookResponse.status}`,
              payload: payload,
              provider_response: responseData,
            });
        }

        console.log(`[Scheduler] Message ${message.id} sent successfully to ${linkedGroups.length} groups`);
        results.push({ messageId: message.id, status: "sent" });

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