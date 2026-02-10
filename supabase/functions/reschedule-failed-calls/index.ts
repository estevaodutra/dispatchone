import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function getNextBusinessDay(): Date {
  const now = new Date();
  // Convert to Brasilia time to determine the current day of week
  const brasiliaOffset = -3 * 60; // UTC-3 in minutes
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const brasiliaDate = new Date(utcMs + brasiliaOffset * 60000);

  const dayOfWeek = brasiliaDate.getDay(); // 0=Sun, 5=Fri, 6=Sat
  let daysToAdd: number;

  if (dayOfWeek === 5) daysToAdd = 3;      // Fri -> Mon
  else if (dayOfWeek === 6) daysToAdd = 2;  // Sat -> Mon
  else if (dayOfWeek === 0) daysToAdd = 1;  // Sun -> Mon
  else daysToAdd = 1;                        // Mon-Thu -> next day

  const nextDay = new Date(brasiliaDate);
  nextDay.setDate(brasiliaDate.getDate() + daysToAdd);
  return nextDay;
}

function generateRandomScheduledFor(targetDate: Date): string {
  const hour = Math.floor(Math.random() * 10) + 9; // 9 to 18
  const minute = Math.floor(Math.random() * 60);    // 0 to 59

  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, "0");
  const day = String(targetDate.getDate()).padStart(2, "0");
  const h = String(hour).padStart(2, "0");
  const m = String(minute).padStart(2, "0");

  // Return as Brasilia time (UTC-3)
  return `${year}-${month}-${day}T${h}:${m}:00-03:00`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const failedStatuses = [
      "no_answer",
      "busy",
      "failed",
      "voicemail",
      "timeout",
      "not_found",
    ];

    // Get all failed call logs that don't already have a rescheduled follow-up
    const { data: failedCalls, error: fetchError } = await supabase
      .from("call_logs")
      .select("id, campaign_id, lead_id, operator_id, user_id, call_status")
      .in("call_status", failedStatuses);

    if (fetchError) {
      throw new Error(`Error fetching failed calls: ${fetchError.message}`);
    }

    if (!failedCalls || failedCalls.length === 0) {
      return new Response(
        JSON.stringify({ message: "No failed calls to reschedule", rescheduled: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const nextBusinessDay = getNextBusinessDay();
    let rescheduledCount = 0;
    const errors: string[] = [];

    for (const call of failedCalls) {
      try {
        // Check if there's already a scheduled call for this lead in this campaign
        const { data: existing } = await supabase
          .from("call_logs")
          .select("id")
          .eq("lead_id", call.lead_id)
          .eq("campaign_id", call.campaign_id)
          .eq("call_status", "scheduled")
          .limit(1);

        if (existing && existing.length > 0) {
          continue;
        }

        // Fetch active operators for this campaign
        const { data: activeOperators } = await supabase
          .from("call_campaign_operators")
          .select("id")
          .eq("campaign_id", call.campaign_id)
          .eq("is_active", true);

        // Pick a random active operator, fallback to original
        const newOperatorId = activeOperators && activeOperators.length > 0
          ? activeOperators[Math.floor(Math.random() * activeOperators.length)].id
          : call.operator_id;

        const scheduledFor = generateRandomScheduledFor(nextBusinessDay);

        // Create new scheduled call_log with random operator
        const { error: insertError } = await supabase
          .from("call_logs")
          .insert({
            campaign_id: call.campaign_id,
            lead_id: call.lead_id,
            operator_id: newOperatorId,
            user_id: call.user_id,
            call_status: "scheduled",
            scheduled_for: scheduledFor,
          });

        if (insertError) {
          errors.push(`Lead ${call.lead_id}: ${insertError.message}`);
          continue;
        }

        // Update lead status and assigned operator
        if (call.lead_id) {
          await supabase
            .from("call_leads")
            .update({ status: "pending", assigned_operator_id: newOperatorId })
            .eq("id", call.lead_id);
        }

        // Mark original call as rescheduled so it won't be picked up again
        await supabase
          .from("call_logs")
          .update({ call_status: `${call.call_status}_rescheduled` })
          .eq("id", call.id);

        rescheduledCount++;
      } catch (e) {
        errors.push(`Call ${call.id}: ${e.message}`);
      }
    }

    const result = {
      message: `Rescheduled ${rescheduledCount} calls for ${nextBusinessDay.toISOString().split("T")[0]}`,
      rescheduled: rescheduledCount,
      total_failed: failedCalls.length,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log(JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Reschedule error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
