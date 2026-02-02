import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MessageContent {
  text?: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  documentUrl?: string;
  caption?: string;
  mimeType?: string;
  fileName?: string;
  pollMessageId?: string;
  options?: Array<{ name: string }>;
  latitude?: number;
  longitude?: number;
  contactName?: string;
  contactPhone?: string;
  stickerUrl?: string;
}

function extractContent(eventType: string, rawEvent: Record<string, unknown>): MessageContent {
  const body = rawEvent.body as Record<string, unknown> | undefined;
  if (!body) return {};

  switch (eventType) {
    case 'text_message': {
      const textObj = body.text as Record<string, unknown> | undefined;
      return {
        text: textObj?.message as string || body.message as string || body.text as string || ''
      };
    }
    
    case 'image_message': {
      const imageObj = body.image as Record<string, unknown> | undefined;
      return {
        imageUrl: imageObj?.imageUrl as string || body.photo as string || body.imageUrl as string,
        caption: imageObj?.caption as string || body.caption as string,
        mimeType: imageObj?.mimeType as string || body.mimeType as string
      };
    }
    
    case 'video_message': {
      const videoObj = body.video as Record<string, unknown> | undefined;
      return {
        videoUrl: videoObj?.videoUrl as string || body.videoUrl as string,
        caption: videoObj?.caption as string || body.caption as string,
        mimeType: videoObj?.mimeType as string || body.mimeType as string
      };
    }
    
    case 'audio_message':
    case 'ptt_message': {
      const audioObj = body.audio as Record<string, unknown> | undefined;
      return {
        audioUrl: audioObj?.audioUrl as string || body.audioUrl as string,
        mimeType: audioObj?.mimeType as string || body.mimeType as string
      };
    }
    
    case 'document_message': {
      const docObj = body.document as Record<string, unknown> | undefined;
      return {
        documentUrl: docObj?.documentUrl as string || body.documentUrl as string,
        fileName: docObj?.fileName as string || body.fileName as string,
        caption: docObj?.caption as string || body.caption as string,
        mimeType: docObj?.mimeType as string || body.mimeType as string
      };
    }
    
    case 'poll_response': {
      const pollVote = body.pollVote as Record<string, unknown> | undefined;
      return {
        pollMessageId: pollVote?.pollMessageId as string,
        options: pollVote?.options as Array<{ name: string }>
      };
    }
    
    case 'location_message': {
      const locationObj = body.location as Record<string, unknown> | undefined;
      return {
        latitude: (locationObj?.latitude || body.latitude) as number,
        longitude: (locationObj?.longitude || body.longitude) as number
      };
    }
    
    case 'contact_message': {
      const contactObj = body.contact as Record<string, unknown> | undefined;
      return {
        contactName: contactObj?.name as string || body.contactName as string,
        contactPhone: contactObj?.phone as string || body.contactPhone as string
      };
    }
    
    case 'sticker_message': {
      const stickerObj = body.sticker as Record<string, unknown> | undefined;
      return {
        stickerUrl: stickerObj?.stickerUrl as string || body.stickerUrl as string,
        mimeType: stickerObj?.mimeType as string || body.mimeType as string
      };
    }
    
    default:
      // For unknown types, try to extract common fields
      return {
        text: body.message as string || body.text as string
      };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'METHOD_NOT_ALLOWED',
          message: 'Apenas requisições GET são permitidas.'
        }
      }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate API key via validate-api-key function
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Token de autenticação ausente ou inválido.'
          }
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call validate-api-key to verify the token
    const validateResponse = await fetch(`${supabaseUrl}/functions/v1/validate-api-key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      }
    });

    const validateResult = await validateResponse.json();
    if (!validateResult.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: validateResult.error || {
            code: 'INVALID_API_KEY',
            message: 'API key inválida.'
          }
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract messageId from query params
    const url = new URL(req.url);
    const messageId = url.searchParams.get('messageId');
    const includeRaw = url.searchParams.get('include_raw') === 'true';

    if (!messageId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'MISSING_MESSAGE_ID',
            message: 'O parâmetro messageId é obrigatório.'
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[message-content] Looking up messageId: ${messageId}`);

    // Query webhook_events by message_id
    const { data: event, error: queryError } = await supabase
      .from('webhook_events')
      .select('id, message_id, event_type, event_subtype, chat_jid, chat_name, chat_type, sender_phone, sender_name, event_timestamp, raw_event')
      .eq('message_id', messageId)
      .maybeSingle();

    if (queryError) {
      console.error('[message-content] Query error:', queryError);
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Erro ao consultar o banco de dados.'
          }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!event) {
      console.log(`[message-content] Message not found: ${messageId}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'MESSAGE_NOT_FOUND',
            message: 'Nenhuma mensagem encontrada com o messageId informado.'
          }
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract structured content based on event type
    const content = extractContent(event.event_type, event.raw_event as Record<string, unknown>);

    // Build response
    const responseData: Record<string, unknown> = {
      event_id: event.id,
      message_id: event.message_id,
      event_type: event.event_type,
      event_subtype: event.event_subtype,
      chat_jid: event.chat_jid,
      chat_name: event.chat_name,
      chat_type: event.chat_type,
      sender_phone: event.sender_phone,
      sender_name: event.sender_name,
      content,
      timestamp: event.event_timestamp
    };

    // Include raw_event if requested
    if (includeRaw) {
      responseData.raw_event = event.raw_event;
    }

    console.log(`[message-content] Found event: ${event.id} (type: ${event.event_type})`);

    return new Response(
      JSON.stringify({
        success: true,
        data: responseData
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[message-content] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erro interno do servidor.'
        }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
