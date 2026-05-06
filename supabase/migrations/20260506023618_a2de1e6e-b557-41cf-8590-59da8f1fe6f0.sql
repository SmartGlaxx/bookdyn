
ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS series_id uuid,
  ADD COLUMN IF NOT EXISTS parent_book_id uuid,
  ADD COLUMN IF NOT EXISTS running_summary text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS back_cover_summary text,
  ADD COLUMN IF NOT EXISTS front_matter jsonb;

CREATE INDEX IF NOT EXISTS idx_books_series_id ON public.books(series_id);
CREATE INDEX IF NOT EXISTS idx_books_parent_book_id ON public.books(parent_book_id);
