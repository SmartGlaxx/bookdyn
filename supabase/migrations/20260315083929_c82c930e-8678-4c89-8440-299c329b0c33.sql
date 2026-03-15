
-- Drop and recreate all FKs with CASCADE
ALTER TABLE public.books DROP CONSTRAINT IF EXISTS books_user_id_fkey;
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
ALTER TABLE public.request_logs DROP CONSTRAINT IF EXISTS request_logs_user_id_fkey;

ALTER TABLE public.books
  ADD CONSTRAINT books_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.request_logs
  ADD CONSTRAINT request_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
