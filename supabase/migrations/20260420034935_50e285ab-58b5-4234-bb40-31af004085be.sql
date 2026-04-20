-- Error logs table for edge function and frontend uncaught errors
CREATE TABLE public.error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,                      -- 'edge_function' | 'frontend'
  function_name text,                        -- edge function name or frontend route
  user_id uuid,                              -- nullable (anon errors possible)
  message text NOT NULL,
  stack text,
  context jsonb DEFAULT '{}'::jsonb,
  url text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_error_logs_created_at ON public.error_logs (created_at DESC);
CREATE INDEX idx_error_logs_source ON public.error_logs (source);
CREATE INDEX idx_error_logs_user_id ON public.error_logs (user_id);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- No client policies; only service-role (edge functions) can read/write.
-- Frontend writes go through the log-error edge function.

-- Admin override (impersonation) audit log
CREATE TABLE public.admin_override_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  admin_email text NOT NULL,
  target_user_id uuid NOT NULL,
  target_email text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_override_log_created_at ON public.admin_override_log (created_at DESC);
CREATE INDEX idx_admin_override_log_admin ON public.admin_override_log (admin_user_id);

ALTER TABLE public.admin_override_log ENABLE ROW LEVEL SECURITY;
-- No client access; service role only.