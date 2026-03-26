
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
     NEW.current_period_end IS DISTINCT FROM OLD.current_period_end OR
     NEW.streak_days IS DISTINCT FROM OLD.streak_days OR
     NEW.streak_start_date IS DISTINCT FROM OLD.streak_start_date OR
     NEW.last_activity_date IS DISTINCT FROM OLD.last_activity_date OR
     NEW.total_words_written IS DISTINCT FROM OLD.total_words_written OR
     NEW.turbo_unlocked IS DISTINCT FROM OLD.turbo_unlocked OR
     NEW.turbo_words_remaining IS DISTINCT FROM OLD.turbo_words_remaining OR
     NEW.turbo_words_capacity IS DISTINCT FROM OLD.turbo_words_capacity OR
     NEW.turbo_cycles_completed IS DISTINCT FROM OLD.turbo_cycles_completed OR
     NEW.completed_first_chapter IS DISTINCT FROM OLD.completed_first_chapter
  THEN
    IF current_setting('role') != 'service_role' THEN
      RAISE EXCEPTION 'Modifying system-managed profile columns is not allowed.';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Create function to mark first chapter completed
CREATE OR REPLACE FUNCTION public.mark_first_chapter_completed(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE profiles
  SET completed_first_chapter = true
  WHERE id = _user_id AND completed_first_chapter = false;
END;
$function$;

-- Create function to mark testimonial prompted
CREATE OR REPLACE FUNCTION public.mark_testimonial_prompted(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE profiles
  SET testimonial_prompted = true
  WHERE id = _user_id AND testimonial_prompted = false;
END;
$function$;
