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

const PRICE_TO_PLAN: Record<string, { plan: string; credits: number }> = {
  "price_1T8T3zBjVtw2b7OiBecRD1Oa": { plan: "starter", credits: 100 },
  "price_1T8T4YBjVtw2b7OimimbNZ22": { plan: "pro", credits: 500 },
  "price_1T8T4vBjVtw2b7Oi2KQ4OlAI": { plan: "unlimited", credits: 999999 },
};

const PLAN_PRICE_AMOUNT: Record<string, number> = {
  starter: 900,
  pro: 2900,
  unlimited: 7900,
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

// Calculate the next monthly billing date from a billing_cycle_anchor timestamp
function getNextBillingDate(anchorTs: number): string {
  const anchor = new Date(anchorTs * 1000);
  const now = new Date();
  const anchorDay = anchor.getUTCDate();
  
  // Start from current month, find next billing date that's in the future
  let year = now.getUTCFullYear();
  let month = now.getUTCMonth();
  
  for (let i = 0; i < 13; i++) {
    const targetMonth = month + i;
    const targetYear = year + Math.floor(targetMonth / 12);
    const targetMon = targetMonth % 12;
    // Clamp day to last day of month
    const daysInMonth = new Date(targetYear, targetMon + 1, 0).getDate();
    const day = Math.min(anchorDay, daysInMonth);
    const candidate = new Date(Date.UTC(targetYear, targetMon, day, anchor.getUTCHours(), anchor.getUTCMinutes(), anchor.getUTCSeconds()));
    if (candidate > now) {
      return candidate.toISOString();
    }
  }
  return anchor.toISOString();
}

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
  const customers = await stripe.customers.list({ email: userData.user.email, limit: 10 });
  
  // Only match the Stripe customer that belongs to THIS user (by supabase_user_id metadata)
  const matchedCustomer = customers.data.find(
    (c) => c.metadata?.supabase_user_id === userData.user.id
  ) || null;

  return { stripe, user: userData.user, supabaseClient, customer: matchedCustomer };
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
            current_period_end: safeTimestamp((sub as any).current_period_end) || ((sub as any).billing_cycle_anchor ? getNextBillingDate((sub as any).billing_cycle_anchor) : null),
            current_period_start: safeTimestamp((sub as any).current_period_start),
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

      case "preview_plan_change": {
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
        const currentPriceId = sub.items.data[0]?.price?.id;
        const currentPlan = currentPriceId ? PRICE_TO_PLAN[currentPriceId] : null;
        const currentAmount = currentPlan ? PLAN_PRICE_AMOUNT[currentPlan.plan] || 0 : 0;
        const newAmount = PLAN_PRICE_AMOUNT[new_plan] || 0;
        const isUpgrade = newAmount > currentAmount;

        // billing_cycle_anchor exists but current_period_end doesn't in newer Stripe API
        const anchor = (sub as any).billing_cycle_anchor;
        const periodEnd = anchor ? getNextBillingDate(anchor) : null;

        result = {
          is_upgrade: isUpgrade,
          new_plan,
          new_price: newAmount,
          current_plan: currentPlan?.plan,
          current_price: currentAmount,
          period_end: periodEnd,
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
        const currentPriceId = sub.items.data[0]?.price?.id;
        const currentAmount = currentPriceId && PRICE_TO_PLAN[currentPriceId]
          ? PLAN_PRICE_AMOUNT[PRICE_TO_PLAN[currentPriceId].plan] || 0 : 0;
        const newAmount = PLAN_PRICE_AMOUNT[new_plan] || 0;
        const isUpgrade = newAmount > currentAmount;

        const updatedSub = await stripe.subscriptions.update(sub.id, {
          items: [{ id: sub.items.data[0].id, price: newPriceId }],
          proration_behavior: "none",
        });

        const planInfo = PRICE_TO_PLAN[newPriceId];
        if (planInfo) {
          // Only update the plan label — credits_limit stays at current value
          // until the next billing cycle actually starts (handled by check-subscription)
          await supabaseClient
            .from("profiles")
            .update({ plan: planInfo.plan })
            .eq("id", user.id);
        }

        result = {
          success: true,
          plan: planInfo?.plan,
          is_upgrade: isUpgrade,
          period_end: safeTimestamp(updatedSub.current_period_end),
        };
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

        await stripe.subscriptions.update(subscriptions.data[0].id, {
          cancel_at_period_end: true,
        });

        result = {
          success: true,
          cancel_at_period_end: true,
          effective_date: safeTimestamp(subscriptions.data[0].current_period_end),
        };
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
            created: safeTimestamp(inv.created),
            invoice_pdf: inv.invoice_pdf,
            hosted_invoice_url: inv.hosted_invoice_url,
          })),
        };
        break;
      }

      case "update_payment_method": {
        if (!customer) throw new Error("No customer found");

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

        await stripe.customers.update(customer.id, {
          invoice_settings: { default_payment_method: payment_method_id },
        });

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
