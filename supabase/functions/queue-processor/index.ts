import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Auth check
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const token = authHeader.replace('Bearer ', '');
  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(req.url);
  const campaignId = url.searchParams.get('campaign_id');
  const action = url.searchParams.get('action') || 'tick';

  if (!campaignId) {
    return new Response(JSON.stringify({ error: 'campaign_id required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Verify campaign access
    const { data: campaign, error: campErr } = await supabase
      .from('call_campaigns')
      .select('id, name, user_id, queue_interval_seconds, queue_unavailable_behavior, company_id, retry_count, retry_interval_minutes')
      .eq('id', campaignId)
      .single();

    if (campErr || !campaign) {
      return new Response(JSON.stringify({ error: 'Campaign not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let hasAccess = campaign.user_id === userId;
    if (!hasAccess && campaign.company_id) {
      const { data: membership } = await supabase
        .from('company_members')
        .select('id')
        .eq('company_id', campaign.company_id)
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();
      hasAccess = !!membership;
    }

    if (!hasAccess) {
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'tick') {
      const result = await processTick(supabase, campaignId, userId, campaign);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[queue-processor] Error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function processTick(supabase: any, campaignId: string, userId: string, campaign: any) {
  // 1. Check queue_execution_state — is it running?
  const { data: state } = await supabase
    .from('queue_execution_state')
    .select('*')
    .eq('campaign_id', campaignId)
    .maybeSingle();

  const activeStatuses = ['running', 'waiting_operator', 'waiting_cooldown'];
  if (!state || !activeStatuses.includes(state.status)) {
    return { success: true, action: 'none', reason: 'Queue not running' };
  }

  // 2. Heal stuck operators + resolve cooldowns
  const { data: healedOps } = await supabase.rpc('heal_stuck_operators', { p_stuck_threshold_minutes: 10 });
  if (healedOps?.length) {
    console.log(`[queue-processor] Healed ${healedOps.length} stuck operators`);
  }

  const { data: resolvedOps } = await supabase.rpc('resolve_cooldowns');
  if (resolvedOps?.length) {
    console.log(`[queue-processor] Resolved ${resolvedOps.length} cooldowns`);
  }

  // 3. Find available operator (round-robin)
  let opsQuery = supabase
    .from('call_operators')
    .select('id, operator_name, extension, status')
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (campaign.company_id) {
    opsQuery = opsQuery.eq('company_id', campaign.company_id);
  } else {
    opsQuery = opsQuery.eq('user_id', userId);
  }

  const { data: allOps } = await opsQuery;

  if (!allOps || allOps.length === 0) {
    const behavior = campaign.queue_unavailable_behavior || 'wait';
    const newStatus = behavior === 'pause' ? 'paused' : 'waiting_operator';
    if (state.status !== newStatus) {
      await supabase.from('queue_execution_state').update({ status: newStatus }).eq('campaign_id', campaignId);
    }
    return { success: true, action: 'waiting', reason: 'No active operators' };
  }

  const currentIndex = state.current_operator_index || 0;
  let hasAvailable = false;
  let nextIndex = currentIndex;

  for (let i = 0; i < allOps.length; i++) {
    const idx = (currentIndex + i) % allOps.length;
    if (allOps[idx].status === 'available') {
      hasAvailable = true;
      nextIndex = (idx + 1) % allOps.length;
      break;
    }
  }

  if (!hasAvailable) {
    const behavior = campaign.queue_unavailable_behavior || 'wait';
    const newStatus = behavior === 'pause' ? 'paused' : 'waiting_operator';
    if (state.status !== newStatus) {
      await supabase.from('queue_execution_state').update({ status: newStatus }).eq('campaign_id', campaignId);
    }
    return { success: true, action: 'waiting', reason: 'No operator available' };
  }

  // 4. Get next from call_queue (ONE source only)
  const { data: entry } = await supabase
    .from('call_queue')
    .select('id, lead_id, phone, lead_name, campaign_id, attempt_number, max_attempts')
    .eq('campaign_id', campaignId)
    .eq('status', 'waiting')
    .order('is_priority', { ascending: false })
    .order('position', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!entry) {
    // 4b. Fallback: check for ready/scheduled call_logs
    const { data: readyLog } = await supabase
      .from('call_logs')
      .select('id, campaign_id, lead_id, user_id, attempt_number, max_attempts')
      .eq('campaign_id', campaignId)
      .in('call_status', ['ready', 'scheduled'])
      .lte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!readyLog) {
      // Truly nothing to process → stop
      await supabase.from('queue_execution_state')
        .update({ status: 'stopped' })
        .eq('campaign_id', campaignId);
      return { success: true, action: 'completed', reason: 'Queue empty' };
    }

    // Fetch lead data for phone/name
    let leadPhone = '';
    let leadName = '';
    if (readyLog.lead_id) {
      const { data: leadData } = await supabase
        .from('call_leads')
        .select('phone, name')
        .eq('id', readyLog.lead_id)
        .maybeSingle();
      if (leadData) {
        leadPhone = leadData.phone;
        leadName = leadData.name || '';
      }
    }

    // Reserve operator using existing call_log id
    const { data: reservation } = await supabase.rpc('reserve_operator_for_call', {
      p_call_id: readyLog.id,
      p_campaign_id: campaignId,
    });

    if (!reservation?.[0]?.success) {
      const behavior = campaign.queue_unavailable_behavior || 'wait';
      const newStatus = behavior === 'pause' ? 'paused' : 'waiting_operator';
      if (state.status !== newStatus) {
        await supabase.from('queue_execution_state').update({ status: newStatus }).eq('campaign_id', campaignId);
      }
      return { success: true, action: 'waiting', reason: reservation?.[0]?.error_code || 'no_operator_available' };
    }

    const operator = reservation[0];

    // Update existing call_log to dialing
    await supabase.from('call_logs').update({
      operator_id: operator.operator_id,
      call_status: 'dialing',
      started_at: new Date().toISOString(),
    }).eq('id', readyLog.id);

    // Update lead status
    if (readyLog.lead_id) {
      await supabase.from('call_leads').update({
        status: 'calling',
        assigned_operator_id: operator.operator_id,
        last_attempt_at: new Date().toISOString(),
      }).eq('id', readyLog.lead_id);
    }

    // Fire webhook
    const operatorObj = { id: operator.operator_id, operator_name: operator.operator_name, extension: operator.operator_extension };
    const leadObj = { id: readyLog.lead_id, phone: leadPhone, name: leadName };
    await fireDialWebhook(supabase, userId, readyLog.id, campaignId, campaign, leadObj, operatorObj);

    // Update queue_execution_state
    await supabase.from('queue_execution_state').update({
      last_dial_at: new Date().toISOString(),
      calls_made: (state.calls_made || 0) + 1,
      current_position: (state.current_position || 0) + 1,
      current_operator_index: nextIndex,
      status: 'running',
    }).eq('campaign_id', campaignId);

    console.log(`[queue-processor] Fallback: Dialed ${leadPhone} via operator ${operator.operator_name} (call_log ${readyLog.id})`);

    return {
      success: true,
      action: 'dialed',
      call_id: readyLog.id,
      operator: operator.operator_name,
      lead: { name: leadName, phone: leadPhone },
      source: 'fallback_call_logs',
    };
  }

  // 5. Create call_log (history)
  const { data: callLog, error: logErr } = await supabase
    .from('call_logs')
    .insert({
      user_id: userId,
      company_id: campaign.company_id || null,
      campaign_id: entry.campaign_id || campaignId,
      lead_id: entry.lead_id || null,
      call_status: 'ready',
      scheduled_for: new Date().toISOString(),
      attempt_number: entry.attempt_number || 1,
      max_attempts: entry.max_attempts || campaign.retry_count || 3,
    })
    .select('id')
    .single();

  if (logErr) {
    console.error('[queue-processor] Failed to create call log:', logErr);
    return { success: false, error: logErr.message };
  }

  // 6. Reserve operator atomically
  const { data: reservation } = await supabase.rpc('reserve_operator_for_call', {
    p_call_id: callLog.id,
    p_campaign_id: campaignId,
  });

  if (!reservation?.[0]?.success) {
    // Revert call_log
    await supabase.from('call_logs').update({ call_status: 'cancelled', ended_at: new Date().toISOString() }).eq('id', callLog.id);

    const behavior = campaign.queue_unavailable_behavior || 'wait';
    const newStatus = behavior === 'pause' ? 'paused' : 'waiting_operator';
    if (state.status !== newStatus) {
      await supabase.from('queue_execution_state').update({ status: newStatus }).eq('campaign_id', campaignId);
    }
    return { success: true, action: 'waiting', reason: reservation?.[0]?.error_code || 'no_operator_available' };
  }

  const operator = reservation[0];

  // Update call_log to dialing
  await supabase.from('call_logs').update({
    operator_id: operator.operator_id,
    call_status: 'dialing',
    started_at: new Date().toISOString(),
  }).eq('id', callLog.id);

  // Update lead status if lead_id exists
  if (entry.lead_id) {
    await supabase.from('call_leads').update({
      status: 'calling',
      assigned_operator_id: operator.operator_id,
      last_attempt_at: new Date().toISOString(),
    }).eq('id', entry.lead_id);
  }

  // 7. Fire webhook
  const operatorObj = { id: operator.operator_id, operator_name: operator.operator_name, extension: operator.operator_extension };
  const leadObj = { id: entry.lead_id, phone: entry.phone, name: entry.lead_name };
  await fireDialWebhook(supabase, userId, callLog.id, campaignId, campaign, leadObj, operatorObj);

  // 8. Remove from call_queue
  await supabase.from('call_queue').delete().eq('id', entry.id);

  // 9. Update queue_execution_state
  await supabase.from('queue_execution_state').update({
    last_dial_at: new Date().toISOString(),
    calls_made: (state.calls_made || 0) + 1,
    current_position: (state.current_position || 0) + 1,
    current_operator_index: nextIndex,
    status: 'running',
  }).eq('campaign_id', campaignId);

  console.log(`[queue-processor] Dialed ${entry.phone} via operator ${operator.operator_name}`);

  return {
    success: true,
    action: 'dialed',
    call_id: callLog.id,
    operator: operator.operator_name,
    lead: { name: entry.lead_name, phone: entry.phone },
  };
}

// Helper: fire webhook for call.dial
async function fireDialWebhook(
  supabase: any,
  userId: string,
  callLogId: string,
  campaignId: string,
  campaign: any,
  lead: any,
  operator: any,
) {
  try {
    const { data: webhookConfig } = await supabase
      .from('webhook_configs')
      .select('url, is_active')
      .eq('category', 'calls')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (!webhookConfig?.is_active || !webhookConfig?.url) {
      console.log('[queue-processor] No active webhook for calls category');
      return;
    }

    const payload = {
      action: 'call.dial',
      call: {
        id: callLogId,
        status: 'dialing',
        scheduled_for: new Date().toISOString(),
      },
      campaign: {
        id: campaignId,
        name: campaign.name,
      },
      lead: lead ? {
        id: lead.id,
        phone: lead.phone,
        name: lead.name || null,
      } : null,
      operator: {
        id: operator.id,
        name: operator.operator_name,
        extension: operator.extension || null,
      },
    };

    console.log('[queue-processor] Calling webhook:', webhookConfig.url);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const response = await fetch(webhookConfig.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const responseText = await response.text();
    console.log('[queue-processor] Webhook response:', response.status, responseText);

    try {
      const parsed = JSON.parse(responseText);
      if (Array.isArray(parsed) && parsed[0]?.id) {
        if (parsed[0]?.message === 'operator_unavailable') {
          console.log('[queue-processor] Operator unavailable, reverting');
          await supabase.from('call_logs').update({ call_status: 'ready', started_at: null, operator_id: null }).eq('id', callLogId);
          await supabase.rpc('release_operator', { p_call_id: callLogId, p_force: true });
          if (lead?.id) {
            await supabase.from('call_leads').update({ status: 'pending', assigned_operator_id: null }).eq('id', lead.id);
          }
          return;
        }
        await supabase.from('call_logs').update({ external_call_id: parsed[0].id }).eq('id', callLogId);
      }
    } catch {
      // Not JSON
    }
  } catch (error) {
    const isTimeout = error instanceof DOMException && error.name === 'AbortError';
    const failReason = isTimeout ? 'Timeout (60s)' : 'Webhook error';
    console.error('[queue-processor] Webhook error:', failReason, error);

    await supabase.from('call_logs').update({
      call_status: 'failed',
      notes: failReason,
      ended_at: new Date().toISOString(),
      operator_id: null,
    }).eq('id', callLogId);

    await supabase.rpc('release_operator', { p_call_id: callLogId, p_force: true });

    if (lead?.id) {
      await supabase.from('call_leads').update({ status: 'pending', assigned_operator_id: null }).eq('id', lead.id);
    }
  }
}
