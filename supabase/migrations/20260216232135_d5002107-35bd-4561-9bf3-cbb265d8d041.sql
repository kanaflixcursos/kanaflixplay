
-- Add order_index column to featured_banner for slideshow ordering
ALTER TABLE public.featured_banner ADD COLUMN IF NOT EXISTS order_index integer NOT NULL DEFAULT 0;
