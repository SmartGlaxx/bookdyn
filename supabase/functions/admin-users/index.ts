import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isAdminEmail } from "../_shared/admin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Admin user management:
//  - action: "search" — find users by email substring
//  - action: "override_link" — generate a one-time recovery (override) link for target user
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: adminUser }, error: userError } = await userClient
      .auth.getUser();
    if (userError || !adminUser || !isAdminEmail(adminUser.email)) {
      return json({ error: "Forbidden" }, 403);
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const body = await req.json().catch(() => ({}));
    const action = body.action;

    if (action === "search") {
      const q = String(body.query ?? "").trim().toLowerCase();
      // List recent users (admin API) and filter by email substring.
      const perPage = 200;
      const { data, error } = await admin.auth.admin.listUsers({
        page: 1,
        perPage,
      });
      if (error) throw error;
      let users = data.users.map((u) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
      }));
      if (q) users = users.filter((u) => (u.email ?? "").toLowerCase().includes(q));
      return json(users.slice(0, 50));
    }

    if (action === "override_link") {
      const targetEmail = String(body.email ?? "").trim().toLowerCase();
      const reason = body.reason ? String(body.reason).slice(0, 500) : null;
      const redirectTo = body.redirectTo
        ? String(body.redirectTo)
        : `${new URL(req.url).origin}/admin/override-callback`;

      if (!targetEmail) return json({ error: "Email required" }, 400);

      // Look up target user
      const { data: list, error: listErr } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      if (listErr) throw listErr;
      const target = list.users.find((u) =>
        (u.email ?? "").toLowerCase() === targetEmail
      );
      if (!target) return json({ error: "User not found" }, 404);

      // Generate a recovery link (works for existing users; signs them in to set a session).
      const { data: linkData, error: linkErr } = await admin.auth.admin
        .generateLink({
          type: "magiclink",
          email: targetEmail,
          options: { redirectTo },
        });
      if (linkErr) throw linkErr;

      // Audit log
      await admin.from("admin_override_log").insert({
        admin_user_id: adminUser.id,
        admin_email: adminUser.email!,
        target_user_id: target.id,
        target_email: targetEmail,
        reason,
      });

      return json({
        link: linkData.properties?.action_link,
        target: { id: target.id, email: target.email },
      });
    }

    if (action === "list_overrides") {
      const limit = Math.min(Number(body.limit ?? 100), 500);
      const { data, error } = await admin
        .from("admin_override_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return json(data);
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
