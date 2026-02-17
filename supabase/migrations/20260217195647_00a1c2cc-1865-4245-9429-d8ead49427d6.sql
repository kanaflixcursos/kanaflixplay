-- Add open tracking column to email_campaigns
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS open_count integer NOT NULL DEFAULT 0;

-- Create email open tracking table for deduplication
CREATE TABLE public.email_opens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  opened_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, recipient_email)
);

ALTER TABLE public.email_opens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage email opens" ON public.email_opens FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow edge function to insert (service role bypasses RLS anyway, but for safety)
CREATE POLICY "Anyone can insert email opens" ON public.email_opens FOR INSERT WITH CHECK (true);
