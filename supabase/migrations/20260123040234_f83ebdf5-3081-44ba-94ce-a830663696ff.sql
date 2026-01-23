-- Add last_seen_at column to track user activity
ALTER TABLE public.profiles ADD COLUMN last_seen_at timestamp with time zone DEFAULT now();

-- Update all existing profiles to have a last_seen_at value
UPDATE public.profiles SET last_seen_at = updated_at WHERE last_seen_at IS NULL;