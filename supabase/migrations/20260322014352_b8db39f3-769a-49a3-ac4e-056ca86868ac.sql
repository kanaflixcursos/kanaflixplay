-- Add creator_id to profiles to track which store the user registered from
ALTER TABLE public.profiles 
ADD COLUMN creator_id uuid REFERENCES public.creators(id) ON DELETE SET NULL;

-- Backfill all existing profiles with the Kanaflix creator_id
UPDATE public.profiles 
SET creator_id = 'a0000000-0000-0000-0000-000000000001'::uuid;

-- Update handle_new_user to set creator_id (will be set from app context later)
-- For now, create an index for efficient lookups
CREATE INDEX idx_profiles_creator_id ON public.profiles(creator_id);