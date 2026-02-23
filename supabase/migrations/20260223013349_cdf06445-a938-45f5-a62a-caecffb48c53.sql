-- Add UTM columns to site_visits
ALTER TABLE public.site_visits
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_content text,
  ADD COLUMN IF NOT EXISTS utm_term text,
  ADD COLUMN IF NOT EXISTS referrer text;

-- Add UTM attribution to profiles (first touch)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text;

-- Add UTM columns to leads for marketing segmentation
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_content text;

-- Create user_events table for journey tracking
CREATE TABLE public.user_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id text NOT NULL,
  user_id uuid,
  event_type text NOT NULL,
  page_path text,
  event_data jsonb DEFAULT '{}'::jsonb,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;

-- Admins can view all events
CREATE POLICY "Admins can view all events"
ON public.user_events FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can insert events (anonymous tracking)
CREATE POLICY "Anyone can insert events"
ON public.user_events FOR INSERT
WITH CHECK (true);

-- Index for performance
CREATE INDEX idx_user_events_visitor_id ON public.user_events(visitor_id);
CREATE INDEX idx_user_events_event_type ON public.user_events(event_type);
CREATE INDEX idx_user_events_created_at ON public.user_events(created_at DESC);
CREATE INDEX idx_user_events_user_id ON public.user_events(user_id);
CREATE INDEX idx_site_visits_utm_source ON public.site_visits(utm_source);
CREATE INDEX idx_leads_utm_source ON public.leads(utm_source);

-- Function to auto-populate lead UTM from profile on creation
CREATE OR REPLACE FUNCTION public.populate_lead_utm_from_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  profile_record RECORD;
BEGIN
  -- If lead has no UTM data, try to get it from the profile
  IF NEW.utm_source IS NULL AND NEW.email IS NOT NULL THEN
    SELECT utm_source, utm_medium, utm_campaign
    INTO profile_record
    FROM public.profiles
    WHERE email = NEW.email
    LIMIT 1;

    IF profile_record IS NOT NULL THEN
      NEW.utm_source := profile_record.utm_source;
      NEW.utm_medium := profile_record.utm_medium;
      NEW.utm_campaign := profile_record.utm_campaign;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER populate_lead_utm
BEFORE INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.populate_lead_utm_from_profile();
