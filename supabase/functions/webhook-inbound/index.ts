import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  classifyEvent,
  extractContext,
  type ClassificationResult,
  type EventContext,
} from "../_shared/event-classifier.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InboundPayload {
  source: "z-api" | "evolution" | "meta";
  instance_id: string;
  received_at?: string;
  raw_event: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();

    // Detect payload format and normalize
    let payload: InboundPayload;

    if (body.raw_event && body.instance_id) {
      payload = body as InboundPayload;
    } else {
      const nestedBody = body.body as Record<string, unknown> | undefined;
      const instanceId = body.instanceId ||
        nestedBody?.instanceId ||
        body.instance ||
        nestedBody?.connectedPhone ||
        body.phone ||
        body.sender?.phone ||
        "unknown";

      payload = {
        source: "z-api",
        instance_id: String(instanceId),
        raw_event: body,
      };

      console.log("[webhook-inbound] Auto-wrapped raw payload, detected instance_id:", instanceId);
    }

    if (!payload.instance_id || !payload.raw_event) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: instance_id and raw_event" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const source = payload.source || "z-api";
    const externalInstanceId = payload.instance_id;
    const receivedAt = payload.received_at || new Date().toISOString();
    const rawEvent = payload.raw_event;

    console.log(`[webhook-inbound] Received event from ${source}, instance: ${externalInstanceId}`);

    // Find internal instance
    const { data: instance } = await supabase
      .from("instances")
      .select("id, user_id")
      .eq("external_instance_id", externalInstanceId)
      .maybeSingle();

    // Classify using shared classifier
    const classification: ClassificationResult = classifyEvent(source, rawEvent);
    console.log(`[webhook-inbound] Classified as: ${classification.eventType} (${classification.classification}, rule: ${classification.matchedRule}, confidence: ${classification.confidence})`);

    // Extract context using shared extractor
    const context: EventContext = extractContext(source, rawEvent);

    // Insert event with new classification fields
    const { data: insertedEvent, error: insertError } = await supabase
      .from("webhook_events")
      .insert({
        user_id: instance?.user_id || null,
        source,
        external_instance_id: externalInstanceId,
        instance_id: instance?.id || null,
        event_type: classification.eventType,
        event_subtype: classification.eventSubtype,
        classification: classification.classification,
        direction: classification.direction,
        confidence: classification.confidence,
        matched_rule: classification.matchedRule,
        chat_jid: context.chatJid,
        chat_type: context.chatType,
        chat_name: context.chatName,
        sender_phone: context.senderPhone,
        sender_name: context.senderName,
        message_id: context.messageId,
        raw_event: rawEvent,
        event_timestamp: context.eventTimestamp,
        received_at: receivedAt,
        processing_status: classification.classification === "identified" ? "processed" : "pending",
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[webhook-inbound] Insert error:", insertError);
      return new Response(
        JSON.stringify({ success: false, error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[webhook-inbound] Event saved with ID: ${insertedEvent.id}`);

    // ==========================================
    // AUTO-PROCESS POLL RESPONSES
    // ==========================================
    let pollProcessingResult: Record<string, unknown> | null = null;

    if (classification.eventType === "poll_response") {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        const eventBody = rawEvent.body as Record<string, unknown> | undefined;
        const pollVote = eventBody?.pollVote as Record<string, unknown> | undefined;

        if (pollVote) {
          const options = pollVote.options as Array<{ name: string }> | undefined;
          const pollMessageId = pollVote.pollMessageId as string;

          if (pollMessageId && options?.length) {
            const participantPhone = (eventBody?.participantPhone as string) ||
              String(eventBody?.phone || "").split("-")[0];
            const senderName = (eventBody?.senderName as string) || (eventBody?.pushName as string) || "";
            const groupJid = (eventBody?.phone as string) || context.chatJid || "";

            console.log(`[webhook-inbound] Auto-processing poll vote from ${participantPhone} for message ${pollMessageId}`);

            const { data: pollMessage } = await supabase
              .from("poll_messages")
              .select("id, options, instance_id")
              .or(`message_id.eq.${pollMessageId},zaap_id.eq.${pollMessageId}`)
              .maybeSingle();

            if (pollMessage) {
              const votedOptionText = options[0]?.name || "";
              const pollOptions = pollMessage.options as string[];
              let optionIndex = pollOptions.findIndex(
                (opt) => opt.toLowerCase() === votedOptionText.toLowerCase()
              );

              if (optionIndex === -1) {
                optionIndex = pollOptions.findIndex(
                  (opt) =>
                    opt.toLowerCase().includes(votedOptionText.toLowerCase()) ||
                    votedOptionText.toLowerCase().includes(opt.toLowerCase())
                );
              }

              if (optionIndex >= 0) {
                const pollPayload = {
                  message_id: pollMessageId,
                  instance_id: pollMessage.instance_id || instance?.id || "",
                  group_jid: groupJid,
                  respondent: {
                    phone: participantPhone,
                    name: senderName,
                    jid: `${participantPhone}@s.whatsapp.net`,
                  },
                  response: {
                    option_index: optionIndex,
                    option_text: votedOptionText,
                  },
                  timestamp: new Date().toISOString(),
                  _raw_event: rawEvent,
                };

                const pollResponse = await fetch(
                  `${supabaseUrl}/functions/v1/handle-poll-response`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${supabaseServiceKey}`,
                    },
                    body: JSON.stringify(pollPayload),
                  }
                );

                pollProcessingResult = await pollResponse.json();
                console.log(`[webhook-inbound] Auto-processed poll response: ${JSON.stringify(pollProcessingResult)}`);

                await supabase
                  .from("webhook_events")
                  .update({
                    processing_result: pollProcessingResult,
                    processing_status: "processed",
                    processed_at: new Date().toISOString(),
                  })
                  .eq("id", insertedEvent.id);
              } else {
                console.log(`[webhook-inbound] Could not match voted option "${votedOptionText}" to poll options`);
              }
            } else {
              console.log(`[webhook-inbound] Poll message not found for message_id: ${pollMessageId}`);
            }
          }
        }
      } catch (pollError) {
        console.error("[webhook-inbound] Error auto-processing poll:", pollError);
        await supabase
          .from("webhook_events")
          .update({
            processing_error: pollError instanceof Error ? pollError.message : "Unknown error",
            processing_status: "error",
          })
          .eq("id", insertedEvent.id);
      }
    }

    // ==========================================
    // AUTO-PROCESS GROUP JOIN for Pirate Campaigns
    // ==========================================
    if (classification.eventType === "group_join" && context.chatJid && context.senderPhone) {
      try {
        const rawBody = rawEvent.body as Record<string, unknown> | undefined;
        const notifParams = rawBody?.notificationParameters as string[] | undefined;
        const participantRaw = notifParams?.[0] || null;
        const isLid = participantRaw?.includes("@lid");
        const connectedPhone = rawBody?.connectedPhone as string | undefined;
        const phoneToSend = connectedPhone || context.senderPhone;

        console.log(`[webhook-inbound] Detected group_join: group=${context.chatJid}, phone=${phoneToSend}, lid=${isLid ? participantRaw : "none"}, connectedPhone=${connectedPhone || "none"}`);

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        const pirateResponse = await fetch(
          `${supabaseUrl}/functions/v1/pirate-process-join`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              group_jid: context.chatJid,
              phone: phoneToSend,
              lid: isLid ? participantRaw : null,
              instance_id: instance?.id || null,
              raw_event: rawEvent,
            }),
          }
        );

        const pirateResult = await pirateResponse.json();
        console.log(`[webhook-inbound] Pirate process result: ${JSON.stringify(pirateResult)}`);
      } catch (pirateError) {
        console.error("[webhook-inbound] Error processing pirate join:", pirateError);
      }
    }

    // ==========================================
    // AUTO-ACCUMULATE LEADS for Group Execution Lists
    // ==========================================
    if (context.chatJid && context.senderPhone) {
      try {
        // Find group campaign by group_jid via campaign_groups
        const { data: campaignGroup } = await supabase
          .from("campaign_groups")
          .select("campaign_id")
          .eq("group_jid", context.chatJid)
          .maybeSingle();

        const campaignId = campaignGroup?.campaign_id || null;

        if (campaignId) {
          const { data: execList } = await supabase
            .from("group_execution_lists")
            .select("id, current_cycle_id, monitored_events, user_id")
            .eq("campaign_id", campaignId)
            .eq("is_active", true)
            .gt("current_window_end", new Date().toISOString())
            .maybeSingle();

          if (execList && (execList.monitored_events as string[]).includes(classification.eventType)) {
            const { error: upsertError } = await supabase
              .from("group_execution_leads")
              .upsert(
                {
                  list_id: execList.id,
                  user_id: execList.user_id,
                  cycle_id: execList.current_cycle_id,
                  phone: context.senderPhone,
                  name: context.senderName || null,
                  origin_event: classification.eventType,
                  origin_detail: context.chatName || null,
                  status: "pending",
                },
                { onConflict: "list_id,phone,cycle_id", ignoreDuplicates: true }
              );

            if (upsertError) {
              console.error("[webhook-inbound] Execution list upsert error:", upsertError);
            } else {
              console.log(`[webhook-inbound] Lead ${context.senderPhone} added to execution list ${execList.id}`);
            }
          }
        }
      } catch (execListError) {
        console.error("[webhook-inbound] Error processing execution list:", execListError);
      }
    }
      JSON.stringify({
        success: true,
        event_id: insertedEvent.id,
        event_type: classification.eventType,
        classification: classification.classification,
        direction: classification.direction,
        confidence: classification.confidence,
        matched_rule: classification.matchedRule,
        poll_processing: pollProcessingResult,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[webhook-inbound] Error:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
