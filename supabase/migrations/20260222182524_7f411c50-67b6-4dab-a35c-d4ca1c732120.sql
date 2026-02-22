
-- Add payment_methods restriction to discount_coupons
ALTER TABLE public.discount_coupons
ADD COLUMN payment_methods text[] NOT NULL DEFAULT '{}';

-- Add launch_date to courses for pre-sale
ALTER TABLE public.courses
ADD COLUMN launch_date timestamp with time zone DEFAULT NULL;
