-- Fix: SECURITY DEFINER view warnings
-- By default PostgreSQL views use SECURITY INVOKER, but we should be explicit
-- Recreate views without SECURITY DEFINER to use caller's permissions

-- Fix public_profiles view - explicitly use SECURITY INVOKER
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles 
WITH (security_invoker = true)
AS
SELECT 
  user_id,
  full_name,
  avatar_url
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO authenticated;

-- Fix user_orders view - explicitly use SECURITY INVOKER  
DROP VIEW IF EXISTS public.user_orders;
CREATE VIEW public.user_orders
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  course_id,
  amount,
  status,
  payment_method,
  created_at,
  updated_at,
  paid_at,
  CASE 
    WHEN status = 'pending' THEN pix_qr_code
    ELSE NULL
  END as pix_qr_code,
  CASE 
    WHEN status = 'pending' THEN pix_qr_code_url
    ELSE NULL
  END as pix_qr_code_url,
  CASE 
    WHEN status = 'pending' THEN pix_expires_at
    ELSE NULL
  END as pix_expires_at,
  CASE 
    WHEN status = 'pending' THEN boleto_url
    ELSE NULL
  END as boleto_url,
  CASE 
    WHEN status = 'pending' THEN boleto_barcode
    ELSE NULL
  END as boleto_barcode,
  CASE 
    WHEN status = 'pending' THEN boleto_due_date
    ELSE NULL
  END as boleto_due_date
FROM public.orders;

GRANT SELECT ON public.user_orders TO authenticated;

-- Re-add comments
COMMENT ON VIEW public.user_orders IS 'Secure view for user-facing order data. Hides payment gateway IDs (pagarme_order_id, pagarme_charge_id) and only exposes PIX/Boleto details for pending orders.';
COMMENT ON VIEW public.public_profiles IS 'Limited profile view exposing only full_name and avatar_url. Used for showing course mate information without exposing sensitive data like email, phone, birth_date.';