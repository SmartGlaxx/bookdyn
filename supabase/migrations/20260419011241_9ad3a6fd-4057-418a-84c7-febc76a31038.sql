ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS full_text text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS total_char_count integer NOT NULL DEFAULT 0;