-- Create orders table to track payments
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL, -- in cents
  status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, failed, refunded, expired
  payment_method TEXT, -- credit_card, pix, boleto
  pagarme_order_id TEXT,
  pagarme_charge_id TEXT,
  pix_qr_code TEXT,
  pix_qr_code_url TEXT,
  pix_expires_at TIMESTAMP WITH TIME ZONE,
  boleto_url TEXT,
  boleto_barcode TEXT,
  boleto_due_date DATE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Users can view their own orders
CREATE POLICY "Users can view their own orders"
ON public.orders
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own orders
CREATE POLICY "Users can create their own orders"
ON public.orders
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all orders
CREATE POLICY "Admins can view all orders"
ON public.orders
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update any order
CREATE POLICY "Admins can update any order"
ON public.orders
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add price column to courses table
ALTER TABLE public.courses ADD COLUMN price INTEGER DEFAULT 0; -- in cents