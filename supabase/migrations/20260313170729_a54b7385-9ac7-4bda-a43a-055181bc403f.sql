
-- Add last-touch UTM columns and visitor_id to leads table
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS utm_source_last text,
  ADD COLUMN IF NOT EXISTS utm_medium_last text,
  ADD COLUMN IF NOT EXISTS utm_campaign_last text,
  ADD COLUMN IF NOT EXISTS visitor_id text;
