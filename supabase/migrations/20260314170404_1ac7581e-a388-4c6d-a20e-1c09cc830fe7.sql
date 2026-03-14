
-- 1. Update handle_new_user to explicitly force free tier on every signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, plan, credits_limit, credits_used, credits_reset_at, daily_words_generated, daily_words_reset_at, onboarding_completed)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'free',
    5,
    0,
    now(),
    0,
    now(),
    false
  );
  RETURN NEW;
END;
$function$;

-- 2. Reset any profiles that have a paid plan but were never legitimately upgraded
-- (profiles where plan != 'free' but credits_used = 0 and created recently with no real usage)
-- Safety net: reset ALL non-free profiles that have 0 credits used back to free
-- Legitimate subscribers will be re-synced on next check-subscription call
UPDATE public.profiles
SET plan = 'free', credits_limit = 5, credits_used = 0
WHERE plan != 'free'
  AND credits_used = 0;
