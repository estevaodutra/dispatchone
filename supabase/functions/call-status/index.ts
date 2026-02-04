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

// Log API call to database
async function logApiCall(
  supabase: any,
  params: {
    method: string;
    endpoint: string;
    statusCode: number;
    responseTimeMs: number;
    userId?: string;
    apiKeyId?: string;
    ipAddress?: string;
    requestBody?: object;
    responseBody?: object;
    errorMessage?: string;
  }
) {
  try {
    await supabase.from('api_logs').insert({
      method: params.method,
      endpoint: params.endpoint,
      status_code: params.statusCode,
      response_time_ms: params.responseTimeMs,
      user_id: params.userId,
      api_key_id: params.apiKeyId,
      ip_address: params.ipAddress,
      request_body: params.requestBody,
      response_body: params.responseBody,
      error_message: params.errorMessage,
    });
  } catch (error) {
    console.error('[api-log] Failed to log API call:', error);
  }
}

// Validate phone format (minimum 10 digits with DDI)
function isValidPhone(phone: string): boolean {
  const cleanPhone = phone.replace(/\D/g, '');
  return cleanPhone.length >= 10;
}

// Valid call statuses
const VALID_STATUSES = ['dialing', 'ended', 'error'];

Deno.serve(async (req) => {
  const startTime = Date.now();
  const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
                 || req.headers.get('x-real-ip') 
                 || 'unknown';

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'method_not_allowed', message: 'Método não permitido' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let requestBody: any = {};
  let userId: string | undefined;
  let apiKeyId: string | undefined;

  try {
    // Parse request body
    requestBody = await req.json();
    const { external_call_id, status, campaign_name, lead_phone, lead_name, duration_seconds, error_message } = requestBody;

    console.log('[call-status] Request received:', { external_call_id, status, campaign_name, lead_phone });

    // ==================== VALIDATE API KEY ====================
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[call-status] Missing or invalid Authorization header');
      const responseBody = {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Token de autenticação ausente ou inválido.' }
      };
      await logApiCall(supabase, {
        method: req.method,
        endpoint: '/call-status',
        statusCode: 401,
        responseTimeMs: Date.now() - startTime,
        ipAddress,
        requestBody,
        responseBody,
        errorMessage: 'Missing or invalid Authorization header',
      });
      return new Response(JSON.stringify(responseBody), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Validate token format
    if (!token.startsWith('pk_live_') && !token.startsWith('pk_test_')) {
      console.log('[call-status] Invalid token format');
      const responseBody = {
        success: false,
        error: { code: 'INVALID_TOKEN_FORMAT', message: 'Formato do token inválido.' }
      };
      await logApiCall(supabase, {
        method: req.method,
        endpoint: '/call-status',
        statusCode: 401,
        responseTimeMs: Date.now() - startTime,
        ipAddress,
        requestBody,
        responseBody,
        errorMessage: 'Invalid token format',
      });
      return new Response(JSON.stringify(responseBody), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Hash and lookup API key
    const tokenHash = await hashToken(token);
    const { data: apiKey, error: lookupError } = await supabase
      .from('api_keys')
      .select('id, name, user_id, revoked_at')
      .eq('key_hash', tokenHash)
      .single();

    if (lookupError || !apiKey) {
      console.log('[call-status] API key not found:', lookupError?.message);
      const responseBody = {
        success: false,
        error: { code: 'INVALID_API_KEY', message: 'API key inválida ou não encontrada.' }
      };
      await logApiCall(supabase, {
        method: req.method,
        endpoint: '/call-status',
        statusCode: 401,
        responseTimeMs: Date.now() - startTime,
        ipAddress,
        requestBody,
        responseBody,
        errorMessage: 'API key not found',
      });
      return new Response(JSON.stringify(responseBody), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (apiKey.revoked_at) {
      console.log('[call-status] API key has been revoked');
      const responseBody = {
        success: false,
        error: { code: 'API_KEY_REVOKED', message: 'Esta API key foi revogada.' }
      };
      await logApiCall(supabase, {
        method: req.method,
        endpoint: '/call-status',
        statusCode: 401,
        responseTimeMs: Date.now() - startTime,
        userId: apiKey.user_id,
        apiKeyId: apiKey.id,
        ipAddress,
        requestBody,
        responseBody,
        errorMessage: 'API key revoked',
      });
      return new Response(JSON.stringify(responseBody), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!apiKey.user_id) {
      console.log('[call-status] API key not linked to user');
      const responseBody = {
        success: false,
        error: { code: 'API_KEY_NOT_LINKED', message: 'API key não está vinculada a um usuário.' }
      };
      await logApiCall(supabase, {
        method: req.method,
        endpoint: '/call-status',
        statusCode: 403,
        responseTimeMs: Date.now() - startTime,
        apiKeyId: apiKey.id,
        ipAddress,
        requestBody,
        responseBody,
        errorMessage: 'API key not linked to user',
      });
      return new Response(JSON.stringify(responseBody), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    userId = apiKey.user_id;
    apiKeyId = apiKey.id;

    // Update last_used_at
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKey.id);

    // ==================== VALIDATE INPUT ====================
    if (!external_call_id || typeof external_call_id !== 'string') {
      const responseBody = {
        success: false,
        error: 'invalid_external_call_id',
        message: 'external_call_id é obrigatório'
      };
      await logApiCall(supabase, {
        method: req.method,
        endpoint: '/call-status',
        statusCode: 400,
        responseTimeMs: Date.now() - startTime,
        userId,
        apiKeyId,
        ipAddress,
        requestBody,
        responseBody,
        errorMessage: 'Invalid external_call_id',
      });
      return new Response(JSON.stringify(responseBody), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!status || !VALID_STATUSES.includes(status)) {
      const responseBody = {
        success: false,
        error: 'invalid_status',
        message: `Status inválido. Use: ${VALID_STATUSES.join(', ')}`
      };
      await logApiCall(supabase, {
        method: req.method,
        endpoint: '/call-status',
        statusCode: 400,
        responseTimeMs: Date.now() - startTime,
        userId,
        apiKeyId,
        ipAddress,
        requestBody,
        responseBody,
        errorMessage: 'Invalid status',
      });
      return new Response(JSON.stringify(responseBody), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ==================== FIND EXISTING CALL LOG ====================
    console.log('[call-status] Searching for call log by external_call_id:', external_call_id);
    
    const { data: existingLog, error: searchError } = await supabase
      .from('call_logs')
      .select('id, campaign_id, lead_id, operator_id, started_at, ended_at, call_status')
      .eq('external_call_id', external_call_id)
      .eq('user_id', userId)
      .single();

    let callLog = existingLog;
    let isCreated = false;

    // ==================== CREATE NEW CALL LOG IF NOT FOUND ====================
    if (!callLog) {
      console.log('[call-status] Call log not found, checking if we can create one');
      
      // Need campaign_name and lead_phone to create
      if (!campaign_name || !lead_phone) {
        const responseBody = {
          success: false,
          error: 'call_not_found',
          message: 'Ligação não encontrada e dados insuficientes para criar (necessário campaign_name e lead_phone)'
        };
        await logApiCall(supabase, {
          method: req.method,
          endpoint: '/call-status',
          statusCode: 404,
          responseTimeMs: Date.now() - startTime,
          userId,
          apiKeyId,
          ipAddress,
          requestBody,
          responseBody,
          errorMessage: 'Call not found and insufficient data to create',
        });
        return new Response(JSON.stringify(responseBody), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Validate phone
      if (!isValidPhone(lead_phone)) {
        const responseBody = {
          success: false,
          error: 'invalid_phone',
          message: 'Formato de telefone inválido. Use DDI + DDD + número (mínimo 10 dígitos)'
        };
        await logApiCall(supabase, {
          method: req.method,
          endpoint: '/call-status',
          statusCode: 400,
          responseTimeMs: Date.now() - startTime,
          userId,
          apiKeyId,
          ipAddress,
          requestBody,
          responseBody,
          errorMessage: 'Invalid phone format',
        });
        return new Response(JSON.stringify(responseBody), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Find campaign by name
      console.log('[call-status] Searching for campaign:', campaign_name);
      const { data: campaign, error: campaignError } = await supabase
        .from('call_campaigns')
        .select('id, name, status')
        .eq('name', campaign_name)
        .eq('user_id', userId)
        .single();

      if (campaignError || !campaign) {
        console.log('[call-status] Campaign not found:', campaignError?.message);
        const responseBody = {
          success: false,
          error: 'campaign_not_found',
          message: `Campanha '${campaign_name}' não encontrada`
        };
        await logApiCall(supabase, {
          method: req.method,
          endpoint: '/call-status',
          statusCode: 404,
          responseTimeMs: Date.now() - startTime,
          userId,
          apiKeyId,
          ipAddress,
          requestBody,
          responseBody,
          errorMessage: 'Campaign not found',
        });
        return new Response(JSON.stringify(responseBody), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Find or create lead
      const cleanPhone = lead_phone.replace(/\D/g, '');
      let lead: { id: string } | null = null;

      const { data: existingLead } = await supabase
        .from('call_leads')
        .select('id')
        .eq('phone', cleanPhone)
        .eq('campaign_id', campaign.id)
        .single();

      if (existingLead) {
        lead = existingLead;
      } else {
        // Create new lead
        const { data: newLead, error: createLeadError } = await supabase
          .from('call_leads')
          .insert({
            campaign_id: campaign.id,
            user_id: userId,
            phone: cleanPhone,
            name: lead_name || null,
            status: 'calling'
          })
          .select('id')
          .single();

        if (createLeadError || !newLead) {
          console.error('[call-status] Failed to create lead:', createLeadError);
          throw new Error('Failed to create lead');
        }
        lead = newLead;
      }

      // Create new call log
      console.log('[call-status] Creating new call log');
      const { data: newCallLog, error: createLogError } = await supabase
        .from('call_logs')
        .insert({
          campaign_id: campaign.id,
          lead_id: lead.id,
          user_id: userId,
          external_call_id,
          call_status: status,
          started_at: status === 'dialing' ? new Date().toISOString() : null,
        })
        .select('id, campaign_id, lead_id, operator_id, started_at, ended_at, call_status')
        .single();

      if (createLogError || !newCallLog) {
        console.error('[call-status] Failed to create call log:', createLogError);
        throw new Error('Failed to create call log');
      }

      callLog = newCallLog;
      isCreated = true;
      console.log('[call-status] Created new call log:', callLog.id);
    }

    // ==================== UPDATE CALL LOG STATUS ====================
    const updateData: any = {
      call_status: status,
    };

    // Handle status-specific updates
    if (status === 'dialing') {
      if (!callLog.started_at) {
        updateData.started_at = new Date().toISOString();
      }
    } else if (status === 'ended') {
      updateData.ended_at = new Date().toISOString();
      if (duration_seconds !== undefined && duration_seconds !== null) {
        updateData.duration_seconds = duration_seconds;
      } else if (callLog.started_at) {
        // Calculate duration from started_at
        const startedAt = new Date(callLog.started_at);
        const endedAt = new Date();
        updateData.duration_seconds = Math.round((endedAt.getTime() - startedAt.getTime()) / 1000);
      }
    } else if (status === 'error') {
      updateData.ended_at = new Date().toISOString();
      if (error_message) {
        updateData.notes = error_message;
      }
    }

    // Only update if not just created (avoid double write)
    if (!isCreated) {
      console.log('[call-status] Updating call log:', callLog.id, updateData);
      const { error: updateError } = await supabase
        .from('call_logs')
        .update(updateData)
        .eq('id', callLog.id);

      if (updateError) {
        console.error('[call-status] Failed to update call log:', updateError);
        throw new Error('Failed to update call log');
      }
    }

    // ==================== UPDATE LEAD STATUS ====================
    if (callLog.lead_id) {
      let leadStatus = 'calling';
      if (status === 'ended') {
        leadStatus = 'completed';
      } else if (status === 'error') {
        leadStatus = 'failed';
      }

      await supabase
        .from('call_leads')
        .update({ status: leadStatus })
        .eq('id', callLog.lead_id);
    }

    // ==================== SUCCESS RESPONSE ====================
    const responseBody = {
      success: true,
      call_id: callLog.id,
      external_call_id,
      status,
      duration_seconds: updateData.duration_seconds || null,
      ...(isCreated && { created: true }),
    };

    console.log('[call-status] Success:', responseBody);

    await logApiCall(supabase, {
      method: req.method,
      endpoint: '/call-status',
      statusCode: isCreated ? 201 : 200,
      responseTimeMs: Date.now() - startTime,
      userId,
      apiKeyId,
      ipAddress,
      requestBody,
      responseBody,
    });

    return new Response(JSON.stringify(responseBody), {
      status: isCreated ? 201 : 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[call-status] Internal error:', error);
    const responseBody = {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Erro interno ao processar requisição.' }
    };
    await logApiCall(supabase, {
      method: req.method,
      endpoint: '/call-status',
      statusCode: 500,
      responseTimeMs: Date.now() - startTime,
      userId,
      apiKeyId,
      ipAddress,
      requestBody,
      responseBody,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    return new Response(JSON.stringify(responseBody), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
