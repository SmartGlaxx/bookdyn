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