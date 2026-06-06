import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLAN_PRICES: Record<string, string> = {
  starter: "price_1T8T3zBjVtw2b7OiBecRD1Oa",
  pro: "price_1T8T4YBjVtw2b7OimimbNZ22",
  elite: "price_1T8T4vBjVtw2b7Oi2KQ4OlAI",
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
    if (!authHeader) throw new Error("No auth header");

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: authError } = await supabaseClient.auth.getClaims(token);
    if (authError || !claimsData?.claims) throw new Error("Unauthorized");

    const user = { id: claimsData.claims.sub as string, email: claimsData.claims.email as string };
    const { planId } = await req.json();
    // Support legacy "unlimited" plan ID mapping to "elite"
    const normalizedPlanId = planId === "unlimited" ? "elite" : planId;
    const priceId = PLAN_PRICES[normalizedPlanId];
    if (!priceId) throw new Error("Invalid plan");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const customers = await stripe.customers.list({ email: user.email, limit: 10 });
    let customerId: string | undefined;
    
    const matchedCustomer = customers.data.find(
      (c) => c.metadata?.supabase_user_id === user.id
    );
    
    if (matchedCustomer) {
      customerId = matchedCustomer.id;
    } else if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      await stripe.customers.update(customerId, {
        metadata: { supabase_user_id: user.id },
      });
    }

    const origin = safeOrigin(req);

    const sessionParams: any = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        supabase_user_id: user.id,
        plan_id: normalizedPlanId,
      },
      subscription_data: {
        metadata: { supabase_user_id: user.id },
      },
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/dashboard?checkout=cancelled`,
    };

    if (!customerId) {
      sessionParams.customer_creation = "always";
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Checkout error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
