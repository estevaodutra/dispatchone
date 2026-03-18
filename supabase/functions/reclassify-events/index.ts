import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================
// CLASSIFICATION LOGIC (duplicated from webhook-inbound)
// ============================================

interface ClassificationResult {
  eventType: string;
  eventSubtype: string | null;
  classification: "identified" | "pending";
}

interface EventContext {
  chatJid: string | null;
  chatType: string | null;
  chatName: string | null;
  senderPhone: string | null;
  senderName: string | null;
  messageId: string | null;
  eventTimestamp: string | null;
}

const ZAPI_EVENT_MAP: Record<string, string> = {
  "on-message-send": "message_sent",
  "message-status-callback": "message_status",
  "on-message-received": "text_message",
  "on-message-ack": "message_status",
  "connected": "connection_status",
  "disconnected": "connection_status",
  "qrcode": "qrcode_update",
  "on-chat-presence": "chat_presence",
  "on-participant-changed": "group_update",
  "ReceivedCallback": "text_message",
};

const MESSAGE_TYPE_MAP: Record<string, string> = {
  "text": "text_message",
  "chat": "text_message",
  "image": "image_message",
  "video": "video_message",
  "audio": "audio_message",
  "ptt": "audio_message",
  "document": "document_message",
  "sticker": "sticker_message",
  "location": "location_message",
  "vcard": "contact_message",
  "poll_creation": "poll_message",
  "poll_response": "poll_response",
};

