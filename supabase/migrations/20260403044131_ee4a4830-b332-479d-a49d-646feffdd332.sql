
-- Fix: Update the security trigger to allow bypass from trusted SECURITY DEFINER functions
-- using a session-local config variable

CREATE OR REPLACE FUNCTION public.prevent_sensitive_profile_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Allow bypass from trusted SECURITY DEFINER functions that set this flag
  IF current_setting('app.bypass_rls_check', true) = 'true' THEN
    RETURN NEW;
  END IF;

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

-- Update record_writing_activity to set bypass flag
CREATE OR REPLACE FUNCTION public.record_writing_activity(_user_id uuid, _words integer, _credits integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _profile profiles%ROWTYPE;
  _today date := CURRENT_DATE;
  _yesterday date := CURRENT_DATE - 1;
  _new_streak integer;
  _new_total bigint;
  _turbo_unlocked boolean;
  _turbo_capacity integer;
  _turbo_remaining integer;
BEGIN
  -- Set bypass flag for trigger
  PERFORM set_config('app.bypass_rls_check', 'true', true);

  SELECT * INTO _profile FROM profiles WHERE id = _user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Profile not found');
  END IF;

  INSERT INTO turbo_progress (user_id, activity_date, words_written, credits_used, sessions_count)
  VALUES (_user_id, _today, _words, _credits, 1)
  ON CONFLICT (user_id, activity_date) 
  DO UPDATE SET 
    words_written = turbo_progress.words_written + _words,
    credits_used = turbo_progress.credits_used + _credits,
    sessions_count = turbo_progress.sessions_count + 1,
    updated_at = now();

  IF _profile.last_activity_date = _today THEN
    _new_streak := _profile.streak_days;
  ELSIF _profile.last_activity_date = _yesterday THEN
    _new_streak := _profile.streak_days + 1;
  ELSIF _profile.last_activity_date IS NULL THEN
    _new_streak := 1;
  ELSE
    DECLARE
      _days_missed integer := (_today - _profile.last_activity_date);
    BEGIN
      IF _days_missed <= 1 THEN
        _new_streak := _profile.streak_days;
      ELSIF _days_missed <= 3 THEN
        _new_streak := GREATEST(1, _profile.streak_days - (_days_missed * GREATEST(1, _profile.streak_days / 5)));
      ELSE
        _new_streak := 1;
      END IF;
    END;
  END IF;

  _new_total := _profile.total_words_written + _words;
  _turbo_unlocked := (_new_streak >= 30 AND _new_total >= 500000);
  _turbo_capacity := LEAST(100000, 50000 + (_profile.turbo_cycles_completed * 10000));
  
  IF _turbo_unlocked AND NOT _profile.turbo_unlocked THEN
    _turbo_remaining := _turbo_capacity;
  ELSE
    _turbo_remaining := _profile.turbo_words_remaining;
  END IF;

  IF _profile.turbo_unlocked AND _profile.last_activity_date IS NOT NULL AND _profile.last_activity_date < _yesterday THEN
    DECLARE
      _days_missed integer := (_today - _profile.last_activity_date);
    BEGIN
      IF _days_missed <= 1 THEN
        NULL;
      ELSIF _days_missed <= 3 THEN
        _turbo_remaining := GREATEST(0, _turbo_remaining - (_days_missed * 5000));
      ELSE
        _turbo_unlocked := false;
        _turbo_remaining := 0;
      END IF;
    END;
  END IF;

  UPDATE profiles SET
    streak_days = _new_streak,
    streak_start_date = CASE 
      WHEN _new_streak = 1 THEN _today
      ELSE COALESCE(_profile.streak_start_date, _today)
    END,
    last_activity_date = _today,
    total_words_written = _new_total,
    turbo_unlocked = _turbo_unlocked,
    turbo_words_remaining = _turbo_remaining,
    turbo_words_capacity = _turbo_capacity
  WHERE id = _user_id;

  RETURN jsonb_build_object(
    'streak_days', _new_streak,
    'total_words_written', _new_total,
    'turbo_unlocked', _turbo_unlocked,
    'turbo_words_remaining', _turbo_remaining,
    'turbo_words_capacity', _turbo_capacity
  );
END;
$function$;

-- Update check_and_deduct_word_credits to set bypass flag
CREATE OR REPLACE FUNCTION public.check_and_deduct_word_credits(_user_id uuid, _estimated_words integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _profile profiles%ROWTYPE;
  _daily_cap integer;
  _credit_cost numeric;
  _new_credits_used integer;
BEGIN
  PERFORM set_config('app.bypass_rls_check', 'true', true);

  SELECT * INTO _profile FROM profiles WHERE id = _user_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Profile not found');
  END IF;

  _credit_cost := CEIL(_estimated_words::numeric / 1000);

  IF _profile.credits_used + _credit_cost > _profile.credits_limit THEN
    RETURN jsonb_build_object(
      'allowed', false, 
      'reason', 'Monthly credit limit reached',
      'credits_used', _profile.credits_used,
      'credits_limit', _profile.credits_limit
    );
  END IF;

  _daily_cap := CASE _profile.plan
    WHEN 'free' THEN 5000
    WHEN 'starter' THEN 50000
    WHEN 'pro' THEN 100000
    WHEN 'elite' THEN 300000
    ELSE 5000
  END;

  IF _profile.daily_words_reset_at::date < now()::date THEN
    _profile.daily_words_generated := 0;
    UPDATE profiles 
      SET daily_words_generated = 0, daily_words_reset_at = now() 
      WHERE id = _user_id;
  END IF;

  IF _profile.daily_words_generated + _estimated_words > _daily_cap THEN
    RETURN jsonb_build_object(
      'allowed', false, 
      'reason', 'Daily word limit reached',
      'daily_words_generated', _profile.daily_words_generated,
      'daily_cap', _daily_cap
    );
  END IF;

  _new_credits_used := _profile.credits_used + _credit_cost::integer;
  
  UPDATE profiles 
  SET 
    credits_used = _new_credits_used,
    daily_words_generated = daily_words_generated + _estimated_words
  WHERE id = _user_id;

  RETURN jsonb_build_object(
    'allowed', true,
    'credits_deducted', _credit_cost,
    'credits_used', _new_credits_used,
    'credits_limit', _profile.credits_limit,
    'daily_words_generated', _profile.daily_words_generated + _estimated_words,
    'daily_cap', _daily_cap
  );
END;
$function$;

-- Update mark_first_chapter_completed to set bypass flag
CREATE OR REPLACE FUNCTION public.mark_first_chapter_completed(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM set_config('app.bypass_rls_check', 'true', true);
  UPDATE profiles
  SET completed_first_chapter = true
  WHERE id = _user_id AND completed_first_chapter = false;
END;
$function$;

-- Update mark_testimonial_prompted to set bypass flag
CREATE OR REPLACE FUNCTION public.mark_testimonial_prompted(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM set_config('app.bypass_rls_check', 'true', true);
  UPDATE profiles
  SET testimonial_prompted = true
  WHERE id = _user_id AND testimonial_prompted = false;
END;
$function$;
