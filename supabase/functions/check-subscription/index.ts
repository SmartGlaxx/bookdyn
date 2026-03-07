import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRICE_TO_PLAN: Record<string, { plan: string; credits: number }> = {
  "price_1T8T3zBjVtw2b7OiBecRD1Oa": { plan: "starter", credits: 100 },
  "price_1T8T4YBjVtw2b7OimimbNZ22": { plan: "pro", credits: 500 },
  "price_1T8T4vBjVtw2b7Oi2KQ4OlAI": { plan: "unlimited", credits: 999999 },
};

function safeTimestamp(ts: number | null | undefined): string | null {
  if (!ts || typeof ts !== "number" || ts <= 0) return null;
  try {
    const d = new Date(ts * 1000);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  } catch {
    return null;
  }
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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user?.email) throw new Error("Unauthorized");

    const user = userData.user;
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      await supabaseClient
        .from("profiles")
        .update({ plan: "free", credits_limit: 5, credits_used: 0 })
        .eq("id", user.id);

      return new Response(JSON.stringify({ subscribed: false, plan: "free", credits_limit: 5, credits_used: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      await supabaseClient
        .from("profiles")
        .update({ plan: "free", credits_limit: 5, credits_used: 0 })
        .eq("id", user.id);

      return new Response(JSON.stringify({ subscribed: false, plan: "free", credits_limit: 5, credits_used: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subscription = subscriptions.data[0];
    const priceId = subscription.items.data[0]?.price?.id;
    const planInfo = priceId ? PRICE_TO_PLAN[priceId] : null;

    if (planInfo) {
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("credits_used")
        .eq("id", user.id)
        .single();

      await supabaseClient
        .from("profiles")
        .update({
          plan: planInfo.plan,
          credits_limit: planInfo.credits,
        })
        .eq("id", user.id);

      return new Response(JSON.stringify({
        subscribed: true,
        plan: planInfo.plan,
        credits_limit: planInfo.credits,
        credits_used: profile?.credits_used || 0,
        subscription_end: safeTimestamp(subscription.current_period_end),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ subscribed: false, plan: "free" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("check-subscription error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
