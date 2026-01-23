-- Add pandavideo_video_id to lessons to track synced videos
ALTER TABLE public.lessons
ADD COLUMN IF NOT EXISTS pandavideo_video_id text;

-- Add unique constraint to prevent duplicate syncs
CREATE UNIQUE INDEX IF NOT EXISTS lessons_pandavideo_video_id_idx 
ON public.lessons (pandavideo_video_id) 
WHERE pandavideo_video_id IS NOT NULL;

-- Add last_synced_at to courses to track sync status
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS last_synced_at timestamp with time zone;

-- Enable pg_cron and pg_net extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;