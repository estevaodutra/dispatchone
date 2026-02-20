import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function getBrasiliaDate(): Date {
  const now = new Date();
  const brasiliaOffset = -3 * 60; // UTC-3 in minutes
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcMs + brasiliaOffset * 60000);
}

function getNextBusinessDay(brasiliaDate: Date): Date {
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
  const hour = Math.floor(Math.random() * 11) + 9; // 9 to 19
  const minute = Math.floor(Math.random() * 60);    // 0 to 59

  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, "0");
  const day = String(targetDate.getDate()).padStart(2, "0");
  const h = String(hour).padStart(2, "0");
  const m = String(minute).padStart(2, "0");

  // Return as Brasilia time (UTC-3)
  return `${year}-${month}-${day}T${h}:${m}:00-03:00`;
}

function generateSameDayScheduledFor(brasiliaDate: Date): string {
  // Schedule for now + 2 hours
  const scheduled = new Date(brasiliaDate);
  scheduled.setHours(brasiliaDate.getHours() + 2);
  // Add some random minutes (0-30) to spread load
  scheduled.setMinutes(brasiliaDate.getMinutes() + Math.floor(Math.random() * 30));

  const year = scheduled.getFullYear();
  const month = String(scheduled.getMonth() + 1).padStart(2, "0");
  const day = String(scheduled.getDate()).padStart(2, "0");
  const h = String(scheduled.getHours()).padStart(2, "0");
  const m = String(scheduled.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${h}:${m}:00-03:00`;
}

function computeScheduledFor(): string {
  const brasiliaDate = getBrasiliaDate();
  const hourBRT = brasiliaDate.getHours();

  // If before 20h BRT and now + 2h would be before 19h -> same day
  if (hourBRT < 20 && (hourBRT + 2) < 19) {
    return generateSameDayScheduledFor(brasiliaDate);
  }

  // Otherwise -> next business day with random time
  const nextDay = getNextBusinessDay(brasiliaDate);
  return generateRandomScheduledFor(nextDay);
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

        // Check reschedule limit (max 3 attempts)
        const { count: rescheduleCount } = await supabase
          .from("call_logs")
          .select("*", { count: "exact", head: true })
          .eq("lead_id", call.lead_id)
          .eq("campaign_id", call.campaign_id)
          .ilike("call_status", "%_rescheduled");

        if ((rescheduleCount || 0) >= 3) {
          console.log(`Lead ${call.lead_id}: reschedule limit reached (${rescheduleCount}/3), skipping`);
          // Mark as rescheduled to avoid re-processing
          await supabase
            .from("call_logs")
            .update({ call_status: `${call.call_status}_rescheduled` })
            .eq("id", call.id);
          continue;
        }

        // Fetch active operators for this campaign
        const { data: activeOperators } = await supabase
          .from("call_operators")
          .select("id")
          .eq("user_id", call.user_id)
          .eq("is_active", true)
          .order("created_at", { ascending: true });

        // Pick operator with fewest assigned calls (round-robin)
        let newOperatorId = call.operator_id;
        if (activeOperators && activeOperators.length > 0) {
          let minCount = Infinity;
          for (const op of activeOperators) {
            const { count } = await supabase
              .from("call_logs")
              .select("*", { count: "exact", head: true })
              .eq("operator_id", op.id)
              .eq("campaign_id", call.campaign_id);
            const c = count || 0;
            if (c < minCount) {
              minCount = c;
              newOperatorId = op.id;
            }
          }
        }

        // Use smart scheduling: same day if possible, next business day otherwise
        const scheduledFor = computeScheduledFor();

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

    const brasiliaDateForLog = getBrasiliaDate();
    const result = {
      message: `Rescheduled ${rescheduledCount} calls (BRT: ${brasiliaDateForLog.toISOString().split("T")[0]})`,
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
