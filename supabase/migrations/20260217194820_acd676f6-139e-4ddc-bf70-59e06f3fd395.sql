
-- Table to track site visitors (anonymous)
CREATE TABLE public.site_visits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id text NOT NULL,
  page_path text NOT NULL DEFAULT '/',
  visited_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast counting
CREATE INDEX idx_site_visits_visitor_id ON public.site_visits (visitor_id);
CREATE INDEX idx_site_visits_visited_at ON public.site_visits (visited_at);

-- Enable RLS
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public tracking)
CREATE POLICY "Anyone can insert visits" ON public.site_visits
  FOR INSERT WITH CHECK (true);

-- Only admins can read
CREATE POLICY "Admins can read visits" ON public.site_visits
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
