

## Problem

When upgrading plans (e.g., Starter → Pro), Stripe silently charges the prorated difference via `create_prorations`, but the UI shows only "Plan updated!" with no mention of charges. Users have no idea they're being billed.

## Plan

### 1. Add proration preview before confirming upgrade

In the `manage-subscription` Edge Function, add a new action `preview_upgrade` that uses Stripe's `upcoming invoice` API to show the user exactly what they'll be charged:

```typescript
case "preview_upgrade": {
  // Use stripe.invoices.createPreview() to get the prorated amount
  // Return: amount_due, proration_details, next_billing_date
}
```

### 2. Add confirmation dialog in PricingModal

Before calling `create_portal_update`, show a dialog:
- "Upgrading to Pro will charge **$XX.XX** now (prorated for the rest of this billing period)"
- "Your next full charge of $29/month will be on [date]"
- Confirm / Cancel buttons

### 3. Flow

```text
User clicks "Upgrade to Pro"
  → Call preview_upgrade (new action)
  → Show confirmation dialog with exact charge amount
  → User confirms
  → Call create_portal_update (existing action)
  → Show success toast with charge confirmation
```

### Technical Details

- **Stripe API**: `stripe.invoices.createPreview()` with `subscription` and `subscription_items` params returns the exact proration amount before committing
- **Edge Function**: Add `preview_upgrade` action to `manage-subscription/index.ts`
- **Frontend**: Add a confirmation step in `PricingModal.tsx` between plan selection and execution
- **Downgrades**: Already use `proration_behavior: "none"` — no charge, just switch at next cycle. Should still show a message like "Your plan will change to Starter at the end of this billing period"

### Files to modify
- `supabase/functions/manage-subscription/index.ts` — add `preview_upgrade` action
- `src/components/PricingModal.tsx` — add confirmation dialog with charge preview

