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
    if (classification.eventType === "group_join" && context.chatJid && (context.senderPhone || context.senderLid)) {
      try {
        const phoneToSend = context.senderPhone || null;
        const lidToSend = context.senderLid || null;

        console.log(`[webhook-inbound] Detected group_join: group=${context.chatJid}, phone=${phoneToSend}, lid=${lidToSend}, connectedPhone=${connectedPhone || "none"}`);

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
              lid: lidToSend,
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
    // AUTO-SYNC GROUP MEMBERS on join/leave
    // ==========================================
    if (
      (classification.eventType === "group_join" || classification.eventType === "group_leave") &&
      context.chatJid &&
      (context.senderPhone || context.senderLid) &&
      instance?.user_id
    ) {
      try {
        // Find group_campaigns linked to this group_jid via campaign_groups junction table
        const { data: linkedCampaigns } = await supabase
          .from("campaign_groups")
          .select("campaign_id")
          .eq("group_jid", context.chatJid);

        const campaignIds = (linkedCampaigns || []).map((c: { campaign_id: string }) => c.campaign_id);
        console.log(`[webhook-inbound] Found ${campaignIds.length} linked campaigns for group ${context.chatJid}`);

        const { data: groupCampaigns } = campaignIds.length > 0
          ? await supabase
              .from("group_campaigns")
              .select("id, user_id, instance_id")
              .in("id", campaignIds)
              .eq("user_id", instance.user_id)
          : { data: [] as { id: string; user_id: string; instance_id: string | null }[] };

        // Use senderLid from context (already separated by event-classifier)
        const hasLid = !!context.senderLid;
        let resolvedPhone = context.senderPhone;

        // Try to resolve LID to real phone via Z-API
        if (hasLid && !resolvedPhone && instance?.id) {
          try {
            const { data: inst } = await supabase
              .from("instances")
              .select("external_instance_id, external_instance_token")
              .eq("id", instance.id)
              .single();

            if (inst?.external_instance_id && inst?.external_instance_token) {
              const zapiUrl = `https://api.z-api.io/instances/${inst.external_instance_id}/token/${inst.external_instance_token}/group-participants/${context.chatJid}`;
              const partResp = await fetch(zapiUrl);
              if (partResp.ok) {
                const participants = await partResp.json() as Array<{ phone?: string; name?: string; id?: string }>;
                const lidNumeric = context.senderLid!.split("@")[0];
                // Search by LID match in participant id
                const matched = participants.find(p =>
                  p.id?.includes(lidNumeric) || p.phone === lidNumeric
                );
                if (matched?.phone) {
                  resolvedPhone = matched.phone;
                  console.log(`[webhook-inbound] Resolved LID ${lidNumeric} -> phone ${resolvedPhone}`);
                }
              }
            }
          } catch (lidErr) {
            console.error("[webhook-inbound] LID resolution error:", lidErr);
          }
        }

        for (const gc of (groupCampaigns || [])) {
          if (classification.eventType === "group_join") {
            // Build upsert record — phone may be null when only LID is available
            const memberRecord: Record<string, unknown> = {
              group_campaign_id: gc.id,
              user_id: gc.user_id,
              name: context.senderName || null,
              status: "active",
              joined_at: new Date().toISOString(),
              left_at: null,
            };

            if (resolvedPhone) {
              memberRecord.phone = resolvedPhone;
              memberRecord.lid = context.senderLid || null;
            } else {
              // Only LID available, no phone
              memberRecord.phone = null;
              memberRecord.lid = context.senderLid;
            }

            // Use appropriate conflict key
            const onConflict = resolvedPhone ? "group_campaign_id,phone" : "group_campaign_id,lid";
            await supabase
              .from("group_members")
              .upsert(memberRecord, { onConflict });

            // Record history
            await supabase.from("group_member_history").insert({
              group_campaign_id: gc.id,
              user_id: gc.user_id,
              member_phone: resolvedPhone || context.senderLid || "unknown",
              action: "join",
            });

            console.log(`[webhook-inbound] Member ${resolvedPhone || context.senderLid} joined group campaign ${gc.id}`);
          } else {
            // group_leave: update status — match by phone or lid
            if (resolvedPhone) {
              await supabase
                .from("group_members")
                .update({ status: "left", left_at: new Date().toISOString() })
                .eq("group_campaign_id", gc.id)
                .eq("phone", resolvedPhone);
            } else if (context.senderLid) {
              await supabase
                .from("group_members")
                .update({ status: "left", left_at: new Date().toISOString() })
                .eq("group_campaign_id", gc.id)
                .eq("lid", context.senderLid);
            }

            await supabase.from("group_member_history").insert({
              group_campaign_id: gc.id,
              user_id: gc.user_id,
              member_phone: resolvedPhone || context.senderLid || "unknown",
              action: "leave",
            });

            console.log(`[webhook-inbound] Member ${resolvedPhone || context.senderLid} left group campaign ${gc.id}`);
          }
        }

        // Update context.senderPhone with resolved phone for execution lists below
        if (resolvedPhone && resolvedPhone !== context.senderPhone) {
          context.senderPhone = resolvedPhone;
        }
      } catch (memberSyncError) {
        console.error("[webhook-inbound] Error syncing group members:", memberSyncError);
      }
    }

    // ==========================================
    // AUTO-ACCUMULATE LEADS for Group Execution Lists
    // ==========================================
    if (context.chatJid && (context.senderPhone || context.senderLid)) {
      try {
        // Find group campaign by group_jid via campaign_groups
        const { data: campaignGroup } = await supabase
          .from("campaign_groups")
          .select("campaign_id")
          .eq("group_jid", context.chatJid)
          .maybeSingle();

        const campaignId = campaignGroup?.campaign_id || null;

        if (campaignId) {
          // Fetch ALL active execution lists for this campaign that monitor this event
          const { data: execLists } = await supabase
            .from("group_execution_lists")
            .select("id, current_cycle_id, monitored_events, user_id, execution_schedule_type, current_window_end, window_type, window_start_time, window_end_time")
            .eq("campaign_id", campaignId)
            .eq("is_active", true);

          for (const execList of (execLists || [])) {
            // Check if event is monitored
            if (!(execList.monitored_events as string[]).includes(classification.eventType)) continue;

            // Detect fulltime (24h) lists — always open, skip window check
            const isFulltime = execList.window_type === "fixed" &&
              String(execList.window_start_time || "").startsWith("00:00") &&
              String(execList.window_end_time || "").startsWith("23:59");

            // For non-immediate, non-fulltime lists, check window
            if (execList.execution_schedule_type !== "immediate" && !isFulltime) {
              if (!execList.current_window_end || new Date(execList.current_window_end) <= new Date()) continue;
            }

            // Use phone if available, otherwise use LID numeric as fallback identifier
            const execPhone = context.senderPhone || (context.senderLid ? context.senderLid.split("@")[0] : null);
            if (!execPhone) continue;

            const { error: upsertError } = await supabase
              .from("group_execution_leads")
              .upsert(
                {
                  list_id: execList.id,
                  user_id: execList.user_id,
                  cycle_id: execList.current_cycle_id,
                  phone: execPhone,
                  name: context.senderName || null,
                  origin_event: classification.eventType,
                  origin_detail: context.chatName || null,
                  status: "pending",
                },
                { onConflict: "list_id,phone,cycle_id", ignoreDuplicates: true }
              );

            if (upsertError) {
              console.error("[webhook-inbound] Execution list upsert error:", upsertError);
              continue;
            }

            console.log(`[webhook-inbound] Lead ${context.senderPhone} added to execution list ${execList.id}`);

            // For immediate lists, trigger processor right away
            if (execList.execution_schedule_type === "immediate") {
              try {
                const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
                const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
                const procResp = await fetch(
                  `${supabaseUrl}/functions/v1/group-execution-processor`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${supabaseServiceKey}`,
                    },
                    body: JSON.stringify({ list_id: execList.id }),
                  }
                );
                const procResult = await procResp.json();
                console.log(`[webhook-inbound] Immediate execution result for list ${execList.id}:`, JSON.stringify(procResult));
              } catch (procErr) {
                console.error(`[webhook-inbound] Immediate execution error for list ${execList.id}:`, procErr);
              }
            }
          }
        }
      } catch (execListError) {
        console.error("[webhook-inbound] Error processing execution list:", execListError);
      }
    }

    return new Response(
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
