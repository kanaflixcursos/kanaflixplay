
-- Add failure_reason column to store gateway error details for failed payments
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS failure_reason text;
