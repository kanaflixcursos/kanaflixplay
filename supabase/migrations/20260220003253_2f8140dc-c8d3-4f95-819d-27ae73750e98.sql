-- Create a general site_settings table for key-value configuration
CREATE TABLE public.site_settings (
  key text NOT NULL PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Admins can manage settings
CREATE POLICY "Admins can manage site settings"
ON public.site_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can read settings (needed for student-facing features)
CREATE POLICY "Anyone can read site settings"
ON public.site_settings
FOR SELECT
USING (true);

-- Insert default WhatsApp config
INSERT INTO public.site_settings (key, value) 
VALUES ('whatsapp_support', '{"enabled": false, "number": ""}'::jsonb);
