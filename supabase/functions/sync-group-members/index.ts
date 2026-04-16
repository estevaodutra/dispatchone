import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ZAPIParticipant {
  phone?: string;
  id?: string;
  name?: string;
  short?: string;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
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
      console.error("[sync-group-members] Instance not found or missing credentials:", instErr);
      return new Response(
        JSON.stringify({ success: false, error: "Instance credentials not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Call Z-API to get group metadata with full participant list
    // Convert groupJid from internal format (-group) to Z-API format (@g.us)
    const zapiGroupJid = groupJid.includes("-group")
      ? groupJid.replace("-group", "@g.us")
      : groupJid;

    const zapiUrl = `https://api.z-api.io/instances/${inst.external_instance_id}/token/${inst.external_instance_token}/group-metadata/${zapiGroupJid}`;
    console.log(`[sync-group-members] Calling Z-API: GET /group-metadata/${zapiGroupJid}`);

    const clientToken = Deno.env.get("ZAPI_CLIENT_TOKEN") || "";
    const zapiResp = await fetch(zapiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Client-Token": clientToken,
      },
    });

    if (!zapiResp.ok) {
      const errText = await zapiResp.text();
      console.error(`[sync-group-members] Z-API error ${zapiResp.status}: ${errText}`);
      return new Response(
        JSON.stringify({ success: false, error: `Z-API error: ${zapiResp.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const metadata = await zapiResp.json();
    const participants: ZAPIParticipant[] = metadata.participants || [];
    console.log(`[sync-group-members] Z-API returned ${participants.length} participants`);

    // 3. Extract valid phone numbers from Z-API participants
    const zapiMembers = new Map<string, ZAPIParticipant>();
    for (const p of participants) {
      const rawPhone = p.phone || (p.id ? p.id.split("@")[0] : null);
      if (!rawPhone) continue;
      const cleanPhone = rawPhone.replace(/\D/g, "");
      // Skip if it looks like a LID (not a real phone) or too short
      if (cleanPhone.length < 8) continue;
      // Skip LIDs that snuck in
      if (p.id?.includes("@lid")) continue;
      zapiMembers.set(cleanPhone, p);
    }

    console.log(`[sync-group-members] ${zapiMembers.size} valid phone numbers extracted`);

    // 4. Fetch current active members from DB
    const { data: dbMembers } = await supabase
      .from("group_members")
      .select("id, phone, lid, status")
      .eq("group_campaign_id", campaignId)
      .eq("status", "active");

    const dbPhones = new Map<string, { id: string; phone: string | null; lid: string | null }>();
    for (const m of (dbMembers || [])) {
      if (m.phone) {
        dbPhones.set(m.phone, { id: m.id, phone: m.phone, lid: m.lid });
      }
    }

    console.log(`[sync-group-members] ${dbPhones.size} active members with phone in DB`);

    // 5. Compare: find who entered and who left
    const entered: string[] = [];
    const left: string[] = [];

    for (const phone of zapiMembers.keys()) {
      if (!dbPhones.has(phone)) {
        entered.push(phone);
      }
    }

    for (const phone of dbPhones.keys()) {
      if (!zapiMembers.has(phone)) {
        left.push(phone);
      }
    }

    console.log(`[sync-group-members] Entered: ${entered.length}, Left: ${left.length}`);

    // 6. Process new members (entered)
    if (entered.length > 0) {
      const newMemberRecords = entered.map((phone) => {
        const p = zapiMembers.get(phone)!;
        return {
          group_campaign_id: campaignId,
          user_id: userId,
          phone: phone,
          lid: null as string | null,
          name: p.name || p.short || null,
          is_admin: p.isAdmin || p.isSuperAdmin || false,
          status: "active",
          joined_at: new Date().toISOString(),
          left_at: null as string | null,
        };
      });

      // Batch upsert in chunks of 100
      for (let i = 0; i < newMemberRecords.length; i += 100) {
        const chunk = newMemberRecords.slice(i, i + 100);
        const { error: upsertErr } = await supabase
          .from("group_members")
          .upsert(chunk, { onConflict: "group_campaign_id,phone" });

        if (upsertErr) {
          console.error(`[sync-group-members] Upsert members error (chunk ${i}):`, upsertErr);
        }
      }

      // Record history
      const historyRecords = entered.map((phone) => ({
        group_campaign_id: campaignId,
        user_id: userId,
        member_phone: phone,
        action: "join",
      }));

      for (let i = 0; i < historyRecords.length; i += 100) {
        await supabase.from("group_member_history").insert(historyRecords.slice(i, i + 100));
      }

      // Upsert leads
      const leadRecords = entered.map((phone) => {
        const p = zapiMembers.get(phone)!;
        return {
          user_id: userId,
          phone: phone,
          name: p.name || p.short || null,
          active_campaign_id: campaignId,
          active_campaign_type: "grupos",
          status: "active",
        };
      });

      for (let i = 0; i < leadRecords.length; i += 100) {
        await supabase
          .from("leads")
          .upsert(leadRecords.slice(i, i + 100), { onConflict: "phone,user_id", ignoreDuplicates: false });
      }
    }

    // 7. Process members who left
    if (left.length > 0) {
      const now = new Date().toISOString();

      // Update status in chunks
      for (let i = 0; i < left.length; i += 100) {
        const chunk = left.slice(i, i + 100);
        await supabase
          .from("group_members")
          .update({ status: "left", left_at: now })
          .eq("group_campaign_id", campaignId)
          .in("phone", chunk);
      }

      // Record history
      const leaveHistory = left.map((phone) => ({
        group_campaign_id: campaignId,
        user_id: userId,
        member_phone: phone,
        action: "leave",
      }));

      for (let i = 0; i < leaveHistory.length; i += 100) {
        await supabase.from("group_member_history").insert(leaveHistory.slice(i, i + 100));
      }
    }

    // 8. Try to resolve senderLid if provided — return the resolved phone for downstream use
    let resolvedPhone: string | null = null;
    if (senderLid) {
      const lidNumeric = senderLid.split("@")[0];
      // Check if any participant matches this LID
      // Z-API metadata doesn't directly map LIDs, but we can check if the diff gives us a clue
      // If exactly one person entered, it's likely the person who triggered the event
      if (entered.length === 1) {
        resolvedPhone = entered[0];
        console.log(`[sync-group-members] Resolved LID ${senderLid} -> phone ${resolvedPhone} (single new member)`);

        // Update the LID on the member record
        await supabase
          .from("group_members")
          .update({ lid: senderLid })
          .eq("group_campaign_id", campaignId)
          .eq("phone", resolvedPhone);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        entered: entered.length,
        left: left.length,
        total: zapiMembers.size,
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
