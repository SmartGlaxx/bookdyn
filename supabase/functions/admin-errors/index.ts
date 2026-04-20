import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isAdminEmail } from "../_shared/admin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth
      .getUser();
    if (userError || !user || !isAdminEmail(user.email)) {
      return json({ error: "Forbidden" }, 403);
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const body = await req.json().catch(() => ({}));
    const action = body.action ?? "list";

    if (action === "list") {
      const source = body.source ?? "all"; // 'all' | 'frontend' | 'edge_function'
      const limit = Math.min(Number(body.limit ?? 100), 500);
      let query = admin
        .from("error_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (source !== "all") query = query.eq("source", source);
      const { data, error } = await query;
      if (error) throw error;
      return json(data);
    }

    if (action === "delete_old") {
      const days = Math.max(1, Number(body.days ?? 30));
      const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
      const { error } = await admin
        .from("error_logs")
        .delete()
        .lt("created_at", cutoff);
      if (error) throw error;
      return json({ ok: true });
    }

    return json({ error: "Invalid action" }, 400);
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }

  function json(payload: unknown, status = 200) {
    return new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
