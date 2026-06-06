import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_ORIGINS = [
  "https://bookdyn.com",
  "https://bookdyn.lovable.app",
  "https://app.authoryti.com",
  "https://id-preview--50948d4c-97c6-4338-a33a-59e9cf03b7c0.lovable.app",
];

function safeOrigin(req: Request): string {
  const o = req.headers.get("origin") ?? "";
  if (ALLOWED_ORIGINS.includes(o)) return o;
  if (/^https:\/\/[a-z0-9-]+\.lovableproject\.com$/.test(o)) return o;
  if (/^https:\/\/id-preview--[a-z0-9-]+\.lovable\.app$/.test(o)) return o;
  return ALLOWED_ORIGINS[0];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Stripe not configured");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: userError } = await supabaseClient.auth.getClaims(token);
    if (userError || !claimsData?.claims) throw new Error("Unauthorized");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: claimsData.claims.email as string, limit: 1 });
    if (customers.data.length === 0) throw new Error("No Stripe customer found");

    const origin = safeOrigin(req);
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: `${origin}/dashboard`,
    });

    return new Response(JSON.stringify({ url: portalSession.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
