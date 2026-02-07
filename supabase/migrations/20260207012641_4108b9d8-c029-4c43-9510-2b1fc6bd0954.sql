-- Create table to track when users last read each ticket
CREATE TABLE public.support_ticket_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  last_read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(ticket_id, user_id)
);

-- Enable RLS
ALTER TABLE public.support_ticket_reads ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own reads"
ON public.support_ticket_reads
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert their own reads"
ON public.support_ticket_reads
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reads"
ON public.support_ticket_reads
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all reads"
ON public.support_ticket_reads
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));