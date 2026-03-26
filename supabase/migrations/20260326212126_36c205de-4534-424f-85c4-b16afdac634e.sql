
CREATE TABLE public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  invited boolean DEFAULT false,
  source text DEFAULT 'waitlist_page'
);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert on waitlist"
  ON public.waitlist
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow public select count on waitlist"
  ON public.waitlist
  FOR SELECT
  TO anon
  USING (true);