function classifyZApiEvent(rawEvent: Record<string, unknown>): ClassificationResult {
  const event = rawEvent.event as string | undefined;
  const eventType = rawEvent.eventType as string | undefined;
  const rawType = rawEvent.type as string | undefined;
  const eventName = event || eventType || rawType;
  
  // Extract body for n8n/Z-API format detection
  const body = rawEvent.body as Record<string, unknown> | undefined;
  
  // ==========================================
  // POLL VOTE DETECTION - HIGHEST PRIORITY
  // body.pollVote indicates a poll response - must check FIRST
  // ==========================================
  const pollVote = body?.pollVote as Record<string, unknown> | undefined;
  if (pollVote) {
    return {
      eventType: "poll_response",
      eventSubtype: "pollVote",
      classification: "identified",
    };
  }
  
  // ==========================================
  // MEDIA DETECTION (n8n/Z-API format)
  // Must check BEFORE direct mapping to avoid text_message override
  // ==========================================
  
  const mimeType = (body?.mimeType || rawEvent.mimeType || body?.mimetype || rawEvent.mimetype) as string | undefined;
  
  // Image detection (body.photo is sender's profile pic, NOT an image message)
  if (
    body?.image !== undefined ||
    body?.imageUrl !== undefined ||
    rawEvent.imageUrl !== undefined ||
    mimeType?.startsWith("image/")
  ) {
    return {
      eventType: "image_message",
      eventSubtype: mimeType || (body?.image ? "body.image" : "imageUrl"),
      classification: "identified",
    };
  }
  
  // Video detection
  if (
    body?.video !== undefined ||
    body?.videoUrl !== undefined ||
    rawEvent.videoUrl !== undefined ||
    mimeType?.startsWith("video/")
  ) {
    return {
      eventType: "video_message",
      eventSubtype: mimeType || (body?.video ? "body.video" : "videoUrl"),
      classification: "identified",
    };
  }
  
  // Audio detection
  if (
    body?.audio !== undefined ||
    body?.audioUrl !== undefined ||
    rawEvent.audioUrl !== undefined ||
    body?.ptt !== undefined ||
    mimeType?.startsWith("audio/")
  ) {
    return {
      eventType: "audio_message",
      eventSubtype: mimeType || (body?.audio ? "body.audio" : (body?.ptt ? "ptt" : "audioUrl")),
      classification: "identified",
    };
  }
  
  // Document detection
  if (
    body?.document !== undefined ||
    body?.documentUrl !== undefined ||
    rawEvent.documentUrl !== undefined ||
    mimeType?.startsWith("application/")
  ) {
    return {
      eventType: "document_message",
      eventSubtype: mimeType || (body?.document ? "body.document" : "documentUrl"),
      classification: "identified",
    };
  }
  
  // Sticker detection
  if (body?.sticker !== undefined || rawEvent.sticker !== undefined) {
    return {
      eventType: "sticker_message",
      eventSubtype: "sticker",
      classification: "identified",
    };
  }
  
  // (pollVote detection moved to top of function)
  
  // ==========================================
  // GROUP NOTIFICATION DETECTION (n8n/Z-API format)
  // body.notification contains group events like GROUP_PARTICIPANT_ADD
  // ==========================================
  const notification = body?.notification as string | undefined;

  if (notification) {
    const notificationMap: Record<string, string> = {
      "GROUP_PARTICIPANT_ADD": "group_join",
      "GROUP_PARTICIPANT_REMOVE": "group_leave",
      "GROUP_PARTICIPANT_PROMOTE": "group_promote",
      "GROUP_PARTICIPANT_DEMOTE": "group_demote",
      "GROUP_PARTICIPANT_LEAVE": "group_leave",
      "GROUP_CREATE": "group_update",
      "GROUP_SUBJECT": "group_update",
      "GROUP_DESCRIPTION": "group_update",
      "GROUP_ICON": "group_update",
    };

    if (notificationMap[notification]) {
      return {
        eventType: notificationMap[notification],
        eventSubtype: notification,
        classification: "identified",
      };
    }
  }
  
  // ==========================================
  // Direct event mapping (after media check)
  // ==========================================
  if (eventName && ZAPI_EVENT_MAP[eventName]) {
    return {
      eventType: ZAPI_EVENT_MAP[eventName],
      eventSubtype: eventName,
      classification: "identified",
    };
  }
  
  // Check for reaction events (n8n wraps in body)
  const reaction = (body?.reaction || rawEvent.reaction) as Record<string, unknown> | undefined;
  
  if (reaction?.value !== undefined) {
    return {
      eventType: "reaction",
      eventSubtype: String(reaction.value),
      classification: "identified",
    };
  }
  
  // Check for message status callbacks (PLAYED, RECEIVED, etc.)
  // Z-API sends status directly in body.status when body.type === "MessageStatusCallback"
  const bodyStatus = body?.status as string | undefined;

  if (bodyStatus === "PLAYED") {
    return {
      eventType: "played",
      eventSubtype: "PLAYED",
      classification: "identified",
    };
  }

  if (bodyStatus === "RECEIVED") {
    return {
      eventType: "message_received",
      eventSubtype: "RECEIVED",
      classification: "identified",
    };
  }

  if (bodyStatus === "READ") {
    return {
      eventType: "message_read",
      eventSubtype: "READ",
      classification: "identified",
    };
  }

  if (bodyStatus === "READ_BY_ME") {
    return {
      eventType: "read_by_me",
      eventSubtype: "READ_BY_ME",
      classification: "identified",
    };
  }
  
  // Check for text message in body.text (n8n Z-API format)
  const bodyText = body?.text as Record<string, unknown> | undefined;
  if (bodyText?.message !== undefined) {
    return {
      eventType: "text_message",
      eventSubtype: "text",
      classification: "identified",
    };
  }
  
  // Check message type in various locations
  const messageType = (
    rawEvent.type || 
    rawEvent.messageType || 
    (rawEvent.message as Record<string, unknown>)?.type ||
    body?.type ||
    (body?.message as Record<string, unknown>)?.type
  ) as string | undefined;
  
  if (messageType) {
    const normalizedType = messageType.toLowerCase();
    if (MESSAGE_TYPE_MAP[normalizedType]) {
      return {
        eventType: MESSAGE_TYPE_MAP[normalizedType],
        eventSubtype: messageType,
        classification: "identified",
      };
    }
  }
  
  // Check for group events
  const participantAction = rawEvent.action as string | undefined;
  if (participantAction) {
    const actionMap: Record<string, string> = {
      "add": "group_join",
      "remove": "group_leave",
      "promote": "group_promote",
      "demote": "group_demote",
    };
    if (actionMap[participantAction]) {
      return {
        eventType: actionMap[participantAction],
        eventSubtype: participantAction,
        classification: "identified",
      };
    }
  }
  
  // Check for button/list responses
  const selectedButtonId = rawEvent.selectedButtonId as string | undefined;
  if (selectedButtonId) {
    return {
      eventType: "button_response",
      eventSubtype: selectedButtonId,
      classification: "identified",
    };
  }
  
  const listResponseTitle = (rawEvent.listResponse as Record<string, unknown>)?.title as string | undefined;
  if (listResponseTitle) {
    return {
      eventType: "list_response",
      eventSubtype: listResponseTitle,
      classification: "identified",
    };
  }
  
  return {
    eventType: "unknown",
    eventSubtype: null,
    classification: "pending",
  };
}

