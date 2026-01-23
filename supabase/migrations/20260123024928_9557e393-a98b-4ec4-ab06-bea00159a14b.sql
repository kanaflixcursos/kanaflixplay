-- Add thumbnail_url column to lessons table
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS thumbnail_url text;