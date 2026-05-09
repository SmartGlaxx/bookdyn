ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS character_ledger jsonb NOT NULL DEFAULT '{"characters":[]}'::jsonb,
  ADD COLUMN IF NOT EXISTS plot_ledger jsonb NOT NULL DEFAULT '{"todos":[],"dones":[]}'::jsonb;