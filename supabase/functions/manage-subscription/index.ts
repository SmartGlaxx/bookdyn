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

function getNextBillingDate(anchorTs: number): string {
  const anchor = new Date(anchorTs * 1000);
  const now = new Date();
  const anchorDay = anchor.getUTCDate();

  let year = now.getUTCFullYear();
  let month = now.getUTCMonth();

  for (let i = 0; i < 13; i++) {
    const targetMonth = month + i;
    const targetYear = year + Math.floor(targetMonth / 12);
    const targetMon = targetMonth % 12;
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
  const { data: claimsData, error: userError } = await supabaseClient.auth.getClaims(token);
  if (userError || !claimsData?.claims) throw new Error("Unauthorized");

  const user = { id: claimsData.claims.sub as string, email: claimsData.claims.email as string };

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const customers = await stripe.customers.list({ email: user.email, limit: 10 });

  const matchedCustomer = customers.data.find(
    (c) => c.metadata?.supabase_user_id === user.id
  ) || null;

  return { stripe, user, supabaseClient, customer: matchedCustomer };
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
        const periodEnd = safeTimestamp((sub as any).current_period_end) || ((sub as any).billing_cycle_anchor ? getNextBillingDate((sub as any).billing_cycle_anchor) : null);

        // Get pending plan info from profile
        const { data: profile } = await supabaseClient
          .from("profiles")
          .select("pending_plan, pending_plan_at")
          .eq("id", user.id)
          .single();

        result = {
          subscription: {
            id: sub.id,
            status: sub.status,
            cancel_at_period_end: sub.cancel_at_period_end,
            current_period_end: periodEnd,
            current_period_start: safeTimestamp((sub as any).current_period_start),
            plan: planInfo?.plan || "unknown",
            price_id: priceId,
            pending_plan: profile?.pending_plan || null,
            pending_plan_at: profile?.pending_plan_at || null,
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

      case "cancel_downgrade": {
        // Clear pending downgrade from our DB
        // The portal/webhook handles actual Stripe subscription state
        const { data: profile } = await supabaseClient
          .from("profiles")
          .select("pending_plan")
          .eq("id", user.id)
          .single();

        if (!profile?.pending_plan) throw new Error("No pending downgrade to cancel");

        await supabaseClient
          .from("profiles")
          .update({ pending_plan: null, pending_plan_at: null })
          .eq("id", user.id);

        result = { success: true };
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

      case "create_portal_update": {
        const { new_plan } = params;
        const newPriceId = PLAN_PRICES[new_plan];
        if (!newPriceId) throw new Error("Invalid plan");
        if (!customer) throw new Error("No customer found");

        const origin = req.headers.get("origin") || "https://localhost:3000";
        const returnUrl = `${origin}/manage-subscription?updated=true`;

        // Check if the user has an active subscription
        const subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          status: "active",
          limit: 1,
        });

        if (subscriptions.data.length > 0) {
          const sub = subscriptions.data[0];

          // Try 1: Stripe's hosted subscription_update_confirm flow
          // This shows the nice "Confirm your updates" page with proration details
          try {
            const portalSession = await stripe.billingPortal.sessions.create({
              customer: customer.id,
              return_url: returnUrl,
              flow_data: {
                type: "subscription_update_confirm",
                subscription_update_confirm: {
                  subscription: sub.id,
                  items: [{ id: sub.items.data[0].id, price: newPriceId, quantity: 1 }],
                },
              },
            });
            result = { url: portalSession.url };
            break;
          } catch (portalError: any) {
            console.log(`[manage-subscription] Portal subscription_update_confirm failed: ${portalError.message}`);
            // Fall through to fallback
          }

          // Try 2: General Billing Portal (lets user manage their sub in Stripe's UI)
          try {
            const portalSession = await stripe.billingPortal.sessions.create({
              customer: customer.id,
              return_url: returnUrl,
            });
            result = { url: portalSession.url, fallback: "portal" };
            break;
          } catch (generalPortalError: any) {
            console.log(`[manage-subscription] General portal failed: ${generalPortalError.message}`);
            // Fall through to checkout fallback
          }
        }

        // Try 3: Create a new checkout session for the target plan
        // This handles cases where the existing sub has incompatible currency
        // or where the portal is not configured for plan switching
        console.log(`[manage-subscription] Using checkout fallback for plan change to ${new_plan}`);
        const session = await stripe.checkout.sessions.create({
          customer: customer.id,
          mode: "subscription",
          line_items: [{ price: newPriceId, quantity: 1 }],
          metadata: {
            supabase_user_id: user.id,
            plan_id: new_plan,
          },
          subscription_data: {
            metadata: { supabase_user_id: user.id },
          },
          success_url: `${origin}/manage-subscription?updated=true`,
          cancel_url: `${origin}/manage-subscription`,
        });
        result = { url: session.url, fallback: "checkout" };
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

      // Open general Billing Portal for payment method updates, invoices, etc.
      case "open_portal": {
        if (!customer) throw new Error("No customer found");
        const origin = req.headers.get("origin") || "https://localhost:3000";

        const portalSession = await stripe.billingPortal.sessions.create({
          customer: customer.id,
          return_url: `${origin}/manage-subscription`,
        });

        result = { url: portalSession.url };
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
