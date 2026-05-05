import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CREDITS_PER_DOLLAR = 10;
const MIN_AMOUNT = 10;
const MAX_AMOUNT = 1000;

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

    const user = {
      id: claimsData.claims.sub as string,
      email: claimsData.claims.email as string,
    };

    const { amount } = await req.json();
    const dollarAmount = Math.round(Number(amount));

    if (!dollarAmount || dollarAmount < MIN_AMOUNT || dollarAmount > MAX_AMOUNT) {
      throw new Error(`Amount must be between $${MIN_AMOUNT} and $${MAX_AMOUNT}`);
    }

    const credits = dollarAmount * CREDITS_PER_DOLLAR;
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find or create customer
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

    const origin = req.headers.get("origin") || "https://localhost:3000";

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: dollarAmount * 100, // cents
            product_data: {
              name: `${credits} Bookdyn Credits`,
              description: `${credits.toLocaleString()} credits (≈${(credits * 1000).toLocaleString()} words)`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        supabase_user_id: user.id,
        credits: String(credits),
        type: "credit_purchase",
      },
      success_url: `${origin}/dashboard?credits_purchased=${credits}`,
      cancel_url: `${origin}/dashboard`,
    };

    if (!customerId) {
      (sessionParams as any).customer_creation = "always";
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log(`[credit-checkout] Created session for user=${user.id} amount=$${dollarAmount} credits=${credits}`);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Credit checkout error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
