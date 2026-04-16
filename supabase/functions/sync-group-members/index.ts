import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface N8nEnteredMember {
  phone: string;
  name?: string;
  isAdmin?: boolean;
}

interface N8nLeftMember {
  phone: string;
}

interface N8nSyncResponse {
  entered: N8nEnteredMember[];
  left: N8nLeftMember[];
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

    const { groupJid, campaignId, instanceId, userId, trigger, senderLid } = await req.json();

    if (!groupJid || !campaignId || !instanceId || !userId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[sync-group-members] Starting sync for group ${groupJid}, campaign ${campaignId}, trigger: ${trigger}`);

    // 1. Fetch instance credentials
    const { data: inst, error: instErr } = await supabase
      .from("instances")
      .select("external_instance_id, external_instance_token")
      .eq("id", instanceId)
      .single();

    if (instErr || !inst?.external_instance_id || !inst?.external_instance_token) {
      console.error("[sync-group-members] Instance not found:", instErr);
      return new Response(
        JSON.stringify({ success: false, error: "Instance credentials not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Fetch current active members from DB
    const { data: dbMembers } = await supabase
      .from("group_members")
      .select("id, phone, name, status")
      .eq("group_campaign_id", campaignId)
      .eq("status", "active");

    const currentMembers = (dbMembers || [])
      .filter((m: any) => m.phone)
      .map((m: any) => ({ phone: m.phone, name: m.name || null, status: m.status }));

    console.log(`[sync-group-members] ${currentMembers.length} active members in DB`);

    // 3. Normalize groupJid and POST to n8n for triage
    const zapiGroupJid = groupJid.includes("-group")
      ? groupJid.replace("-group", "@g.us")
      : groupJid;

    const n8nUrl = "https://n8n-n8n.nuwfic.easypanel.host/webhook/groups";
    console.log(`[sync-group-members] Sending ${currentMembers.length} members to n8n for triage`);

    const n8nResp = await fetch(n8nUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "group.sync",
        instanceId: inst.external_instance_id,
        instanceToken: inst.external_instance_token,
        groupJid: zapiGroupJid,
        campaignId,
        currentMembers,
      }),
    });

    if (!n8nResp.ok) {
      const errText = await n8nResp.text();
      console.error(`[sync-group-members] n8n error ${n8nResp.status}: ${errText}`);
      return new Response(
        JSON.stringify({ success: false, error: `n8n error: ${n8nResp.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result: N8nSyncResponse = await n8nResp.json();
    const entered = result.entered || [];
    const left = result.left || [];

    console.log(`[sync-group-members] n8n returned: entered=${entered.length}, left=${left.length}`);

    // 4. Process new members (entered)
    if (entered.length > 0) {
      const newMemberRecords = entered.map((p) => ({
        group_campaign_id: campaignId,
        user_id: userId,
        phone: p.phone,
        lid: null as string | null,
        name: p.name || null,
        is_admin: p.isAdmin || false,
        status: "active",
        joined_at: new Date().toISOString(),
        left_at: null as string | null,
      }));

      for (let i = 0; i < newMemberRecords.length; i += 100) {
        const chunk = newMemberRecords.slice(i, i + 100);
        const { error: upsertErr } = await supabase
          .from("group_members")
          .upsert(chunk, { onConflict: "group_campaign_id,phone" });
        if (upsertErr) {
          console.error(`[sync-group-members] Upsert members error (chunk ${i}):`, upsertErr);
        }
      }

      const historyRecords = entered.map((p) => ({
        group_campaign_id: campaignId,
        user_id: userId,
        member_phone: p.phone,
        action: "join",
      }));

      for (let i = 0; i < historyRecords.length; i += 100) {
        await supabase.from("group_member_history").insert(historyRecords.slice(i, i + 100));
      }

      const leadRecords = entered.map((p) => ({
        user_id: userId,
        phone: p.phone,
        name: p.name || null,
        active_campaign_id: campaignId,
        active_campaign_type: "grupos",
        status: "active",
      }));

      for (let i = 0; i < leadRecords.length; i += 100) {
        await supabase
          .from("leads")
          .upsert(leadRecords.slice(i, i + 100), { onConflict: "phone,user_id", ignoreDuplicates: false });
      }
    }

    // 5. Process members who left
    if (left.length > 0) {
      const now = new Date().toISOString();
      const leftPhones = left.map((p) => p.phone);

      for (let i = 0; i < leftPhones.length; i += 100) {
        const chunk = leftPhones.slice(i, i + 100);
        await supabase
          .from("group_members")
          .update({ status: "left", left_at: now })
          .eq("group_campaign_id", campaignId)
          .in("phone", chunk);
      }

      const leaveHistory = left.map((p) => ({
        group_campaign_id: campaignId,
        user_id: userId,
        member_phone: p.phone,
        action: "leave",
      }));

      for (let i = 0; i < leaveHistory.length; i += 100) {
        await supabase.from("group_member_history").insert(leaveHistory.slice(i, i + 100));
      }
    }

    // 6. Try to resolve senderLid if provided
    let resolvedPhone: string | null = null;
    if (senderLid && entered.length === 1) {
      resolvedPhone = entered[0].phone;
      console.log(`[sync-group-members] Resolved LID ${senderLid} -> phone ${resolvedPhone}`);

      await supabase
        .from("group_members")
        .update({ lid: senderLid })
        .eq("group_campaign_id", campaignId)
        .eq("phone", resolvedPhone);
    }

    return new Response(
      JSON.stringify({
        success: true,
        entered: entered.length,
        left: left.length,
        total: currentMembers.length + entered.length - left.length,
        resolvedPhone,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("[sync-group-members] Error:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
