
-- Rate limiting: request_logs table
CREATE TABLE public.request_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  function_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_request_logs_user_function_time 
  ON public.request_logs (user_id, function_name, created_at DESC);

-- Rate limit check function (returns true if allowed, also logs the request)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _user_id uuid,
  _function_name text,
  _max_per_hour integer DEFAULT 30,
  _max_per_day integer DEFAULT 200
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  hourly_count integer;
  daily_count integer;
BEGIN
  SELECT count(*) INTO hourly_count
  FROM public.request_logs
  WHERE user_id = _user_id
    AND function_name = _function_name
    AND created_at > now() - interval '1 hour';

  IF hourly_count >= _max_per_hour THEN
    RETURN false;
  END IF;

  SELECT count(*) INTO daily_count
  FROM public.request_logs
  WHERE user_id = _user_id
    AND function_name = _function_name
    AND created_at > now() - interval '1 day';

  IF daily_count >= _max_per_day THEN
    RETURN false;
  END IF;

  INSERT INTO public.request_logs (user_id, function_name)
  VALUES (_user_id, _function_name);

  RETURN true;
END;
$$;

-- Cleanup function for old logs
CREATE OR REPLACE FUNCTION public.cleanup_old_request_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.request_logs WHERE created_at < now() - interval '30 days';
END;
$$;

-- Audit logs table
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_user_time 
  ON public.audit_logs (user_id, created_at DESC);

CREATE INDEX idx_audit_logs_action 
  ON public.audit_logs (action, created_at DESC);

-- Enable RLS
ALTER TABLE public.request_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for request_logs
CREATE POLICY "Users can view own request logs"
  ON public.request_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS policies for audit_logs
CREATE POLICY "Users can view own audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
