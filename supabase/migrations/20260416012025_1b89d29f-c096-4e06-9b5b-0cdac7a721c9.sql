
-- 1. Fix waitlist: remove public SELECT policy (emails exposed)
DROP POLICY IF EXISTS "Allow public select count on waitlist" ON public.waitlist;

-- 2. Fix profile UPDATE: restrict to only user-editable columns
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