function classifyEvolutionEvent(rawEvent: Record<string, unknown>): ClassificationResult {
  const event = rawEvent.event as string | undefined;
  
  const eventMap: Record<string, string> = {
    "messages.upsert": "text_message",
    "messages.update": "message_status",
    "connection.update": "connection_status",
    "qrcode.updated": "qrcode_update",
    "groups.upsert": "group_update",
    "groups.update": "group_update",
    "presence.update": "chat_presence",
  };
  
  if (event && eventMap[event]) {
    return {
      eventType: eventMap[event],
      eventSubtype: event,
      classification: "identified",
    };
  }
  
  return {
    eventType: "unknown",
    eventSubtype: null,
    classification: "pending",
  };
}

function classifyMetaEvent(rawEvent: Record<string, unknown>): ClassificationResult {
  const entry = (rawEvent.entry as Array<Record<string, unknown>>)?.[0];
  const changes = (entry?.changes as Array<Record<string, unknown>>)?.[0];
  const field = changes?.field as string;
  
  if (field === "messages") {
    const value = changes?.value as Record<string, unknown>;
    const messages = value?.messages as Array<Record<string, unknown>>;
    if (messages?.[0]) {
      const msgType = messages[0].type as string;
      return {
        eventType: MESSAGE_TYPE_MAP[msgType] || "text_message",
        eventSubtype: msgType,
        classification: "identified",
      };
    }
    
    const statuses = value?.statuses as Array<Record<string, unknown>>;
    if (statuses?.[0]) {
      return {
        eventType: "message_status",
        eventSubtype: statuses[0].status as string,
        classification: "identified",
      };
    }
  }
  
  return {
    eventType: "unknown",
    eventSubtype: null,
    classification: "pending",
  };
}

function classifyEvent(source: string, rawEvent: Record<string, unknown>): ClassificationResult {
  switch (source) {
    case "z-api":
      return classifyZApiEvent(rawEvent);
    case "evolution":
      return classifyEvolutionEvent(rawEvent);
    case "meta":
      return classifyMetaEvent(rawEvent);
    default:
      return classifyZApiEvent(rawEvent);
  }
}

