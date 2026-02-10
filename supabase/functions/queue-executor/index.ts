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
      .select('id, queue_execution_enabled, queue_interval_seconds, queue_unavailable_behavior')
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
    .from('call_campaign_operators')
    .select('id, operator_name, status, current_call_id, personal_interval_seconds, last_call_ended_at')
    .eq('campaign_id', campaignId)
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

  if (!state || state.status !== 'running') {
    return { success: true, action: 'none', reason: 'Queue not running' };
  }

  const intervalSeconds = campaign.queue_interval_seconds || 30;

  // 1. Transition cooldown operators to available
  const { data: cooldownOps } = await supabase
    .from('call_campaign_operators')
    .select('id, last_call_ended_at, personal_interval_seconds')
    .eq('campaign_id', campaignId)
    .eq('status', 'cooldown')
    .eq('is_active', true);

  if (cooldownOps) {
    const now = Date.now();
    for (const op of cooldownOps) {
      const opInterval = op.personal_interval_seconds || intervalSeconds;
      const endedAt = new Date(op.last_call_ended_at).getTime();
      if (now - endedAt >= opInterval * 1000) {
        await supabase
          .from('call_campaign_operators')
          .update({ status: 'available', current_call_id: null })
          .eq('id', op.id);
      }
    }
  }

  // 2. Find available operator (longest idle time)
  const { data: availableOps } = await supabase
    .from('call_campaign_operators')
    .select('id, operator_name, extension')
    .eq('campaign_id', campaignId)
    .eq('status', 'available')
    .eq('is_active', true)
    .order('last_call_ended_at', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: true })
    .limit(1);

  if (!availableOps || availableOps.length === 0) {
    // No operator available
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

  const operator = availableOps[0];

  // 3. Find next pending lead
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

  // 4. Create call log and update statuses
  const scheduledFor = new Date().toISOString(); // Immediate

  const { data: callLog, error: logErr } = await supabase
    .from('call_logs')
    .insert({
      user_id: userId,
      campaign_id: campaignId,
      lead_id: nextLead.id,
      operator_id: operator.id,
      call_status: 'scheduled',
      scheduled_for: scheduledFor,
    })
    .select('id')
    .single();

  if (logErr) {
    console.error('[queue-executor] Failed to create call log:', logErr);
    return { success: false, error: logErr.message };
  }

  // Update operator status
  await supabase
    .from('call_campaign_operators')
    .update({ status: 'on_call', current_call_id: callLog.id })
    .eq('id', operator.id);

  // Update lead status
  await supabase
    .from('call_leads')
    .update({ 
      status: 'calling',
      assigned_operator_id: operator.id,
      last_attempt_at: new Date().toISOString(),
    })
    .eq('id', nextLead.id);

  // Update queue state
  await supabase
    .from('queue_execution_state')
    .update({
      last_dial_at: new Date().toISOString(),
      calls_made: (state.calls_made || 0) + 1,
      current_position: (state.current_position || 0) + 1,
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
