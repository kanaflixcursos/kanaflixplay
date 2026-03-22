
-- Add missing creator_id columns
ALTER TABLE public.email_opens ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES public.creators(id);
ALTER TABLE public.daily_login_points ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES public.creators(id);
ALTER TABLE public.combo_courses ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES public.creators(id);
ALTER TABLE public.imported_users ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES public.creators(id);
ALTER TABLE public.support_ticket_reads ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES public.creators(id);

-- Backfill
UPDATE public.email_opens SET creator_id = 'a0000000-0000-0000-0000-000000000001' WHERE creator_id IS NULL;
UPDATE public.daily_login_points SET creator_id = 'a0000000-0000-0000-0000-000000000001' WHERE creator_id IS NULL;
UPDATE public.combo_courses SET creator_id = 'a0000000-0000-0000-0000-000000000001' WHERE creator_id IS NULL;
UPDATE public.imported_users SET creator_id = 'a0000000-0000-0000-0000-000000000001' WHERE creator_id IS NULL;
UPDATE public.support_ticket_reads SET creator_id = 'a0000000-0000-0000-0000-000000000001' WHERE creator_id IS NULL;
