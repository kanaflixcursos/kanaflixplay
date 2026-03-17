ALTER TABLE public.combos
  ADD COLUMN max_uses integer DEFAULT NULL,
  ADD COLUMN used_count integer NOT NULL DEFAULT 0,
  ADD COLUMN expires_at timestamp with time zone DEFAULT NULL;