import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
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

const PRICE_TO_PLAN: Record<string, { plan: string; credits: number }> = {
  "price_1T8T3zBjVtw2b7OiBecRD1Oa": { plan: "starter", credits: 100 },
  "price_1T8T4YBjVtw2b7OimimbNZ22": { plan: "pro", credits: 500 },
  "price_1T8T4vBjVtw2b7Oi2KQ4OlAI": { plan: "unlimited", credits: 999999 },
};

async function getStripeAndUser(req: Request) {
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

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  // Find or error on customer
  const customers = await stripe.customers.list({ email: userData.user.email, limit: 1 });

  return { stripe, user: userData.user, supabaseClient, customer: customers.data[0] || null };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();
    const { stripe, user, supabaseClient, customer } = await getStripeAndUser(req);

    let result: any;

    switch (action) {
      case "get_subscription": {
        if (!customer) {
          result = { subscription: null, payment_method: null };
          break;
        }

        const subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          status: "active",
          limit: 1,
          expand: ["data.default_payment_method"],
        });

        if (subscriptions.data.length === 0) {
          // Check for canceled but still active
          const canceledSubs = await stripe.subscriptions.list({
            customer: customer.id,
            limit: 1,
            expand: ["data.default_payment_method"],
          });
          const sub = canceledSubs.data.find(s => s.status === "active" || s.status === "canceled");
          
          if (!sub) {
            result = { subscription: null, payment_method: null };
            break;
          }
        }

        const sub = subscriptions.data[0] || null;
        if (!sub) {
          result = { subscription: null, payment_method: null };
          break;
        }

        const priceId = sub.items.data[0]?.price?.id;
        const planInfo = priceId ? PRICE_TO_PLAN[priceId] : null;
        const pm = sub.default_payment_method as Stripe.PaymentMethod | null;

        result = {
          subscription: {
            id: sub.id,
            status: sub.status,
            cancel_at_period_end: sub.cancel_at_period_end,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            plan: planInfo?.plan || "unknown",
            price_id: priceId,
          },
          payment_method: pm ? {
            brand: pm.card?.brand || "unknown",
            last4: pm.card?.last4 || "****",
            exp_month: pm.card?.exp_month,
            exp_year: pm.card?.exp_year,
          } : null,
        };
        break;
      }

      case "change_plan": {
        const { new_plan } = params;
        const newPriceId = PLAN_PRICES[new_plan];
        if (!newPriceId) throw new Error("Invalid plan");
        if (!customer) throw new Error("No subscription found");

        const subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          status: "active",
          limit: 1,
        });
        if (subscriptions.data.length === 0) throw new Error("No active subscription");

        const sub = subscriptions.data[0];
        const updatedSub = await stripe.subscriptions.update(sub.id, {
          items: [{ id: sub.items.data[0].id, price: newPriceId }],
          proration_behavior: "create_prorations",
        });

        const planInfo = PRICE_TO_PLAN[newPriceId];
        if (planInfo) {
          await supabaseClient
            .from("profiles")
            .update({ plan: planInfo.plan, credits_limit: planInfo.credits })
            .eq("id", user.id);
        }

        result = { success: true, plan: planInfo?.plan };
        break;
      }

      case "cancel_subscription": {
        if (!customer) throw new Error("No subscription found");

        const subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          status: "active",
          limit: 1,
        });
        if (subscriptions.data.length === 0) throw new Error("No active subscription");

        // Cancel at period end (not immediately)
        await stripe.subscriptions.update(subscriptions.data[0].id, {
          cancel_at_period_end: true,
        });

        result = { success: true, cancel_at_period_end: true };
        break;
      }

      case "reactivate_subscription": {
        if (!customer) throw new Error("No subscription found");

        const subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          status: "active",
          limit: 1,
        });
        if (subscriptions.data.length === 0) throw new Error("No active subscription");

        await stripe.subscriptions.update(subscriptions.data[0].id, {
          cancel_at_period_end: false,
        });

        result = { success: true, cancel_at_period_end: false };
        break;
      }

      case "list_invoices": {
        if (!customer) {
          result = { invoices: [] };
          break;
        }

        const invoices = await stripe.invoices.list({
          customer: customer.id,
          limit: 12,
        });

        result = {
          invoices: invoices.data.map(inv => ({
            id: inv.id,
            amount_paid: inv.amount_paid,
            currency: inv.currency,
            status: inv.status,
            created: new Date(inv.created * 1000).toISOString(),
            invoice_pdf: inv.invoice_pdf,
            hosted_invoice_url: inv.hosted_invoice_url,
          })),
        };
        break;
      }

      case "update_payment_method": {
        if (!customer) throw new Error("No customer found");

        // Create a SetupIntent for the client to collect new payment details
        const setupIntent = await stripe.setupIntents.create({
          customer: customer.id,
          payment_method_types: ["card"],
        });

        result = { client_secret: setupIntent.client_secret };
        break;
      }

      case "confirm_payment_method": {
        const { payment_method_id } = params;
        if (!customer) throw new Error("No customer found");
        if (!payment_method_id) throw new Error("No payment method ID");

        // Set as default payment method on customer
        await stripe.customers.update(customer.id, {
          invoice_settings: { default_payment_method: payment_method_id },
        });

        // Also update active subscription's default payment method
        const subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          status: "active",
          limit: 1,
        });
        if (subscriptions.data.length > 0) {
          await stripe.subscriptions.update(subscriptions.data[0].id, {
            default_payment_method: payment_method_id,
          });
        }

        result = { success: true };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("manage-subscription error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
