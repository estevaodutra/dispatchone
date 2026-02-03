import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Hash token using SHA-256
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Validate API key
async function validateApiKey(supabase: any, authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Token de autenticação ausente ou inválido.' };
  }

  const token = authHeader.replace('Bearer ', '');
  
  if (!token.startsWith('pk_live_') && !token.startsWith('pk_test_')) {
    return { valid: false, error: 'Formato do token inválido.' };
  }

  const tokenHash = await hashToken(token);

  const { data: apiKey, error } = await supabase
    .from('api_keys')
    .select('id, name, environment, revoked_at, user_id')
    .eq('key_hash', tokenHash)
    .maybeSingle();

  if (error || !apiKey) {
    return { valid: false, error: 'API key inválida ou não encontrada.' };
  }

  if (apiKey.revoked_at) {
    return { valid: false, error: 'Esta API key foi revogada.' };
  }

  // Update last_used_at
  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', apiKey.id);

  return { valid: true, apiKey };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'METHOD_NOT_ALLOWED', message: 'Apenas POST é permitido.' }
      }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate API key
    const authHeader = req.headers.get('Authorization');
    const authResult = await validateApiKey(supabase, authHeader);

    if (!authResult.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'UNAUTHORIZED', message: authResult.error }
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await req.json();
    const { phone } = body;

    if (!phone) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'INVALID_PAYLOAD', message: 'O campo "phone" é obrigatório.' }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate phone format (only numbers, min 10 digits)
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'INVALID_PHONE', message: 'Número de telefone inválido. Use formato DDI+DDD+Número.' }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find ANY connected instance available in the system
    console.log('[phone-validation] Looking for any connected instance...');

    const { data: instance, error: instanceError } = await supabase
      .from('instances')
      .select('id, name, provider, external_instance_id, external_instance_token')
      .eq('status', 'connected')
      .not('external_instance_id', 'is', null)
      .not('external_instance_token', 'is', null)
      .limit(1)
      .maybeSingle();

    if (instanceError) {
      console.error('[phone-validation] Error fetching instance:', instanceError);
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'DB_ERROR', message: 'Erro ao buscar instância conectada.' }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!instance) {
      console.log('[phone-validation] No connected instance available in the system');
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'NO_CONNECTED_INSTANCE',
            message: 'Nenhuma instância WhatsApp está conectada para fazer a validação.'
          }
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!instance.external_instance_id || !instance.external_instance_token) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'INSTANCE_NOT_CONFIGURED',
            message: 'A instância conectada não possui credenciais do provedor configuradas.'
          }
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send to n8n webhook for phone validation
    const webhookUrl = 'https://n8n-n8n.nuwfic.easypanel.host/webhook/events_sent';

    console.log(`Sending phone validation to webhook: ${cleanPhone}`);

    const webhookPayload = {
      action: 'validation.phone_exists',
      instance: {
        id: instance.id,
        name: instance.name,
        provider: instance.provider,
        external_instance_id: instance.external_instance_id,
        external_instance_token: instance.external_instance_token
      },
      phone: cleanPhone
    };

    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookPayload)
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error('Webhook error:', webhookResponse.status, errorText);
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'WEBHOOK_ERROR',
            message: 'Erro ao consultar o webhook de validação.'
          }
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await webhookResponse.json();

    console.log('Webhook response:', result);

    // Se o resultado for um array, pegar o primeiro elemento
    const data = Array.isArray(result) ? result[0] : result;

    return new Response(
      JSON.stringify({
        success: true,
        exists: data?.exists === true || data?.exists === 'true',
        phone: data?.phone || cleanPhone,
        lid: data?.lid || null,
        instance_used: instance.name
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error validating phone:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Erro interno ao validar número.' }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
