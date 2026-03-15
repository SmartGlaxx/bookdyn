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
  unlimited: "price_1T8T4vBjVtw2b7Oi2KQ4OlAI",
};

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
    const { data: userData, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !userData.user?.email) throw new Error("Unauthorized");

    const user = userData.user;
    const { planId } = await req.json();
    const priceId = PLAN_PRICES[planId];
    if (!priceId) throw new Error("Invalid plan");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check for existing Stripe customer with matching supabase_user_id
    const customers = await stripe.customers.list({ email: user.email, limit: 10 });
    let customerId: string | undefined;
    
    // Find customer with matching supabase_user_id, or first one
    const matchedCustomer = customers.data.find(
      (c) => c.metadata?.supabase_user_id === user.id
    );
    
    if (matchedCustomer) {
      customerId = matchedCustomer.id;
    } else if (customers.data.length > 0) {
      // Update existing customer with supabase_user_id metadata
      customerId = customers.data[0].id;
      await stripe.customers.update(customerId, {
        metadata: { supabase_user_id: user.id },
      });
    }

    const origin = req.headers.get("origin") || "https://localhost:3000";

    const sessionParams: any = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        supabase_user_id: user.id,
        plan_id: planId,
      },
      subscription_data: {
        metadata: { supabase_user_id: user.id },
      },
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/dashboard?checkout=cancelled`,
    };

    // If no existing customer, set metadata on the new customer that Stripe will create
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
