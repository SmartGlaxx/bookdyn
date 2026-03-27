
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

  -- Updated: 500K words required for Turbo unlock (was 100K)
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
