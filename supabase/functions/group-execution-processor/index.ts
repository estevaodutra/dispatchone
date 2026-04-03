import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExecutionList {
  id: string;
  user_id: string;
  campaign_id: string;
  window_type: string;
  window_start_time: string | null;
  window_end_time: string | null;
  window_duration_hours: number | null;
  monitored_events: string[];
  action_type: string;
  webhook_url: string | null;
  message_template: string | null;
  call_campaign_id: string | null;
  current_cycle_id: string;
  current_window_start: string | null;
  current_window_end: string | null;
  is_active: boolean;
  execution_schedule_type: string;
  execution_scheduled_time: string | null;
  execution_days_of_week: number[] | null;
}

interface ExecutionLead {
  id: string;
  phone: string;
  name: string | null;
  origin_event: string | null;
  origin_detail: string | null;
}

function calculateNextWindow(list: ExecutionList): { nextStart: string; nextEnd: string } {
  const now = new Date();

  if (list.window_type === "duration") {
    const hours = list.window_duration_hours || 6;
    const nextStart = list.current_window_end ? new Date(list.current_window_end) : now;
    const nextEnd = new Date(nextStart.getTime() + hours * 60 * 60 * 1000);
    return { nextStart: nextStart.toISOString(), nextEnd: nextEnd.toISOString() };
  }

  // Fixed window: calculate next day's window
  const startParts = (list.window_start_time || "08:00:00").split(":");
  const endParts = (list.window_end_time || "18:00:00").split(":");

  const startH = parseInt(startParts[0]);
  const startM = parseInt(startParts[1] || "0");
  const endH = parseInt(endParts[0]);
  const endM = parseInt(endParts[1] || "0");

  // Start from tomorrow
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(startH, startM, 0, 0);

  const nextEnd = new Date(tomorrow);
  nextEnd.setHours(endH, endM, 0, 0);

  // Handle overnight windows (e.g., 22:00 -> 06:00)
  if (endH < startH || (endH === startH && endM <= startM)) {
    nextEnd.setDate(nextEnd.getDate() + 1);
  }

  return { nextStart: tomorrow.toISOString(), nextEnd: nextEnd.toISOString() };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const forcedListId: string | null = body?.list_id ?? null;

    // Fetch lists ready for execution
    let query = supabase
      .from("group_execution_lists")
      .select("*")
      .eq("is_active", true);

    if (forcedListId) {
      query = query.eq("id", forcedListId);
    } else {
      // We fetch all active lists and filter in code for schedule logic
      query = query;
    }

    const { data: lists, error: listError } = await query;

    if (listError) {
      console.error("[group-execution-processor] Error fetching lists:", listError);
      return new Response(JSON.stringify({ ok: false, error: listError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!lists || lists.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0, message: "No lists ready" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<{ list_id: string; leads_processed: number; errors: number }> = [];

    for (const list of lists as ExecutionList[]) {
      let processed = 0;
      let errors = 0;

      // Fetch pending leads for current cycle
      const { data: leads } = await supabase
        .from("group_execution_leads")
        .select("id, phone, name, origin_event, origin_detail")
        .eq("list_id", list.id)
        .eq("cycle_id", list.current_cycle_id)
        .eq("status", "pending");

      if (leads && leads.length > 0) {
        for (const lead of leads as ExecutionLead[]) {
          try {
            await executeAction(supabaseUrl, supabaseKey, supabase, list, lead);
            await supabase
              .from("group_execution_leads")
              .update({ status: "executed", executed_at: new Date().toISOString() })
              .eq("id", lead.id);
            processed++;
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : "Unknown error";
            await supabase
              .from("group_execution_leads")
              .update({ status: "failed", error_message: errorMsg })
              .eq("id", lead.id);
            errors++;
            console.error(`[group-execution-processor] Lead ${lead.id} failed:`, errorMsg);
          }
        }
      }

      // Calculate next window and new cycle
      const { nextStart, nextEnd } = calculateNextWindow(list);

      await supabase
        .from("group_execution_lists")
        .update({
          last_executed_at: new Date().toISOString(),
          current_cycle_id: crypto.randomUUID(),
          current_window_start: nextStart,
          current_window_end: nextEnd,
          updated_at: new Date().toISOString(),
        })
        .eq("id", list.id);

      results.push({ list_id: list.id, leads_processed: processed, errors });
      console.log(`[group-execution-processor] List ${list.id}: ${processed} executed, ${errors} failed`);
    }

    return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[group-execution-processor] Error:", msg);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function executeAction(
  supabaseUrl: string,
  supabaseKey: string,
  supabase: ReturnType<typeof createClient>,
  list: ExecutionList,
  lead: ExecutionLead
): Promise<void> {
  switch (list.action_type) {
    case "webhook": {
      if (!list.webhook_url) throw new Error("No webhook URL configured");
      const resp = await fetch(list.webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: lead.phone,
          name: lead.name,
          origin_event: lead.origin_event,
          origin_detail: lead.origin_detail,
          campaign_id: list.campaign_id,
          cycle_id: list.current_cycle_id,
          executed_at: new Date().toISOString(),
        }),
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Webhook returned ${resp.status}: ${text.slice(0, 200)}`);
      }
      await resp.text();
      break;
    }

    case "message": {
      if (!list.message_template) throw new Error("No message template configured");
      const message = list.message_template
        .replace(/\{\{name\}\}/g, lead.name || "")
        .replace(/\{\{phone\}\}/g, lead.phone);

      // Get campaign instance
      const { data: campaign } = await supabase
        .from("group_campaigns")
        .select("instance_id")
        .eq("id", list.campaign_id)
        .maybeSingle();

      if (!campaign?.instance_id) throw new Error("Campaign has no instance");

      const { data: instance } = await supabase
        .from("instances")
        .select("external_instance_id, external_instance_token")
        .eq("id", campaign.instance_id)
        .maybeSingle();

      if (!instance?.external_instance_id || !instance?.external_instance_token) {
        throw new Error("Instance credentials not found");
      }

      const zapiUrl = `https://api.z-api.io/instances/${instance.external_instance_id}/token/${instance.external_instance_token}/send-text`;
      const resp = await fetch(zapiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Client-Token": Deno.env.get("ZAPI_CLIENT_TOKEN") || "" },
        body: JSON.stringify({ phone: lead.phone, message }),
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Z-API returned ${resp.status}: ${text.slice(0, 200)}`);
      }
      await resp.text();
      break;
    }

    case "call": {
      if (!list.call_campaign_id) throw new Error("No call campaign configured");

      // Get call campaign to find user_id
      const { data: callCampaign } = await supabase
        .from("call_campaigns")
        .select("id, user_id, company_id")
        .eq("id", list.call_campaign_id)
        .maybeSingle();

      if (!callCampaign) throw new Error("Call campaign not found");

      const { error: insertError } = await supabase.from("call_queue").insert({
        campaign_id: list.call_campaign_id,
        user_id: callCampaign.user_id,
        company_id: callCampaign.company_id,
        phone: lead.phone,
        lead_name: lead.name,
        source: "execution_list",
        status: "waiting",
      });

      if (insertError) throw new Error(`Insert to call_queue failed: ${insertError.message}`);
      break;
    }

    default:
      throw new Error(`Unknown action type: ${list.action_type}`);
  }
}
