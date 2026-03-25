
-- Create turbo_progress table for daily activity tracking
CREATE TABLE public.turbo_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  activity_date date NOT NULL DEFAULT CURRENT_DATE,
  words_written integer NOT NULL DEFAULT 0,
  credits_used integer NOT NULL DEFAULT 0,
  sessions_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, activity_date)
);

-- Add turbo-related columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS streak_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_start_date date,
  ADD COLUMN IF NOT EXISTS last_activity_date date,
  ADD COLUMN IF NOT EXISTS total_words_written bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS turbo_unlocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS turbo_words_remaining integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS turbo_words_capacity integer NOT NULL DEFAULT 50000,
  ADD COLUMN IF NOT EXISTS turbo_cycles_completed integer NOT NULL DEFAULT 0;

-- Enable RLS on turbo_progress
ALTER TABLE public.turbo_progress ENABLE ROW LEVEL SECURITY;

-- RLS policies for turbo_progress
CREATE POLICY "Users can view own turbo progress"
  ON public.turbo_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own turbo progress"
  ON public.turbo_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Add turbo columns to the sensitive fields protection trigger
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
     NEW.turbo_cycles_completed IS DISTINCT FROM OLD.turbo_cycles_completed
  THEN
    IF current_setting('role') != 'service_role' THEN
      RAISE EXCEPTION 'Modifying system-managed profile columns is not allowed.';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Create function to record daily activity and update streaks (called by edge function)
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
  -- Lock profile row
  SELECT * INTO _profile FROM profiles WHERE id = _user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Profile not found');
  END IF;

  -- Upsert daily activity
  INSERT INTO turbo_progress (user_id, activity_date, words_written, credits_used, sessions_count)
  VALUES (_user_id, _today, _words, _credits, 1)
  ON CONFLICT (user_id, activity_date) 
  DO UPDATE SET 
    words_written = turbo_progress.words_written + _words,
    credits_used = turbo_progress.credits_used + _credits,
    sessions_count = turbo_progress.sessions_count + 1,
    updated_at = now();

  -- Calculate streak
  IF _profile.last_activity_date = _today THEN
    -- Already active today, no streak change
    _new_streak := _profile.streak_days;
  ELSIF _profile.last_activity_date = _yesterday THEN
    -- Consecutive day
    _new_streak := _profile.streak_days + 1;
  ELSIF _profile.last_activity_date IS NULL THEN
    -- First activity ever
    _new_streak := 1;
  ELSE
    -- Streak broken, apply decay
    DECLARE
      _days_missed integer := (_today - _profile.last_activity_date);
    BEGIN
      IF _days_missed <= 1 THEN
        _new_streak := _profile.streak_days; -- shouldn't happen but safety
      ELSIF _days_missed <= 3 THEN
        -- Small penalty: lose 20% per day missed
        _new_streak := GREATEST(1, _profile.streak_days - (_days_missed * GREATEST(1, _profile.streak_days / 5)));
      ELSE
        -- 4+ days: reset to 1
        _new_streak := 1;
      END IF;
    END;
  END IF;

  -- Update total words
  _new_total := _profile.total_words_written + _words;

  -- Check turbo unlock conditions: 30+ day streak AND 100k+ words
  _turbo_unlocked := (_new_streak >= 30 AND _new_total >= 100000);
  
  -- Calculate turbo capacity (base 50k + 10k per cycle, cap 100k)
  _turbo_capacity := LEAST(100000, 50000 + (_profile.turbo_cycles_completed * 10000));
  
  -- If turbo was just unlocked and wasn't before, set remaining to capacity
  IF _turbo_unlocked AND NOT _profile.turbo_unlocked THEN
    _turbo_remaining := _turbo_capacity;
  ELSE
    _turbo_remaining := _profile.turbo_words_remaining;
  END IF;

  -- Apply decay to turbo if missed days and turbo was active
  IF _profile.turbo_unlocked AND _profile.last_activity_date IS NOT NULL AND _profile.last_activity_date < _yesterday THEN
    DECLARE
      _days_missed integer := (_today - _profile.last_activity_date);
    BEGIN
      IF _days_missed <= 1 THEN
        NULL; -- no decay
      ELSIF _days_missed <= 3 THEN
        _turbo_remaining := GREATEST(0, _turbo_remaining - (_days_missed * 5000));
      ELSE
        -- 4+ days: reset turbo
        _turbo_unlocked := false;
        _turbo_remaining := 0;
      END IF;
    END;
  END IF;

  -- Update profile
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
