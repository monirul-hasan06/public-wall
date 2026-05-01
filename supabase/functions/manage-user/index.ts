import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    if (!token) return json({ error: "Unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: callerData, error: callerError } = await userClient.auth.getUser();
    if (callerError || !callerData.user) return json({ error: "Invalid session" }, 401);

    const admin = createClient(url, service);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("id")
      .eq("user_id", callerData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Forbidden — admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");
    const userId = String(body.userId || "");
    const profileId = String(body.profileId || "");
    if (!userId || !profileId) return json({ error: "Missing user" }, 400);
    if (userId === callerData.user.id) return json({ error: "নিজের আইডিতে এই কাজ করা যাবে না" }, 400);

    const { data: targetAdmin } = await admin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (targetAdmin) return json({ error: "অন্য অ্যাডমিনের আইডিতে এই কাজ করা যাবে না" }, 400);

    if (action === "pause") {
      const permanent = Boolean(body.permanent);
      const pausedUntil = body.pausedUntil ? new Date(String(body.pausedUntil)).toISOString() : null;
      const reason = String(body.reason || "").trim().slice(0, 500) || null;
      if (!permanent && !pausedUntil) return json({ error: "সময় নির্বাচন করুন" }, 400);
      const { error } = await admin.from("user_moderation").upsert({
        user_id: userId,
        profile_id: profileId,
        permanently_paused: permanent,
        paused_until: permanent ? null : pausedUntil,
        reason,
        updated_by: callerData.user.id,
      });
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "unpause") {
      const { error } = await admin.from("user_moderation").delete().eq("user_id", userId);
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "warn") {
      const message = String(body.message || "").trim();
      if (!message) return json({ error: "সতর্কবার্তা লিখুন" }, 400);
      const { error } = await admin.from("user_warnings").insert({
        user_id: userId,
        profile_id: profileId,
        message: message.slice(0, 1000),
        created_by: callerData.user.id,
      });
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "delete") {
      await admin.from("user_roles").delete().eq("user_id", userId);
      await admin.from("profiles").delete().eq("id", profileId);
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw error;
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: String(e?.message || e) }, 500);
  }
});
