import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRICE_TO_PLAN: Record<string, { plan: string; credits: number }> = {
  "price_1T8T3zBjVtw2b7OiBecRD1Oa": { plan: "starter", credits: 100 },
  "price_1T8T4YBjVtw2b7OimimbNZ22": { plan: "pro", credits: 500 },
  "price_1T8T4vBjVtw2b7Oi2KQ4OlAI": { plan: "elite", credits: 2000 },
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

function getCurrentPeriodStart(anchorTs: number): Date {
  const anchor = new Date(anchorTs * 1000);
  const now = new Date();
  const anchorDay = anchor.getUTCDate();

  for (let i = 0; i < 13; i++) {
    const targetMonth = now.getUTCMonth() - i;
    const targetYear = now.getUTCFullYear() + Math.floor(targetMonth / 12);
    const targetMon = ((targetMonth % 12) + 12) % 12;
    const daysInMonth = new Date(targetYear, targetMon + 1, 0).getDate();
    const day = Math.min(anchorDay, daysInMonth);
    const candidate = new Date(Date.UTC(targetYear, targetMon, day, anchor.getUTCHours(), anchor.getUTCMinutes(), anchor.getUTCSeconds()));
    if (candidate <= now) {
      return candidate;
    }
  }
  return anchor;
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
    const { data: claimsData, error: userError } = await supabaseClient.auth.getClaims(token);
    if (userError || !claimsData?.claims) throw new Error("Unauthorized");

    const user = { id: claimsData.claims.sub as string, email: claimsData.claims.email as string };
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("plan, credits_used, credits_limit, credits_reset_at")
      .eq("id", user.id)
      .single();

    const customers = await stripe.customers.list({ email: user.email, limit: 10 });
    
    const matchedCustomer = customers.data.find(
      (c) => c.metadata?.supabase_user_id === user.id
    );
    
    if (!matchedCustomer) {
      await supabaseClient
        .from("profiles")
        .update({ plan: "free", credits_limit: 5, credits_used: 0 })
        .eq("id", user.id);

      return new Response(JSON.stringify({ subscribed: false, plan: "free", credits_limit: 5, credits_used: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customerId = matchedCustomer.id;
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
      const anchor = (subscription as any).billing_cycle_anchor;
      const periodStart = anchor ? getCurrentPeriodStart(anchor) : new Date();
      const lastReset = profile?.credits_reset_at ? new Date(profile.credits_reset_at) : new Date(0);

      const isNewPeriod = periodStart > lastReset;

      const updateData: Record<string, any> = { plan: planInfo.plan };

      if (isNewPeriod) {
        updateData.credits_limit = planInfo.credits;
        updateData.credits_used = 0;
        updateData.credits_reset_at = periodStart.toISOString();
      }

      await supabaseClient
        .from("profiles")
        .update(updateData)
        .eq("id", user.id);

      return new Response(JSON.stringify({
        subscribed: true,
        plan: planInfo.plan,
        credits_limit: isNewPeriod ? planInfo.credits : (profile?.credits_limit || planInfo.credits),
        credits_used: isNewPeriod ? 0 : (profile?.credits_used || 0),
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
