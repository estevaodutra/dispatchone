import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

interface ClassificationResult {
  eventType: string;
  eventSubtype: string | null;
  classification: "identified" | "pending";
}

interface ContextResult {
  chatJid: string | null;
  chatType: string | null;
  chatName: string | null;
  senderPhone: string | null;
  senderName: string | null;
  messageId: string | null;
  eventTimestamp: string | null;
}

// Direct event mapping for Z-API
const ZAPI_EVENT_MAP: Record<string, string> = {
  "poll.vote": "poll_response",
  "message.ack": "message_status",
  "group.participant.add": "group_join",
  "group.participant.remove": "group_leave",
  "group.participant.promote": "group_promote",
  "group.participant.demote": "group_demote",
  "group.update": "group_update",
  "connection.update": "connection_status",
  "qrcode.updated": "qrcode_update",
  "call.received": "call_received",
  "message.revoked": "message_revoked",
  "ReceivedCallback": "text_message",
};

// Message type mapping for Z-API message.received events
const MESSAGE_TYPE_MAP: Record<string, string> = {
  conversation: "text_message",
  extendedTextMessage: "text_message",
  imageMessage: "image_message",
  videoMessage: "video_message",
  audioMessage: "audio_message",
  documentMessage: "document_message",
  stickerMessage: "sticker_message",
  locationMessage: "location_message",
  contactMessage: "contact_message",
  buttonsResponseMessage: "button_response",
  listResponseMessage: "list_response",
  reactionMessage: "message_reaction",
};

function classifyZApiEvent(rawEvent: Record<string, unknown>): ClassificationResult {
  const event = rawEvent.event as string | undefined;
  const eventType = rawEvent.eventType as string | undefined;
  const rawType = rawEvent.type as string | undefined;
  const eventName = event || eventType || rawType;
  
  // Extract body for n8n/Z-API format detection
  const body = rawEvent.body as Record<string, unknown> | undefined;
  
  // ==========================================
  // MEDIA DETECTION (n8n/Z-API format) - PRIORITY
  // Must check BEFORE direct mapping to avoid text_message override
  // ==========================================
  
  const mimeType = (body?.mimeType || rawEvent.mimeType || body?.mimetype || rawEvent.mimetype) as string | undefined;
  
  // Image detection
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
  
  // Check for played events (audio/video played by recipient)
  const bodyType = body?.type as Record<string, unknown> | undefined;
  const typeStatus = bodyType?.status as string | undefined;

  if (typeStatus === "PLAYED") {
    return {
      eventType: "played",
      eventSubtype: "PLAYED",
      classification: "identified",
    };
  }
  
  // Check for text message in body.text (n8n Z-API format)
  const bodyText = body?.text as Record<string, unknown> | undefined;
  if (bodyText?.message !== undefined) {
    return {
      eventType: "text_message",
      eventSubtype: "ReceivedCallback",
      classification: "identified",
    };
  }
  
  // Check if it's a message.received event
  if (eventName === "message.received" || eventName === "ReceivedCallback") {
    const data = rawEvent.data as Record<string, unknown> | undefined;
    const message = (data?.message || rawEvent.message) as Record<string, unknown> | undefined;
    
    if (message) {
      for (const [key, messageType] of Object.entries(MESSAGE_TYPE_MAP)) {
        if (message[key] !== undefined) {
          return {
            eventType: messageType,
            eventSubtype: key,
            classification: "identified",
          };
        }
      }
    }
  }
  
  return {
    eventType: "unknown",
    eventSubtype: eventName || null,
    classification: "pending",
  };
}

function classifyEvolutionEvent(rawEvent: Record<string, unknown>): ClassificationResult {
  const event = rawEvent.event as string | undefined;
  
  // Evolution API uses similar event structure
  if (event) {
    // Map Evolution events to our standard types
    const evolutionMap: Record<string, string> = {
      "messages.upsert": "text_message",
      "messages.update": "message_status",
      "groups.upsert": "group_update",
      "connection.update": "connection_status",
      "qrcode.updated": "qrcode_update",
    };
    
    if (evolutionMap[event]) {
      return {
        eventType: evolutionMap[event],
        eventSubtype: event,
        classification: "identified",
      };
    }
  }
  
  return {
    eventType: "unknown",
    eventSubtype: event || null,
    classification: "pending",
  };
}

