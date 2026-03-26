

## Plan: Fix Subscription Upgrade/Downgrade Flow + Update Elite Product

### Problem
1. **PricingModal** always calls `create-checkout`, which opens a full Stripe Checkout page for both upgrades and downgrades — showing the flat plan price, not a prorated amount.
2. Downgrades should NOT navigate to Stripe at all — they should be applied at end of billing period with an in-app confirmation.
3. Upgrades should show the **prorated** charge on Stripe Checkout.
4. The Elite product in Stripe still shows "Unlimited" instead of "Elite — 2M words/month".

### Changes

#### 1. Update PricingModal (`src/components/PricingModal.tsx`)
- Detect if the user already has an active paid subscription (fetch `stripe_subscription_id` from profile).
- **If no active subscription**: keep current behavior — call `create-checkout` to open Stripe Checkout.
- **If active subscription + upgrade**: call `manage-subscription` → `create_portal_update`, which does the inline Stripe API swap with proration. Show a toast confirming the upgrade and prorated charge.
- **If active subscription + downgrade**: call `manage-subscription` → `create_portal_update` but with a modified backend that schedules the downgrade for end of period. Show a toast: "Your plan will change to [X] on [date]. You'll keep current privileges until then."

#### 2. Update `manage-subscription` edge function (`supabase/functions/manage-subscription/index.ts`)
- In `create_portal_update`, split behavior:
  - **Upgrade**: keep current logic (immediate price swap with `create_prorations`), update profile immediately.
  - **Downgrade**: instead of immediate swap, use `stripe.subscriptions.update` with `schedule` or set `pending_plan` + `pending_plan_at` in the profiles table. Store the new plan as pending and let the webhook handle the actual switch at period end. Return `{ success: true, scheduled: true, effective_date, new_plan }`.
- Actually, simpler approach: for downgrades, use Stripe's `subscription_update` with `proration_behavior: "none"` and schedule via Stripe's built-in billing cycle behavior. But that still changes the plan immediately in Stripe.
- **Better approach**: For downgrades, do NOT change Stripe immediately. Just store `pending_plan` and `pending_plan_at` in the profile. The `stripe-webhook` on `invoice.paid` at next cycle should handle the actual plan swap. Return the effective date to the frontend.

#### 3. Update Stripe Elite product metadata
- Use the Stripe tools to update the Elite product name from "Unlimited" to "Elite" and description to "2M words/month".

#### 4. Fix `ManageSubscription.tsx` credit rate text
- Line 140 still says `$1 = 30 credits` — update to `$1 = 10 credits`.

### Files Modified
- `src/components/PricingModal.tsx` — smart routing for upgrade vs downgrade vs new subscriber
- `supabase/functions/manage-subscription/index.ts` — downgrade = schedule only, upgrade = immediate with proration
- `src/pages/ManageSubscription.tsx` — fix stale credit rate text
- Stripe product update via Stripe tools (Elite product name + description)

