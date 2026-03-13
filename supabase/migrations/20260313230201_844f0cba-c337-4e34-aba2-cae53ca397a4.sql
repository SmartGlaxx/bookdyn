
CREATE OR REPLACE FUNCTION public.prevent_sensitive_profile_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.plan IS DISTINCT FROM OLD.plan OR
     NEW.credits_limit IS DISTINCT FROM OLD.credits_limit OR
     NEW.credits_used IS DISTINCT FROM OLD.credits_used OR
     NEW.credits_reset_at IS DISTINCT FROM OLD.credits_reset_at OR
     NEW.daily_words_generated IS DISTINCT FROM OLD.daily_words_generated OR
     NEW.daily_words_reset_at IS DISTINCT FROM OLD.daily_words_reset_at
  THEN
    IF current_setting('role') != 'service_role' THEN
      RAISE EXCEPTION 'Modifying system-managed profile columns is not allowed.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_sensitive_profile_updates
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_sensitive_profile_updates();
