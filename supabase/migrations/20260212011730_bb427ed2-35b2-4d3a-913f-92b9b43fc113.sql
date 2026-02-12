-- Fix: public_profiles view has no access controls
-- Since it's a view with security_invoker=true, reads are protected by underlying profiles RLS.
-- But simple views are updatable by default in PostgreSQL, so we need to prevent writes.

-- Drop and recreate the view to make it explicitly non-updatable
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles 
WITH (security_invoker = true) AS
SELECT 
  user_id,
  full_name,
  avatar_url
FROM public.profiles;

-- Revoke all write permissions on the view
REVOKE INSERT, UPDATE, DELETE ON public.public_profiles FROM anon, authenticated;

-- Grant only SELECT
GRANT SELECT ON public.public_profiles TO anon, authenticated;