function extractZApiContext(rawEvent: Record<string, unknown>): EventContext {
  const body = rawEvent.body as Record<string, unknown> | undefined;
  const message = (rawEvent.message || body?.message) as Record<string, unknown> | undefined;
  const chat = (rawEvent.chat || body?.chat || message?.chat) as Record<string, unknown> | undefined;
  const sender = (rawEvent.sender || body?.sender || message?.sender) as Record<string, unknown> | undefined;
  
  // Try multiple sources for chatJid, including n8n format (phone/from)
  let chatJid = (
    rawEvent.chatId || 
    rawEvent.from || 
    body?.chatId || 
    body?.from ||
    chat?.id ||
    message?.from
  ) as string | null;
  
  // Fallback for n8n/Z-API format
  if (!chatJid) {
    chatJid = (rawEvent.phone || body?.phone) as string | null;
  }
  
  const isGroup = chatJid?.includes("@g.us") || false;
  
  // Extract phone from JID or use sender field
  let senderPhone = (
    sender?.phone ||
    rawEvent.senderPhone ||
    body?.senderPhone ||
    (rawEvent.participant as string)
  ) as string | null;
  
  if (!senderPhone && chatJid) {
    senderPhone = chatJid.split("@")[0];
  }
  
  const senderName = (
    sender?.name ||
    rawEvent.senderName ||
    body?.senderName ||
    rawEvent.pushName ||
    body?.pushName
  ) as string | null;
  
  const messageId = (
    rawEvent.messageId ||
    rawEvent.id ||
    body?.messageId ||
    body?.id ||
    message?.id ||
    (message?.key as Record<string, unknown>)?.id ||
    rawEvent.zapiMessageId
  ) as string | null;
  
  const timestamp = (
    rawEvent.momment ||
    rawEvent.timestamp ||
    body?.momment ||
    body?.timestamp ||
    message?.messageTimestamp
  ) as number | string | null;
  
  let eventTimestamp: string | null = null;
  if (timestamp) {
    const ts = typeof timestamp === "number" 
      ? (timestamp > 9999999999 ? timestamp : timestamp * 1000)
      : parseInt(String(timestamp), 10);
    eventTimestamp = new Date(ts).toISOString();
  }
  
  return {
    chatJid,
    chatType: isGroup ? "group" : "private",
    chatName: (chat?.name || rawEvent.chatName || body?.chatName) as string | null,
    senderPhone,
    senderName,
    messageId,
    eventTimestamp,
  };
}

function extractContext(source: string, rawEvent: Record<string, unknown>): EventContext {
  switch (source) {
    case "z-api":
      return extractZApiContext(rawEvent);
    case "evolution":
    case "meta":
    default:
      return extractZApiContext(rawEvent);
  }
}

