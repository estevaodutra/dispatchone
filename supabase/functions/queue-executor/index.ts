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
  const pathParts = url.pathname.split('/').filter(Boolean);
  // Expected: /queue-executor/{campaign_id}/{action}
  // Or from Supabase: the path after function name
  const campaignId = url.searchParams.get('campaign_id');
  const action = url.searchParams.get('action') || 'status';

  if (!campaignId) {
    return new Response(JSON.stringify({ error: 'campaign_id required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Verify campaign ownership
    const { data: campaign, error: campErr } = await supabase
      .from('call_campaigns')
      .select('id, name, queue_execution_enabled, queue_interval_seconds, queue_unavailable_behavior')
      .eq('id', campaignId)
      .eq('user_id', user.id)
      .single();

    if (campErr || !campaign) {
      return new Response(JSON.stringify({ error: 'Campaign not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    switch (action) {
      case 'tick': {
        // Process one tick of the queue execution
        const result = await processTick(supabase, campaignId, user.id, campaign);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'status': {
        const result = await getStatus(supabase, campaignId, user.id);
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

async function getStatus(supabase: any, campaignId: string, userId: string) {
  const { data: state } = await supabase
    .from('queue_execution_state')
    .select('*')
    .eq('campaign_id', campaignId)
    .maybeSingle();

  const { data: operators } = await supabase
    .from('call_operators')
    .select('id, operator_name, status, current_call_id, personal_interval_seconds, last_call_ended_at')
    .eq('user_id', userId)
    .eq('is_active', true);

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

  const intervalSeconds = campaign.queue_interval_seconds || 30;

  // 0. Self-healing: reset operators stuck on finished/ready calls
  const { data: stuckOps } = await supabase
    .from('call_operators')
    .select('id, current_call_id')
    .eq('user_id', userId)
    .eq('status', 'on_call')
    .eq('is_active', true);

  if (stuckOps) {
    for (const op of stuckOps) {
      if (op.current_call_id) {
        const { data: callLog } = await supabase
          .from('call_logs')
          .select('call_status')
          .eq('id', op.current_call_id)
          .maybeSingle();
        const activeStatuses = ['dialing', 'ringing', 'in_progress'];
        if (!callLog || !activeStatuses.includes(callLog.call_status)) {
          await supabase
            .from('call_operators')
            .update({ status: 'available', current_call_id: null, current_campaign_id: null })
            .eq('id', op.id);
          console.log(`[queue-executor] Freed stuck operator ${op.id}`);
          // Cancel orphaned calls for this operator
          await supabase
            .from('call_logs')
            .update({ call_status: 'cancelled', ended_at: new Date().toISOString() })
            .eq('operator_id', op.id)
            .in('call_status', ['dialing', 'ringing']);
          console.log(`[queue-executor] Cancelled orphaned calls for operator ${op.id}`);
        }
      }
    }
  }

  // 1. Transition cooldown operators to available
  const { data: cooldownOps } = await supabase
    .from('call_operators')
    .select('id, last_call_ended_at, personal_interval_seconds')
    .eq('user_id', userId)
    .eq('status', 'cooldown')
    .eq('is_active', true);

  if (cooldownOps) {
    const now = Date.now();
    for (const op of cooldownOps) {
      const opInterval = op.personal_interval_seconds || intervalSeconds;
      const endedAt = new Date(op.last_call_ended_at).getTime();
      if (now - endedAt >= opInterval * 1000) {
        await supabase
          .from('call_operators')
          .update({ status: 'available', current_call_id: null })
          .eq('id', op.id);
      }
    }
  }

  // 2. Round-robin: fetch ALL active operators in fixed order
  const { data: allActiveOps } = await supabase
    .from('call_operators')
    .select('id, operator_name, extension, status')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

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

  // Find next available operator starting from current_operator_index
  const currentIndex = state.current_operator_index || 0;
  const totalOps = allActiveOps.length;
  let operator: any = null;
  let nextIndex = currentIndex;

  for (let i = 0; i < totalOps; i++) {
    const idx = (currentIndex + i) % totalOps;
    if (allActiveOps[idx].status === 'available') {
      operator = allActiveOps[idx];
      nextIndex = (idx + 1) % totalOps;
      break;
    }
  }

  if (!operator) {
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

  // 3a. Check for existing ready call_logs (from bulk enqueue)
  const { data: readyCallLog } = await supabase
    .from('call_logs')
    .select('id, lead_id, campaign_id')
    .eq('campaign_id', campaignId)
    .eq('call_status', 'ready')
    .order('scheduled_for', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (readyCallLog) {
    // Get lead info for this call_log
    const { data: readyLead } = await supabase
      .from('call_leads')
      .select('id, phone, name')
      .eq('id', readyCallLog.lead_id)
      .maybeSingle();

    // Cancel any active calls from this operator before reassignment
    await supabase
      .from('call_logs')
      .update({ call_status: 'cancelled', ended_at: new Date().toISOString() })
      .eq('operator_id', operator.id)
      .in('call_status', ['dialing', 'ringing', 'in_progress']);

    // Assign operator and update call_log to dialing
    await supabase
      .from('call_logs')
      .update({
        operator_id: operator.id,
        call_status: 'dialing',
        started_at: new Date().toISOString(),
      })
      .eq('id', readyCallLog.id);

    // Update operator status
    await supabase
      .from('call_operators')
      .update({ status: 'on_call', current_call_id: readyCallLog.id, current_campaign_id: campaignId })
      .eq('id', operator.id);

    // Update lead status
    if (readyLead) {
      await supabase
        .from('call_leads')
        .update({
          status: 'calling',
          assigned_operator_id: operator.id,
          last_attempt_at: new Date().toISOString(),
        })
        .eq('id', readyLead.id);
    }

    // Fire webhook
    await fireDialWebhook(supabase, userId, readyCallLog.id, campaignId, campaign, readyLead, operator);

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

  // 3b. Find next pending lead (original logic)
  const { data: nextLead } = await supabase
    .from('call_leads')
    .select('id, phone, name')
    .eq('campaign_id', campaignId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!nextLead) {
    // Queue empty - stop execution
    await supabase
      .from('queue_execution_state')
      .update({ status: 'stopped' })
      .eq('campaign_id', campaignId);

    return { success: true, action: 'completed', reason: 'Queue empty' };
  }

  // 4. Cancel active calls for this operator FIRST (before creating new one)
  await supabase
    .from('call_logs')
    .update({ call_status: 'cancelled', ended_at: new Date().toISOString() })
    .eq('operator_id', operator.id)
    .in('call_status', ['dialing', 'ringing', 'in_progress']);

  // 5. Create call log
  const scheduledFor = new Date().toISOString();

  const { data: callLog, error: logErr } = await supabase
    .from('call_logs')
    .insert({
      user_id: userId,
      campaign_id: campaignId,
      lead_id: nextLead.id,
      operator_id: operator.id,
      call_status: 'dialing',
      scheduled_for: scheduledFor,
    })
    .select('id')
    .single();

  if (logErr) {
    console.error('[queue-executor] Failed to create call log:', logErr);
    return { success: false, error: logErr.message };
  }

  // 6. Update operator status
  await supabase
    .from('call_operators')
    .update({ status: 'on_call', current_call_id: callLog.id, current_campaign_id: campaignId })
    .eq('id', operator.id);

  // 7. Update lead status
  await supabase
    .from('call_leads')
    .update({ 
      status: 'calling',
      assigned_operator_id: operator.id,
      last_attempt_at: new Date().toISOString(),
    })
    .eq('id', nextLead.id);

  // 8. Fire webhook to actually initiate the call
  await fireDialWebhook(supabase, userId, callLog.id, campaignId, campaign, nextLead, operator);

  // 9. Update queue state with round-robin index
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
    const { data: webhookConfig } = await supabase
      .from('webhook_configs')
      .select('url, is_active')
      .eq('user_id', userId)
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

    // Parse response for external_call_id
    try {
      const parsed = JSON.parse(responseText);
      if (Array.isArray(parsed) && parsed[0]?.id) {
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
  }
}
