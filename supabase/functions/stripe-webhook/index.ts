import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const PRICE_TO_PLAN: Record<string, { plan: string; credits: number }> = {
  "price_1T8T3zBjVtw2b7OiBecRD1Oa": { plan: "starter", credits: 100 },
  "price_1T8T4YBjVtw2b7OimimbNZ22": { plan: "pro", credits: 500 },
  "price_1T8T4vBjVtw2b7Oi2KQ4OlAI": { plan: "elite", credits: 2000 },
};

const PLAN_CREDITS: Record<string, { credits: number; plan: string }> = {
  starter: { credits: 100, plan: "starter" },
  pro: { credits: 500, plan: "pro" },
  elite: { credits: 2000, plan: "elite" },
};

const PLAN_ORDER: Record<string, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  elite: 3,
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

function getPlanFromSubscription(sub: Stripe.Subscription): { plan: string; credits: number } | null {
  const priceId = sub.items.data[0]?.price?.id;
  return priceId ? PRICE_TO_PLAN[priceId] || null : null;
}

async function getUserIdFromCustomer(stripe: Stripe, customerId: string): Promise<string | null> {
  try {
    const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
    return customer.metadata?.supabase_user_id || null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!stripeKey || !webhookSecret) throw new Error("Stripe not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    if (!signature) throw new Error("No signature");

    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log(`[WEBHOOK] Processing event: ${event.type}`);

    // ─── checkout.session.completed ───
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      const customerId = session.customer as string;

      if (userId && customerId) {
        try {
          const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
          if (!customer.metadata?.supabase_user_id) {
            await stripe.customers.update(customerId, {
              metadata: { supabase_user_id: userId },
            });
            console.log(`[WEBHOOK] Set supabase_user_id on customer ${customerId}`);
          }
        } catch (e) {
          console.error(`[WEBHOOK] Failed to update customer metadata:`, e);
        }
      }

      // Handle credit pack purchase
      if (session.metadata?.type === "credit_purchase" && userId) {
        const purchasedCredits = parseInt(session.metadata.credits || "0", 10);
        if (purchasedCredits > 0) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("credits_limit, credits_used")
            .eq("id", userId)
            .single();

          if (profile) {
            const newLimit = profile.credits_limit + purchasedCredits;
            await supabase
              .from("profiles")
              .update({ credits_limit: newLimit })
              .eq("id", userId);
            console.log(`[WEBHOOK] credit_purchase: user=${userId} added=${purchasedCredits} new_limit=${newLimit}`);
          }
        }
      }

      // Handle subscription checkout — support both old "unlimited" and new "elite" plan IDs
      const planId = session.metadata?.plan_id;
      const normalizedPlanId = planId === "unlimited" ? "elite" : planId;
      if (userId && normalizedPlanId && PLAN_CREDITS[normalizedPlanId]) {
        const { credits, plan } = PLAN_CREDITS[normalizedPlanId];
        const subId = session.subscription as string | null;

        let periodEnd: string | null = null;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          periodEnd = safeTimestamp((sub as any).current_period_end);
        }

        await supabase
          .from("profiles")
          .update({
            plan,
            credits_limit: credits,
            credits_used: 0,
            pending_plan: null,
            pending_plan_at: null,
            stripe_subscription_id: subId,
            current_period_end: periodEnd,
          })
          .eq("id", userId);

        console.log(`[WEBHOOK] checkout.session.completed: user=${userId} plan=${plan}`);
      }
    }

    // ─── customer.subscription.updated ───
    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const previousAttributes = (event.data as any).previous_attributes || {};
      const customerId = subscription.customer as string;
      const userId = await getUserIdFromCustomer(stripe, customerId);

      if (userId) {
        const planInfo = getPlanFromSubscription(subscription);
        const periodEnd = safeTimestamp((subscription as any).current_period_end);

        if (planInfo) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("plan, pending_plan")
            .eq("id", userId)
            .single();

          const currentOrder = PLAN_ORDER[profile?.plan || "free"] ?? 0;
          const newOrder = PLAN_ORDER[planInfo.plan] ?? 0;

          const priceChanged = previousAttributes.items !== undefined;

          if (priceChanged) {
            if (newOrder > currentOrder) {
              await supabase
                .from("profiles")
                .update({
                  plan: planInfo.plan,
                  credits_limit: planInfo.credits,
                  credits_used: 0,
                  pending_plan: null,
                  pending_plan_at: null,
                  stripe_subscription_id: subscription.id,
                  current_period_end: periodEnd,
                })
                .eq("id", userId);
              console.log(`[WEBHOOK] subscription.updated UPGRADE: user=${userId} plan=${planInfo.plan}`);
            } else if (newOrder < currentOrder) {
              if (profile?.pending_plan === planInfo.plan) {
                await supabase
                  .from("profiles")
                  .update({
                    plan: planInfo.plan,
                    credits_limit: planInfo.credits,
                    credits_used: 0,
                    pending_plan: null,
                    pending_plan_at: null,
                    current_period_end: periodEnd,
                  })
                  .eq("id", userId);
                console.log(`[WEBHOOK] subscription.updated DOWNGRADE applied: user=${userId} plan=${planInfo.plan}`);
              } else {
                await supabase
                  .from("profiles")
                  .update({
                    plan: planInfo.plan,
                    credits_limit: planInfo.credits,
                    credits_used: 0,
                    pending_plan: null,
                    pending_plan_at: null,
                    current_period_end: periodEnd,
                  })
                  .eq("id", userId);
                console.log(`[WEBHOOK] subscription.updated DOWNGRADE (direct): user=${userId} plan=${planInfo.plan}`);
              }
            }
          } else {
            await supabase
              .from("profiles")
              .update({
                current_period_end: periodEnd,
                stripe_subscription_id: subscription.id,
              })
              .eq("id", userId);
            console.log(`[WEBHOOK] subscription.updated (period refresh): user=${userId}`);
          }
        }
      }
    }

    // ─── invoice.paid ───
    if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;
      const subId = invoice.subscription as string;
      if (subId) {
        const subscription = await stripe.subscriptions.retrieve(subId);
        const customerId = invoice.customer as string;
        const userId = await getUserIdFromCustomer(stripe, customerId);

        if (userId) {
          const planInfo = getPlanFromSubscription(subscription);
          const periodEnd = safeTimestamp((subscription as any).current_period_end);

          const { data: profile } = await supabase
            .from("profiles")
            .select("plan, pending_plan, pending_plan_at")
            .eq("id", userId)
            .single();

          if (profile?.pending_plan && planInfo) {
            const normalizedPending = profile.pending_plan === "unlimited" ? "elite" : profile.pending_plan;
            const pendingInfo = PLAN_CREDITS[normalizedPending];
            if (pendingInfo) {
              // Apply the pending downgrade in Stripe now
              const pendingPriceId = Object.entries(PRICE_TO_PLAN).find(
                ([, v]) => v.plan === pendingInfo.plan
              )?.[0];

              if (pendingPriceId && subscription.items.data[0]) {
                try {
                  await stripe.subscriptions.update(subscription.id, {
                    items: [{ id: subscription.items.data[0].id, price: pendingPriceId }],
                    proration_behavior: "none",
                  });
                  console.log(`[WEBHOOK] invoice.paid: applied Stripe price swap to ${pendingPriceId}`);
                } catch (e) {
                  console.error(`[WEBHOOK] Failed to swap Stripe price:`, e);
                }
              }

              await supabase
                .from("profiles")
                .update({
                  plan: pendingInfo.plan,
                  credits_limit: pendingInfo.credits,
                  credits_used: 0,
                  pending_plan: null,
                  pending_plan_at: null,
                  current_period_end: periodEnd,
                })
                .eq("id", userId);
              console.log(`[WEBHOOK] invoice.paid: applied pending downgrade user=${userId} plan=${pendingInfo.plan}`);
            }
          } else {
            await supabase
              .from("profiles")
              .update({
                credits_used: 0,
                current_period_end: periodEnd,
              })
              .eq("id", userId);
            console.log(`[WEBHOOK] invoice.paid: credits reset user=${userId}`);
          }
        }
      }
    }

    // ─── invoice.payment_failed ───
    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      const userId = await getUserIdFromCustomer(stripe, customerId);

      if (userId) {
        const attemptCount = invoice.attempt_count || 0;
        console.log(`[WEBHOOK] invoice.payment_failed: user=${userId} attempt=${attemptCount}`);

        if (attemptCount >= 3) {
          await supabase
            .from("profiles")
            .update({
              plan: "free",
              credits_limit: 5,
              credits_used: 0,
              pending_plan: null,
              pending_plan_at: null,
              stripe_subscription_id: null,
              current_period_end: null,
            })
            .eq("id", userId);
          console.log(`[WEBHOOK] invoice.payment_failed: downgraded to free after ${attemptCount} failures user=${userId}`);
        }
      }
    }

    // ─── customer.subscription.deleted ───
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const userId = await getUserIdFromCustomer(stripe, customerId);

      if (userId) {
        await supabase
          .from("profiles")
          .update({
            plan: "free",
            credits_limit: 5,
            credits_used: 0,
            pending_plan: null,
            pending_plan_at: null,
            stripe_subscription_id: null,
            current_period_end: null,
          })
          .eq("id", userId);
        console.log(`[WEBHOOK] subscription.deleted: user=${userId} downgraded to free`);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});
