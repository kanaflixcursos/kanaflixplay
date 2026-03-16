CREATE OR REPLACE VIEW public.user_orders
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  course_id,
  amount,
  status,
  payment_method,
  paid_at,
  pix_qr_code,
  pix_qr_code_url,
  pix_expires_at,
  boleto_url,
  boleto_barcode,
  boleto_due_date,
  created_at,
  updated_at
FROM orders o
WHERE user_id = auth.uid();