// ============================================
// MAIN HANDLER
// ============================================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse options
    const body = await req.json().catch(() => ({}));
    const onlyPending = body.only_pending === true;
    const onlyUnknown = body.only_unknown === true;
    const eventId = body.event_id as string | undefined;
    const force = body.force === true;

    console.log(`[reclassify-events] User: ${user.id}, onlyPending: ${onlyPending}, onlyUnknown: ${onlyUnknown}, eventId: ${eventId || 'none'}, force: ${force}`);

    // Single event reprocessing
    if (eventId) {
      // Fetch the single event
      const { data: event, error: fetchError } = await supabase
        .from("webhook_events")
        .select("id, source, raw_event, event_type, classification, processing_status")
        .eq("id", eventId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (fetchError) {
        console.error("[reclassify-events] Fetch error:", fetchError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch event" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!event) {
        return new Response(
          JSON.stringify({ error: "Event not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const rawEvent = event.raw_event as Record<string, unknown>;
      const classification = classifyEvent(event.source, rawEvent);
      const context = extractContext(event.source, rawEvent);
      const expectedStatus = classification.classification === "identified" ? "processed" : "pending";
      
      const hasChanged = 
        force ||
        event.event_type !== classification.eventType ||
        event.classification !== classification.classification ||
        event.processing_status !== expectedStatus;

      if (hasChanged) {
        const { error: updateError } = await supabase
          .from("webhook_events")
          .update({
            event_type: classification.eventType,
            event_subtype: classification.eventSubtype,
            classification: classification.classification,
            processing_status: expectedStatus,
            processed_at: expectedStatus === "processed" ? new Date().toISOString() : null,
            chat_jid: context.chatJid,
            chat_type: context.chatType,
            chat_name: context.chatName,
            sender_phone: context.senderPhone,
            sender_name: context.senderName,
            message_id: context.messageId,
            event_timestamp: context.eventTimestamp,
            processing_error: null,
          })
          .eq("id", event.id);

        if (updateError) {
          console.error(`[reclassify-events] Update error for ${event.id}:`, updateError);
          return new Response(
            JSON.stringify({ error: "Failed to update event" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`[reclassify-events] Reprocessed ${event.id}: ${event.event_type} -> ${classification.eventType}, status: ${expectedStatus}`);
      } else {
        console.log(`[reclassify-events] Event ${event.id} unchanged`);
      }

      const result = {
        success: true,
        event_id: event.id,
        event_type: classification.eventType,
        classification: classification.classification,
        processing_status: expectedStatus,
        changed: hasChanged,
      };

      console.log("[reclassify-events] Single event result:", result);

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Batch reclassification - process in smaller pages to avoid statement timeout
    const BATCH_SIZE = 50;
    let reclassified = 0;
    let unchanged = 0;
    let errors = 0;
    let totalProcessed = 0;
    let lastId: string | null = null;
    let hasMore = true;

    while (hasMore) {
      let query = supabase
        .from("webhook_events")
        .select("id, source, raw_event, event_type, classification, processing_status")
        .eq("user_id", user.id);

      if (onlyPending) {
        query = query.eq("classification", "pending");
      } else if (onlyUnknown) {
        query = query.eq("event_type", "unknown");
      } else {
        // Focus on event types historically prone to misclassification
        query = query.in("event_type", ["image_message", "unknown", "text_message"]);
      }

      // Use cursor-based pagination (keyset) to avoid slow OFFSET on large tables
      if (lastId) {
        query = query.gt("id", lastId);
      }

      query = query
        .order("id", { ascending: true })
        .limit(BATCH_SIZE);

      const { data: events, error: fetchError } = await query;

      if (fetchError) {
        console.error("[reclassify-events] Fetch error:", fetchError);
        // If we already processed some, return partial results instead of failing
        if (totalProcessed > 0) {
          console.log(`[reclassify-events] Returning partial results after error, processed ${totalProcessed}`);
          hasMore = false;
          break;
        }
        return new Response(
          JSON.stringify({ error: "Failed to fetch events" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const batch = events || [];
      console.log(`[reclassify-events] Batch: ${batch.length} events (processed so far: ${totalProcessed})`);

      if (batch.length === 0) {
        hasMore = false;
        break;
      }

      for (const event of batch) {
        try {
          const rawEvent = event.raw_event as Record<string, unknown>;
          const classification = classifyEvent(event.source, rawEvent);
          const context = extractContext(event.source, rawEvent);

          const expectedStatus = classification.classification === "identified" ? "processed" : "pending";
          const hasChanged = 
            event.event_type !== classification.eventType ||
            event.classification !== classification.classification ||
            event.processing_status !== expectedStatus;

          if (reclassified + unchanged + errors < 10) {
            console.log(`[reclassify-events] Event ${event.id}: current=${event.event_type}/${event.classification}/${event.processing_status} -> new=${classification.eventType}/${classification.classification}/${expectedStatus} hasChanged=${hasChanged}`);
          }

          if (hasChanged) {
            const { error: updateError } = await supabase
              .from("webhook_events")
              .update({
                event_type: classification.eventType,
                event_subtype: classification.eventSubtype,
                classification: classification.classification,
                processing_status: expectedStatus,
                processed_at: expectedStatus === "processed" ? new Date().toISOString() : null,
                chat_jid: context.chatJid,
                chat_type: context.chatType,
                chat_name: context.chatName,
                sender_phone: context.senderPhone,
                sender_name: context.senderName,
                message_id: context.messageId,
                event_timestamp: context.eventTimestamp,
              })
              .eq("id", event.id);

            if (updateError) {
              console.error(`[reclassify-events] Update error for ${event.id}:`, updateError);
              errors++;
            } else {
              reclassified++;
            }
          } else {
            unchanged++;
          }
        } catch (err) {
          console.error(`[reclassify-events] Error processing event ${(event as any).id}:`, err);
          errors++;
        }
      }

      totalProcessed += batch.length;
      lastId = batch[batch.length - 1].id as string;

      // Stop after 1000 events max to avoid edge function timeout
      if (batch.length < BATCH_SIZE || totalProcessed >= 1000) {
        hasMore = false;
      }
    }

    const result = {
      success: true,
      total_processed: totalProcessed,
      reclassified,
      unchanged,
      errors,
    };

    console.log("[reclassify-events] Result:", result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[reclassify-events] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
