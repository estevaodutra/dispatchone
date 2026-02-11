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
      .select('id, name, status, user_id, dial_delay_minutes')
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
        .upsert({
          campaign_id: campaign.id,
          user_id: userId,
          phone: cleanPhone,
          name: lead_name || null,
          status: 'pending'
        }, { onConflict: 'phone,campaign_id' })
        .select('id, phone, name, status')
        .single();

      if (createLeadError || !newLead) {
        console.error('[call-dial] Failed to create lead:', createLeadError);
        throw new Error('Failed to create lead');
      }

      lead = newLead;
      console.log('[call-dial] Created new lead:', lead.id);
    }

    // ==================== FIND ACTIVE OPERATOR (round-robin) ====================
    console.log('[call-dial] Searching for active operators in campaign:', campaign.id);
    
    const { data: activeOperators, error: operatorError } = await supabase
      .from('call_operators')
      .select('id, operator_name, extension')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (operatorError || !activeOperators || activeOperators.length === 0) {
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

    // Select operator with fewest assigned calls (round-robin)
    let operator = activeOperators[0];
    if (activeOperators.length > 1) {
      let minCount = Infinity;
      for (const op of activeOperators) {
        const { count } = await supabase
          .from('call_logs')
          .select('*', { count: 'exact', head: true })
          .eq('operator_id', op.id)
          .eq('campaign_id', campaign.id);
        const c = count || 0;
        if (c < minCount) {
          minCount = c;
          operator = op;
        }
      }
    }

    console.log('[call-dial] Found operator:', operator.id);

    // ==================== CREATE OR UPDATE CALL LOG ====================
    const dialDelayMinutes = campaign.dial_delay_minutes || 10;
    const scheduledFor = new Date(Date.now() + dialDelayMinutes * 60 * 1000).toISOString();

    // Check for existing active call_log for same lead + campaign
    const activeStatuses = ['scheduled', 'ready', 'dialing', 'ringing', 'answered', 'in_progress'];
    const { data: existingLog } = await supabase
      .from('call_logs')
      .select('id')
      .eq('lead_id', lead.id)
      .eq('campaign_id', campaign.id)
      .in('call_status', activeStatuses)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let callLog: { id: string };

    if (existingLog) {
      // Update existing active call_log instead of creating duplicate
      console.log('[call-dial] Found existing active call_log, updating:', existingLog.id);
      const { error: updateError } = await supabase
        .from('call_logs')
        .update({
          operator_id: operator.id,
          call_status: 'scheduled',
          scheduled_for: scheduledFor,
          started_at: new Date().toISOString(),
        })
        .eq('id', existingLog.id);

      if (updateError) {
        console.error('[call-dial] Failed to update call log:', updateError);
        throw new Error('Failed to update call log');
      }
      callLog = { id: existingLog.id };
    } else {
      // Create new call_log
      console.log('[call-dial] Creating new call log');
      const { data: newLog, error: callLogError } = await supabase
        .from('call_logs')
        .insert({
          campaign_id: campaign.id,
          lead_id: lead.id,
          operator_id: operator.id,
          user_id: userId,
          call_status: 'scheduled',
          scheduled_for: scheduledFor,
          started_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (callLogError || !newLog) {
        console.error('[call-dial] Failed to create call log:', callLogError);
        throw new Error('Failed to create call log');
      }
      callLog = { id: newLog.id };
    }

    console.log('[call-dial] Call log ready:', callLog.id);

    // ==================== UPDATE LEAD STATUS ====================
    console.log('[call-dial] Updating lead status to calling');
    
    const { error: updateLeadError } = await supabase
      .from('call_leads')
      .update({ 
        status: 'scheduled',
        last_attempt_at: new Date().toISOString(),
        attempts: (lead as any).attempts ? (lead as any).attempts + 1 : 1,
        assigned_operator_id: operator.id
      })
      .eq('id', lead.id);

    if (updateLeadError) {
      console.error('[call-dial] Failed to update lead status:', updateLeadError);
    }

    // ==================== WEBHOOK INTEGRATION ====================
    console.log('[call-dial] Checking for webhook configuration');
    
    const { data: webhookConfig } = await supabase
      .from('webhook_configs')
      .select('url, is_active')
      .eq('user_id', userId)
      .eq('category', 'calls')
      .maybeSingle();

    // Build standardized webhook payload
    const webhookPayload = {
      action: 'call.dial',
      call: {
        id: callLog.id,
        status: 'scheduled',
        scheduled_for: scheduledFor,
        dial_in_minutes: dialDelayMinutes,
      },
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

    // Call webhook if configured and active
    let webhookResult: { called: boolean; url?: string; status?: number; response?: string; error?: string; reason?: string } = { 
      called: false, 
      reason: 'no_webhook_configured' 
    };

    if (webhookConfig?.is_active && webhookConfig?.url) {
      console.log('[call-dial] Calling webhook:', webhookConfig.url);
      try {
        const webhookResponse = await fetch(webhookConfig.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload)
        });
        
        const webhookData = await webhookResponse.text();
        webhookResult = {
          called: true,
          url: webhookConfig.url,
          status: webhookResponse.status,
          response: webhookData
        };
        console.log('[call-dial] Webhook response:', webhookResult);

        // Parse response and extract external call ID
        // Expected format: [{ "id": "uuid", "message": "successfull" }]
        try {
          const parsedResponse = JSON.parse(webhookData);
          if (Array.isArray(parsedResponse) && parsedResponse[0]?.id) {
            const externalCallId = parsedResponse[0].id;
            console.log('[call-dial] External call ID received:', externalCallId);
            
            // Update call_log with external ID and status
            await supabase
              .from('call_logs')
              .update({ 
                external_call_id: externalCallId,
                call_status: 'dialing'
              })
              .eq('id', callLog.id);
          }
        } catch (parseError) {
          console.log('[call-dial] Could not parse webhook response as JSON');
        }
      } catch (error) {
        console.error('[call-dial] Webhook error:', error);
        webhookResult = {
          called: true,
          url: webhookConfig.url,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    } else {
      console.log('[call-dial] No active webhook configured for calls category');
    }

    // ==================== SUCCESS RESPONSE ====================
    const responseBody = {
      success: true,
      call_id: callLog.id,
      status: 'scheduled',
      scheduled_for: scheduledFor,
      dial_in_minutes: dialDelayMinutes,
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
      },
      webhook: webhookResult
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
      responseBody: { success: true, call_id: callLog.id, webhook: { called: webhookResult.called } },
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
