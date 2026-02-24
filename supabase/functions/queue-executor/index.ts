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
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Auth check
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(req.url);
  const campaignId = url.searchParams.get('campaign_id');
  const action = url.searchParams.get('action') || 'status';

  if (!campaignId) {
    return new Response(JSON.stringify({ error: 'campaign_id required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Verify campaign access (owner or company member)
    const { data: campaign, error: campErr } = await supabase
      .from('call_campaigns')
      .select('id, name, user_id, queue_execution_enabled, queue_interval_seconds, queue_unavailable_behavior, company_id')
      .eq('id', campaignId)
      .single();

    if (campErr || !campaign) {
      return new Response(JSON.stringify({ error: 'Campaign not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check access: either owner or company member
    let hasAccess = campaign.user_id === user.id;
    if (!hasAccess && campaign.company_id) {
      const { data: membership } = await supabase
        .from('company_members')
        .select('id')
        .eq('company_id', campaign.company_id)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      hasAccess = !!membership;
    }

    if (!hasAccess) {
      return new Response(JSON.stringify({ error: 'Campaign not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    switch (action) {
      case 'tick': {
        const result = await processTick(supabase, campaignId, user.id, campaign);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'status': {
        const result = await getStatus(supabase, campaignId, user.id, campaign);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (err) {
    console.error('[queue-executor] Error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getStatus(supabase: any, campaignId: string, userId: string, campaign: any) {
  const { data: state } = await supabase
    .from('queue_execution_state')
    .select('*')
    .eq('campaign_id', campaignId)
    .maybeSingle();

  // Use company_id to find operators if available, otherwise fall back to user_id
  let operatorQuery = supabase
    .from('call_operators')
    .select('id, operator_name, status, current_call_id, personal_interval_seconds, last_call_ended_at')
    .eq('is_active', true);

  if (campaign.company_id) {
    operatorQuery = operatorQuery.eq('company_id', campaign.company_id);
  } else {
    operatorQuery = operatorQuery.eq('user_id', userId);
  }

  const { data: operators } = await operatorQuery;

  const { count: queueRemaining } = await supabase
    .from('call_leads')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('status', 'pending');

  const operatorStats = {
    total: operators?.length || 0,
    available: operators?.filter((o: any) => o.status === 'available').length || 0,
    on_call: operators?.filter((o: any) => o.status === 'on_call').length || 0,
    cooldown: operators?.filter((o: any) => o.status === 'cooldown').length || 0,
    paused: operators?.filter((o: any) => o.status === 'paused').length || 0,
    offline: operators?.filter((o: any) => o.status === 'offline').length || 0,
  };

  return {
    success: true,
    execution: state ? {
      status: state.status,
      session_started_at: state.session_started_at,
      calls_made: state.calls_made,
      calls_answered: state.calls_answered,
      calls_no_answer: state.calls_no_answer,
    } : null,
    queue: { remaining: queueRemaining || 0 },
    operators: operatorStats,
  };
}

async function processTick(supabase: any, campaignId: string, userId: string, campaign: any) {
  // Get current queue state
  const { data: state } = await supabase
    .from('queue_execution_state')
    .select('*')
    .eq('campaign_id', campaignId)
    .maybeSingle();

  const activeQueueStatuses = ['running', 'waiting_operator', 'waiting_cooldown'];
  if (!state || !activeQueueStatuses.includes(state.status)) {
    return { success: true, action: 'none', reason: 'Queue not running' };
  }

  // 0. Self-healing via RPC (atomic)
  const { data: healedOps } = await supabase.rpc('heal_stuck_operators', { p_stuck_threshold_minutes: 10 });
  if (healedOps?.length) {
    console.log(`[queue-executor] Healed ${healedOps.length} stuck operators`);
  }

  // 0b. Self-healing: revert orphan call_logs (dialing/ringing without operator)
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { data: orphanLogs } = await supabase
    .from('call_logs')
    .select('id')
    .eq('campaign_id', campaignId)
    .in('call_status', ['dialing', 'ringing'])
    .is('operator_id', null)
    .lt('created_at', twoMinutesAgo);

  if (orphanLogs?.length) {
    const orphanIds = orphanLogs.map((l: any) => l.id);
    await supabase
      .from('call_logs')
      .update({ call_status: 'ready', started_at: null })
      .in('id', orphanIds);
    console.log(`[queue-executor] Reverted ${orphanIds.length} orphan call_logs to ready`);
  }

  // 1. Resolve cooldowns via RPC (atomic)
  const { data: resolvedOps } = await supabase.rpc('resolve_cooldowns');
  if (resolvedOps?.length) {
    console.log(`[queue-executor] Resolved ${resolvedOps.length} cooldowns`);
  }

  // 2. Round-robin: fetch ALL active operators in fixed order
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

  const { data: allActiveOps } = await opsQuery;

  if (!allActiveOps || allActiveOps.length === 0) {
    const behavior = campaign.queue_unavailable_behavior || 'wait';
    const newStatus = behavior === 'pause' ? 'paused' : 'waiting_operator';
    if (state.status !== newStatus) {
      await supabase
        .from('queue_execution_state')
        .update({ status: newStatus })
        .eq('campaign_id', campaignId);
    }
    return { success: true, action: 'waiting', reason: 'No active operators', new_status: newStatus };
  }

  // Check if any operator is available (for round-robin index tracking)
  const currentIndex = state.current_operator_index || 0;
  const totalOps = allActiveOps.length;
  let hasAvailable = false;
  let nextIndex = currentIndex;

  for (let i = 0; i < totalOps; i++) {
    const idx = (currentIndex + i) % totalOps;
    if (allActiveOps[idx].status === 'available') {
      hasAvailable = true;
      nextIndex = (idx + 1) % totalOps;
      break;
    }
  }

  if (!hasAvailable) {
    const behavior = campaign.queue_unavailable_behavior || 'wait';
    const newStatus = behavior === 'pause' ? 'paused' : 'waiting_operator';
    if (state.status !== newStatus) {
      await supabase
        .from('queue_execution_state')
        .update({ status: newStatus })
        .eq('campaign_id', campaignId);
    }
    return { success: true, action: 'waiting', reason: 'No operator available', new_status: newStatus };
  }

  // 3a. Check for existing ready call_logs
  // Priority: first try from priority campaigns, then normal
  let priorityQuery = supabase
    .from('call_campaigns')
    .select('id')
    .eq('is_priority', true)
    .eq('status', 'active');

  if (campaign.company_id) {
    priorityQuery = priorityQuery.eq('company_id', campaign.company_id);
  } else {
    priorityQuery = priorityQuery.eq('user_id', userId);
  }

  const { data: priorityCampaigns } = await priorityQuery;

  const priorityIds = (priorityCampaigns || []).map((c: any) => c.id);

  let readyCallLog = null;

  // Try priority campaigns first
  if (priorityIds.length > 0) {
    const { data } = await supabase
      .from('call_logs')
      .select('id, lead_id, campaign_id')
      .in('campaign_id', priorityIds)
      .eq('call_status', 'ready')
      .order('scheduled_for', { ascending: true })
      .limit(1)
      .maybeSingle();
    readyCallLog = data;
  }

  // If no priority ready, try current campaign
  if (!readyCallLog) {
    const { data } = await supabase
      .from('call_logs')
      .select('id, lead_id, campaign_id')
      .eq('campaign_id', campaignId)
      .eq('call_status', 'ready')
      .order('scheduled_for', { ascending: true })
      .limit(1)
      .maybeSingle();
    readyCallLog = data;
  }

  if (readyCallLog) {
    // Get lead info
    const { data: readyLead } = await supabase
      .from('call_leads')
      .select('id, phone, name')
      .eq('id', readyCallLog.lead_id)
      .maybeSingle();

    // CAMADA 3: Limpeza preventiva antes de reservar
    // (cancela call_logs ativos do operador que será atribuído)
    // O RPC já faz isso internamente (Camada 1), mas reforçamos aqui

    // Reserve operator atomically via RPC
    const { data: reservation } = await supabase.rpc('reserve_operator_for_call', {
      p_call_id: readyCallLog.id,
      p_campaign_id: campaignId,
    });

    if (!reservation?.[0]?.success) {
      const behavior = campaign.queue_unavailable_behavior || 'wait';
      const newStatus = behavior === 'pause' ? 'paused' : 'waiting_operator';
      if (state.status !== newStatus) {
        await supabase.from('queue_execution_state').update({ status: newStatus }).eq('campaign_id', campaignId);
      }
      return { success: true, action: 'waiting', reason: reservation?.[0]?.error_code || 'no_operator_available', new_status: newStatus };
    }

    const operator = reservation[0];

    // Update call_log to dialing
    await supabase
      .from('call_logs')
      .update({
        operator_id: operator.operator_id,
        call_status: 'dialing',
        started_at: new Date().toISOString(),
      })
      .eq('id', readyCallLog.id);

    // Update lead status
    if (readyLead) {
      await supabase
        .from('call_leads')
        .update({
          status: 'calling',
          assigned_operator_id: operator.operator_id,
          last_attempt_at: new Date().toISOString(),
        })
        .eq('id', readyLead.id);
    }

    // Fire webhook
    const operatorObj = { id: operator.operator_id, operator_name: operator.operator_name, extension: operator.operator_extension };
    await fireDialWebhook(supabase, userId, readyCallLog.id, campaignId, campaign, readyLead, operatorObj);

    // Update queue state
    await supabase
      .from('queue_execution_state')
      .update({
        last_dial_at: new Date().toISOString(),
        calls_made: (state.calls_made || 0) + 1,
        current_position: (state.current_position || 0) + 1,
        current_operator_index: nextIndex,
        status: 'running',
      })
      .eq('campaign_id', campaignId);

    return {
      success: true,
      action: 'dialed',
      call_id: readyCallLog.id,
      operator: operator.operator_name,
      lead: readyLead ? { name: readyLead.name, phone: readyLead.phone } : null,
      source: 'ready_queue',
    };
  }

  // 3b. Find next pending lead (priority campaigns first, then current)
  let nextLead = null;

  if (priorityIds.length > 0) {
    const { data } = await supabase
      .from('call_leads')
      .select('id, phone, name, campaign_id')
      .in('campaign_id', priorityIds)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    nextLead = data;
  }

  if (!nextLead) {
    const { data } = await supabase
      .from('call_leads')
      .select('id, phone, name, campaign_id')
      .eq('campaign_id', campaignId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    nextLead = data;
  }

  if (!nextLead) {
    await supabase
      .from('queue_execution_state')
      .update({ status: 'stopped' })
      .eq('campaign_id', campaignId);

    return { success: true, action: 'completed', reason: 'Queue empty' };
  }

  // 4. Create call log first
  const scheduledFor = new Date().toISOString();

  const { data: callLog, error: logErr } = await supabase
    .from('call_logs')
    .insert({
      user_id: userId,
      company_id: campaign.company_id || null,
      campaign_id: campaignId,
      lead_id: nextLead.id,
      call_status: 'ready',
      scheduled_for: scheduledFor,
    })
    .select('id')
    .single();

  if (logErr) {
    console.error('[queue-executor] Failed to create call log:', logErr);
    return { success: false, error: logErr.message };
  }

  // 5. Reserve operator atomically via RPC
  const { data: reservation } = await supabase.rpc('reserve_operator_for_call', {
    p_call_id: callLog.id,
    p_campaign_id: campaignId,
  });

  if (!reservation?.[0]?.success) {
    // No operator available — revert call log to ready
    await supabase.from('call_logs').update({ call_status: 'ready', started_at: null }).eq('id', callLog.id);

    const behavior = campaign.queue_unavailable_behavior || 'wait';
    const newStatus = behavior === 'pause' ? 'paused' : 'waiting_operator';
    if (state.status !== newStatus) {
      await supabase.from('queue_execution_state').update({ status: newStatus }).eq('campaign_id', campaignId);
    }
    return { success: true, action: 'waiting', reason: reservation?.[0]?.error_code || 'no_operator_available' };
  }

  const operator = reservation[0];

  // 6. Update call log with operator + set to dialing
  await supabase
    .from('call_logs')
    .update({ operator_id: operator.operator_id, call_status: 'dialing', started_at: new Date().toISOString() })
    .eq('id', callLog.id);

  // 7. Update lead status
  await supabase
    .from('call_leads')
    .update({
      status: 'calling',
      assigned_operator_id: operator.operator_id,
      last_attempt_at: new Date().toISOString(),
    })
    .eq('id', nextLead.id);

  // 8. Fire webhook
  const operatorObj = { id: operator.operator_id, operator_name: operator.operator_name, extension: operator.operator_extension };
  await fireDialWebhook(supabase, userId, callLog.id, campaignId, campaign, nextLead, operatorObj);

  // 9. Update queue state
  await supabase
    .from('queue_execution_state')
    .update({
      last_dial_at: new Date().toISOString(),
      calls_made: (state.calls_made || 0) + 1,
      current_position: (state.current_position || 0) + 1,
      current_operator_index: nextIndex,
      status: 'running',
    })
    .eq('campaign_id', campaignId);

  return {
    success: true,
    action: 'dialed',
    call_id: callLog.id,
    operator: operator.operator_name,
    lead: { name: nextLead.name, phone: nextLead.phone },
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
    // Fetch campaign to get owner's user_id for webhook resolution
    const { data: campaignRow } = await supabase
      .from('call_campaigns')
      .select('user_id')
      .eq('id', campaignId)
      .single();

    const campaignOwnerId = campaignRow?.user_id || userId;

    const { data: webhookConfig } = await supabase
      .from('webhook_configs')
      .select('url, is_active')
      .eq('user_id', campaignOwnerId)
      .eq('category', 'calls')
      .maybeSingle();

    if (!webhookConfig?.is_active || !webhookConfig?.url) {
      console.log('[queue-executor] No active webhook for calls category');
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

    console.log('[queue-executor] Calling webhook:', webhookConfig.url);
    const response = await fetch(webhookConfig.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log('[queue-executor] Webhook response:', response.status, responseText);

    // Parse response for external_call_id or operator_unavailable
    try {
      const parsed = JSON.parse(responseText);
      if (Array.isArray(parsed) && parsed[0]?.id) {
        // Detect operator_unavailable
        if (parsed[0]?.message === 'operator_unavailable') {
          console.log('[queue-executor] Operator unavailable response, reverting call to queue');

          // Revert call_log to ready
          await supabase
            .from('call_logs')
            .update({ call_status: 'ready', started_at: null, operator_id: null })
            .eq('id', callLogId);

          // Release operator via RPC (force)
          await supabase.rpc('release_operator', { p_call_id: callLogId, p_force: true });

          // Revert lead to pending
          if (lead?.id) {
            await supabase
              .from('call_leads')
              .update({ status: 'pending', assigned_operator_id: null })
              .eq('id', lead.id);
          }
          return;
        }

        // Normal flow: store external_call_id
        await supabase
          .from('call_logs')
          .update({ external_call_id: parsed[0].id })
          .eq('id', callLogId);
        console.log('[queue-executor] Stored external_call_id:', parsed[0].id);
      }
    } catch {
      // Response not JSON, ignore
    }
  } catch (error) {
    console.error('[queue-executor] Webhook error:', error);
    // On webhook failure, release operator via RPC
    await supabase.rpc('release_operator', { p_call_id: callLogId, p_force: true });
  }
}
