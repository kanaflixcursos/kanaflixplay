-- Add ticket_id column to refund_requests to link with support tickets
ALTER TABLE public.refund_requests 
ADD COLUMN ticket_id uuid REFERENCES public.support_tickets(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_refund_requests_ticket_id ON public.refund_requests(ticket_id);

-- Add 'refund' as a category option (using constraint check is not ideal, but for documentation)
COMMENT ON COLUMN public.support_tickets.category IS 'Categories: feedback, question, bug, other, refund';