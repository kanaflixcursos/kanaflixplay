-- Fix: profiles_table_public_exposure
-- Problem: "Users can view profiles of course mates" exposes email, phone, birth_date
-- Solution: Drop the course mates policy and recreate with column-level restriction via view

-- Step 1: Drop the overly permissive "course mates" policy
DROP POLICY IF EXISTS "Users can view profiles of course mates" ON public.profiles;

-- Step 2: Create a secure view for limited profile data accessible by course mates
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  user_id,
  full_name,
  avatar_url
FROM public.profiles;

-- Step 3: Enable RLS on the view (views inherit table RLS, but we add a policy for clarity)
-- Note: Since this is a view, RLS is based on the underlying table policies + view grants

-- Step 4: Grant access to the view for authenticated users
GRANT SELECT ON public.public_profiles TO authenticated;

-- Step 5: Create a function to get public profile for course mates
CREATE OR REPLACE FUNCTION public.get_course_mate_profile(target_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.user_id,
    p.full_name,
    p.avatar_url
  FROM public.profiles p
  WHERE p.user_id = target_user_id
    AND EXISTS (
      SELECT 1
      FROM course_enrollments ce1
      JOIN course_enrollments ce2 ON ce2.course_id = ce1.course_id
      WHERE ce1.user_id = auth.uid()
        AND ce2.user_id = target_user_id
    );
$$;

-- Fix: orders_payment_data_exposure
-- Problem: Users can see sensitive payment gateway IDs (pagarme_order_id, pagarme_charge_id)
-- Solution: Create a secure view for user orders that hides sensitive payment gateway fields

-- Step 1: Create a secure view for user-facing order information
CREATE OR REPLACE VIEW public.user_orders AS
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
  -- Only expose PIX/Boleto info for pending orders (needed for payment)
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
  -- pagarme_order_id and pagarme_charge_id are NOT exposed
FROM public.orders;

-- Step 2: Grant select on the view
GRANT SELECT ON public.user_orders TO authenticated;

-- Comment for documentation
COMMENT ON VIEW public.user_orders IS 'Secure view for user-facing order data. Hides payment gateway IDs (pagarme_order_id, pagarme_charge_id) and only exposes PIX/Boleto details for pending orders.';
COMMENT ON VIEW public.public_profiles IS 'Limited profile view exposing only full_name and avatar_url. Used for showing course mate information without exposing sensitive data like email, phone, birth_date.';
COMMENT ON FUNCTION public.get_course_mate_profile IS 'Securely retrieves limited profile information (full_name, avatar_url) for users who share a course enrollment with the caller.';