function classifyMetaEvent(rawEvent: Record<string, unknown>): ClassificationResult {
  // Meta/Cloud API webhook structure
  const entry = (rawEvent.entry as Array<Record<string, unknown>>)?.[0];
  const changes = (entry?.changes as Array<Record<string, unknown>>)?.[0];
  const field = changes?.field as string | undefined;
  
  if (field === "messages") {
    const value = changes?.value as Record<string, unknown>;
    const messages = value?.messages as Array<Record<string, unknown>>;
    const statuses = value?.statuses as Array<Record<string, unknown>>;
    
    if (messages?.length) {
      const messageType = messages[0].type as string;
      const typeMap: Record<string, string> = {
        text: "text_message",
        image: "image_message",
        video: "video_message",
        audio: "audio_message",
        document: "document_message",
        sticker: "sticker_message",
        location: "location_message",
        contacts: "contact_message",
        button: "button_response",
        interactive: "list_response",
        reaction: "message_reaction",
      };
      
      return {
        eventType: typeMap[messageType] || "unknown",
        eventSubtype: messageType,
        classification: typeMap[messageType] ? "identified" : "pending",
      };
    }
    
    if (statuses?.length) {
      return {
        eventType: "message_status",
        eventSubtype: statuses[0].status as string,
        classification: "identified",
      };
    }
  }
  
  return {
    eventType: "unknown",
    eventSubtype: field || null,
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
      return {
        eventType: "unknown",
        eventSubtype: null,
        classification: "pending",
      };
  }
}

function extractZApiContext(rawEvent: Record<string, unknown>): ContextResult {
  const data = rawEvent.data as Record<string, unknown> | undefined;
  const key = (data?.key || rawEvent.key) as Record<string, unknown> | undefined;
  const body = rawEvent.body as Record<string, unknown> | undefined;
  
  // Try multiple sources for chatJid, including n8n format (phone/from)
  let chatJid = (key?.remoteJid || data?.chatId || rawEvent.chatId) as string | null;
  
  // Fallback for n8n/Z-API format
  if (!chatJid) {
    chatJid = (rawEvent.phone || rawEvent.from || body?.phone || body?.from || body?.chatId) as string | null;
  }
  
  const chatType = chatJid?.endsWith("@g.us") ? "group" : "private";
  
  // Extract phone from JID or use sender field
  let senderPhone = chatJid?.split("@")[0] || null;
  if (!senderPhone) {
    const sender = body?.sender as Record<string, unknown> | undefined;
    senderPhone = (body?.senderPhone || rawEvent.senderPhone || sender?.phone) as string | null;
  }
  
  // Get sender name from multiple sources
  const senderName = (data?.pushName || rawEvent.senderName || body?.senderName || body?.pushName || rawEvent.pushName) as string | null;
  
  // Get chat name (for groups)
  const chatName = (data?.groupName || data?.pushName || rawEvent.chatName || body?.chatName) as string | null;
  
  // Get message ID from multiple sources
  const messageId = (key?.id || data?.messageId || rawEvent.messageId || body?.messageId || rawEvent.zapiMessageId) as string | null;
  
  // Parse timestamp
  let eventTimestamp: string | null = null;
  const timestamp = data?.messageTimestamp || rawEvent.messageTimestamp || rawEvent.timestamp || body?.momment || body?.timestamp;
  if (timestamp) {
    try {
      // Could be seconds or milliseconds
      const ts = Number(timestamp);
      if (ts > 1000000000000) {
        eventTimestamp = new Date(ts).toISOString();
      } else {
        eventTimestamp = new Date(ts * 1000).toISOString();
      }
    } catch {
      // Ignore parsing errors
    }
  }
  
  return {
    chatJid,
    chatType,
    chatName,
    senderPhone,
    senderName,
    messageId,
    eventTimestamp,
  };
}

function extractContext(source: string, rawEvent: Record<string, unknown>): ContextResult {
  // For now, Z-API context extraction works for most providers
  // Can be extended for Evolution and Meta specifics
  return extractZApiContext(rawEvent);
}

Deno.serve(async (req) => {
  // Handle CORS preflight
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
      // Already in expected encapsulated format
      payload = body as InboundPayload;
    } else {
      // Direct payload from provider - auto-wrap it
      // n8n sends the payload nested in body.body when forwarding webhooks
      const nestedBody = body.body as Record<string, unknown> | undefined;
      
      // Try to extract instance_id from common Z-API/Evolution fields
      // Check both root level and nested body (for n8n forwarded webhooks)
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
        raw_event: body
      };
      
      console.log("[webhook-inbound] Auto-wrapped raw payload, detected instance_id:", instanceId);
    }
    
    // Validate required fields after normalization
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

    // Try to find the internal instance ID and user_id
    const { data: instance } = await supabase
      .from("instances")
      .select("id, user_id")
      .eq("external_instance_id", externalInstanceId)
      .maybeSingle();

    // Classify the event
    const classification = classifyEvent(source, rawEvent);
    console.log(`[webhook-inbound] Classified as: ${classification.eventType} (${classification.classification})`);

    // Extract context
    const context = extractContext(source, rawEvent);

    // Insert the event
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

    return new Response(
      JSON.stringify({
      success: true,
      event_id: insertedEvent.id,
      event_type: classification.eventType,
      classification: classification.classification,
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
