import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://authoryti.com",
  "https://authoryti.lovable.app",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  // Allow exact matches and *.lovableproject.com preview origins
  const isAllowed =
    ALLOWED_ORIGINS.includes(origin) ||
    /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/.test(origin) ||
    /^https:\/\/id-preview--[a-z0-9-]+\.lovable\.app$/.test(origin);
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    if (req.method === "GET") {
      const { count, error } = await supabase
        .from("waitlist")
        .select("*", { count: "exact", head: true });

      if (error) throw error;

      return new Response(JSON.stringify({ count: count ?? 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const source = typeof body.source === "string" ? body.source.slice(0, 100) : "waitlist_page";

      // Simple email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        return new Response(JSON.stringify({ error: "invalid_email" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if already exists
      const { data: existing } = await supabase
        .from("waitlist")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (existing) {
        const { count } = await supabase
          .from("waitlist")
          .select("*", { count: "exact", head: true });

        return new Response(
          JSON.stringify({
            error: "already_exists",
            message: "You are already on the waitlist.",
            count: count ?? 0,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: insertError } = await supabase
        .from("waitlist")
        .insert({ email, source });

      if (insertError) throw insertError;

      const { count } = await supabase
        .from("waitlist")
        .select("*", { count: "exact", head: true });

      return new Response(JSON.stringify({ success: true, count: count ?? 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("waitlist error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
