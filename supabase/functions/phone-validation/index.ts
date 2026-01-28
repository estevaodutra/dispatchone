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

    // Find a connected instance for this user
    const { data: instance, error: instanceError } = await supabase
      .from('instances')
      .select('id, name, external_instance_id, external_instance_token')
      .eq('status', 'connected')
      .eq('user_id', authResult.apiKey.user_id)
      .limit(1)
      .maybeSingle();

    if (instanceError || !instance) {
      console.log('No connected instance found for user:', authResult.apiKey.user_id);
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

    // Call Z-API phone-exists endpoint
    const zapiUrl = `https://api.z-api.io/instances/${instance.external_instance_id}/token/${instance.external_instance_token}/phone-exists/${cleanPhone}`;
    
    console.log(`Calling Z-API for phone validation: ${cleanPhone}`);

    const zapiResponse = await fetch(zapiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!zapiResponse.ok) {
      const errorText = await zapiResponse.text();
      console.error('Z-API error:', zapiResponse.status, errorText);
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'PROVIDER_ERROR',
            message: 'Erro ao consultar o provedor WhatsApp.'
          }
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const zapiData = await zapiResponse.json();
    
    // Z-API returns the result directly (not array for phone-exists)
    const result = Array.isArray(zapiData) ? zapiData[0] : zapiData;

    console.log('Z-API response:', result);

    return new Response(
      JSON.stringify({
        success: true,
        exists: result.exists === true || result.exists === 'true',
        phone: result.phone || cleanPhone,
        lid: result.lid || null,
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
