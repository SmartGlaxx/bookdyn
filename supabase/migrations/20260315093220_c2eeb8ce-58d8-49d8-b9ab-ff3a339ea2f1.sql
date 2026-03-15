
-- Add new columns to profiles for plan change tracking
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS pending_plan text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pending_plan_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz DEFAULT NULL;

-- Update the prevent_sensitive_profile_updates trigger to protect new columns
CREATE OR REPLACE FUNCTION public.prevent_sensitive_profile_updates()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.plan IS DISTINCT FROM OLD.plan OR
     NEW.credits_limit IS DISTINCT FROM OLD.credits_limit OR
     NEW.credits_used IS DISTINCT FROM OLD.credits_used OR
     NEW.credits_reset_at IS DISTINCT FROM OLD.credits_reset_at OR
     NEW.daily_words_generated IS DISTINCT FROM OLD.daily_words_generated OR
     NEW.daily_words_reset_at IS DISTINCT FROM OLD.daily_words_reset_at OR
     NEW.pending_plan IS DISTINCT FROM OLD.pending_plan OR
     NEW.pending_plan_at IS DISTINCT FROM OLD.pending_plan_at OR
     NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id OR
     NEW.current_period_end IS DISTINCT FROM OLD.current_period_end
  THEN
    IF current_setting('role') != 'service_role' THEN
      RAISE EXCEPTION 'Modifying system-managed profile columns is not allowed.';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
