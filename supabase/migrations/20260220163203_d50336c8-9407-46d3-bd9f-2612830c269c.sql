
-- Create discount coupons table
CREATE TABLE public.discount_coupons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL,
  discount_type text NOT NULL DEFAULT 'percentage', -- 'percentage' or 'fixed'
  discount_value integer NOT NULL DEFAULT 0, -- percentage (0-100) or fixed amount in cents
  max_uses integer DEFAULT NULL, -- null = unlimited
  used_count integer NOT NULL DEFAULT 0,
  course_id text DEFAULT NULL, -- null = all courses
  expires_at timestamp with time zone DEFAULT NULL, -- null = no expiry
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT discount_coupons_code_key UNIQUE (code),
  CONSTRAINT discount_coupons_discount_type_check CHECK (discount_type IN ('percentage', 'fixed')),
  CONSTRAINT discount_coupons_discount_value_positive CHECK (discount_value > 0)
);

-- Add foreign key to courses
ALTER TABLE public.discount_coupons
  ADD CONSTRAINT discount_coupons_course_id_fkey
  FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.discount_coupons ENABLE ROW LEVEL SECURITY;

-- Admin can manage coupons
CREATE POLICY "Admins can manage coupons"
  ON public.discount_coupons
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can read active coupons (for checkout validation)
CREATE POLICY "Anyone can view active coupons"
  ON public.discount_coupons
  FOR SELECT
  USING (is_active = true);

-- Track coupon usage in orders
ALTER TABLE public.orders ADD COLUMN coupon_id uuid DEFAULT NULL REFERENCES public.discount_coupons(id);
ALTER TABLE public.orders ADD COLUMN discount_amount integer DEFAULT 0;

-- Trigger for updated_at
CREATE TRIGGER update_discount_coupons_updated_at
  BEFORE UPDATE ON public.discount_coupons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
