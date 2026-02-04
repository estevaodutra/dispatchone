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
    const { campaign_name, lead_phone, lead_name } = requestBody;

    console.log('[call-dial] Request received:', { campaign_name, lead_phone, lead_name });

    // ==================== VALIDATE API KEY ====================
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[call-dial] Missing or invalid Authorization header');
      const responseBody = {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Token de autenticação ausente ou inválido.' }
      };
      await logApiCall(supabase, {
        method: req.method,
        endpoint: '/call-dial',
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
      console.log('[call-dial] Invalid token format');
      const responseBody = {
        success: false,
        error: { code: 'INVALID_TOKEN_FORMAT', message: 'Formato do token inválido.' }
      };
      await logApiCall(supabase, {
        method: req.method,
        endpoint: '/call-dial',
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
      console.log('[call-dial] API key not found:', lookupError?.message);
      const responseBody = {
        success: false,
        error: { code: 'INVALID_API_KEY', message: 'API key inválida ou não encontrada.' }
      };
      await logApiCall(supabase, {
        method: req.method,
        endpoint: '/call-dial',
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
      console.log('[call-dial] API key has been revoked');
      const responseBody = {
        success: false,
        error: { code: 'API_KEY_REVOKED', message: 'Esta API key foi revogada.' }
      };
      await logApiCall(supabase, {
        method: req.method,
        endpoint: '/call-dial',
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
      console.log('[call-dial] API key not linked to user');
      const responseBody = {
        success: false,
        error: { code: 'API_KEY_NOT_LINKED', message: 'API key não está vinculada a um usuário.' }
      };
      await logApiCall(supabase, {
        method: req.method,
        endpoint: '/call-dial',
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
    if (!campaign_name || typeof campaign_name !== 'string') {
      const responseBody = {
        success: false,
        error: 'invalid_campaign_name',
        message: 'Nome da campanha é obrigatório'
      };
      await logApiCall(supabase, {
        method: req.method,
        endpoint: '/call-dial',
        statusCode: 400,
        responseTimeMs: Date.now() - startTime,
        userId,
        apiKeyId,
        ipAddress,
        requestBody,
        responseBody,
        errorMessage: 'Invalid campaign_name',
      });
      return new Response(JSON.stringify(responseBody), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!lead_phone || typeof lead_phone !== 'string') {
      const responseBody = {
        success: false,
        error: 'invalid_phone',
        message: 'Telefone do lead é obrigatório'
      };
      await logApiCall(supabase, {
        method: req.method,
        endpoint: '/call-dial',
        statusCode: 400,
        responseTimeMs: Date.now() - startTime,
        userId,
        apiKeyId,
        ipAddress,
        requestBody,
        responseBody,
        errorMessage: 'Invalid lead_phone',
      });
      return new Response(JSON.stringify(responseBody), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!isValidPhone(lead_phone)) {
      const responseBody = {
        success: false,
        error: 'invalid_phone',
        message: 'Formato de telefone inválido. Use DDI + DDD + número (mínimo 10 dígitos)'
      };
      await logApiCall(supabase, {
        method: req.method,
        endpoint: '/call-dial',
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

    // ==================== FIND CAMPAIGN ====================
    console.log('[call-dial] Searching for campaign:', campaign_name);
    
    const { data: campaign, error: campaignError } = await supabase
      .from('call_campaigns')
      .select('id, name, status, user_id')
      .eq('name', campaign_name)
      .eq('user_id', userId)
      .single();

    if (campaignError || !campaign) {
      console.log('[call-dial] Campaign not found:', campaignError?.message);
      const responseBody = {
        success: false,
        error: 'campaign_not_found',
        message: `Campanha '${campaign_name}' não encontrada`
      };
      await logApiCall(supabase, {
        method: req.method,
        endpoint: '/call-dial',
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

    if (campaign.status !== 'active') {
      console.log('[call-dial] Campaign is inactive:', campaign.status);
      const responseBody = {
        success: false,
        error: 'campaign_inactive',
        message: 'Campanha está inativa'
      };
      await logApiCall(supabase, {
        method: req.method,
        endpoint: '/call-dial',
        statusCode: 400,
        responseTimeMs: Date.now() - startTime,
        userId,
        apiKeyId,
        ipAddress,
        requestBody,
        responseBody,
        errorMessage: 'Campaign inactive',
      });
      return new Response(JSON.stringify(responseBody), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ==================== FIND OR CREATE LEAD ====================
    console.log('[call-dial] Searching for lead:', lead_phone);
    
    const cleanPhone = lead_phone.replace(/\D/g, '');
    
    const { data: existingLead, error: leadSearchError } = await supabase
      .from('call_leads')
      .select('id, phone, name, status')
      .eq('phone', cleanPhone)
      .eq('campaign_id', campaign.id)
      .single();

    let lead: { id: string; phone: string; name: string | null; status: string };

    if (existingLead) {
      // Check lead status
      if (existingLead.status === 'completed') {
        console.log('[call-dial] Lead already completed');
        const responseBody = {
          success: false,
          error: 'lead_already_completed',
          message: 'Lead já foi concluído nesta campanha'
        };
        await logApiCall(supabase, {
          method: req.method,
          endpoint: '/call-dial',
          statusCode: 400,
          responseTimeMs: Date.now() - startTime,
          userId,
          apiKeyId,
          ipAddress,
          requestBody,
          responseBody,
          errorMessage: 'Lead already completed',
        });
        return new Response(JSON.stringify(responseBody), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (existingLead.status === 'calling') {
        console.log('[call-dial] Lead already in call');
        const responseBody = {
          success: false,
          error: 'lead_already_calling',
          message: 'Lead já está em ligação'
        };
        await logApiCall(supabase, {
          method: req.method,
          endpoint: '/call-dial',
          statusCode: 400,
          responseTimeMs: Date.now() - startTime,
          userId,
          apiKeyId,
          ipAddress,
          requestBody,
          responseBody,
          errorMessage: 'Lead already calling',
        });
        return new Response(JSON.stringify(responseBody), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      lead = existingLead;
      console.log('[call-dial] Found existing lead:', lead.id);
    } else {
      // Create new lead
      console.log('[call-dial] Creating new lead');
      const { data: newLead, error: createLeadError } = await supabase
        .from('call_leads')
        .insert({
          campaign_id: campaign.id,
          user_id: userId,
          phone: cleanPhone,
          name: lead_name || null,
          status: 'pending'
        })
        .select('id, phone, name, status')
        .single();

      if (createLeadError || !newLead) {
        console.error('[call-dial] Failed to create lead:', createLeadError);
        throw new Error('Failed to create lead');
      }

      lead = newLead;
      console.log('[call-dial] Created new lead:', lead.id);
    }

    // ==================== FIND ACTIVE OPERATOR ====================
    console.log('[call-dial] Searching for active operator in campaign:', campaign.id);
    
    const { data: operator, error: operatorError } = await supabase
      .from('call_campaign_operators')
      .select('id, operator_name, extension')
      .eq('campaign_id', campaign.id)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (operatorError || !operator) {
      console.log('[call-dial] No active operator found:', operatorError?.message);
      const responseBody = {
        success: false,
        error: 'no_operator_available',
        message: 'Nenhum operador disponível na campanha'
      };
      await logApiCall(supabase, {
        method: req.method,
        endpoint: '/call-dial',
        statusCode: 400,
        responseTimeMs: Date.now() - startTime,
        userId,
        apiKeyId,
        ipAddress,
        requestBody,
        responseBody,
        errorMessage: 'No operator available',
      });
      return new Response(JSON.stringify(responseBody), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[call-dial] Found operator:', operator.id);

    // ==================== CREATE CALL LOG ====================
    console.log('[call-dial] Creating call log');
    
    const { data: callLog, error: callLogError } = await supabase
      .from('call_logs')
      .insert({
        campaign_id: campaign.id,
        lead_id: lead.id,
        operator_id: operator.id,
        user_id: userId,
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (callLogError || !callLog) {
      console.error('[call-dial] Failed to create call log:', callLogError);
      throw new Error('Failed to create call log');
    }

    console.log('[call-dial] Created call log:', callLog.id);

    // ==================== UPDATE LEAD STATUS ====================
    console.log('[call-dial] Updating lead status to calling');
    
    const { error: updateLeadError } = await supabase
      .from('call_leads')
      .update({ 
        status: 'calling',
        last_attempt_at: new Date().toISOString(),
        attempts: (lead as any).attempts ? (lead as any).attempts + 1 : 1,
        assigned_operator_id: operator.id
      })
      .eq('id', lead.id);

    if (updateLeadError) {
      console.error('[call-dial] Failed to update lead status:', updateLeadError);
    }

    // ==================== SUCCESS RESPONSE ====================
    const responseBody = {
      success: true,
      call_id: callLog.id,
      status: 'dialing',
      campaign: {
        id: campaign.id,
        name: campaign.name
      },
      lead: {
        id: lead.id,
        phone: lead.phone,
        name: lead.name || lead_name || null
      },
      operator: {
        id: operator.id,
        name: operator.operator_name,
        extension: operator.extension
      }
    };

    console.log('[call-dial] Success:', responseBody);

    await logApiCall(supabase, {
      method: req.method,
      endpoint: '/call-dial',
      statusCode: 201,
      responseTimeMs: Date.now() - startTime,
      userId,
      apiKeyId,
      ipAddress,
      requestBody,
      responseBody: { success: true, call_id: callLog.id },
    });

    return new Response(JSON.stringify(responseBody), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[call-dial] Internal error:', error);
    const responseBody = {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Erro interno ao processar requisição.' }
    };
    await logApiCall(supabase, {
      method: req.method,
      endpoint: '/call-dial',
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
