ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'English';
