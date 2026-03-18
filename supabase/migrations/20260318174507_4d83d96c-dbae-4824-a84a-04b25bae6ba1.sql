
-- Restrict public read to only 'site_config' key (not api_keys)
DROP POLICY IF EXISTS "Anyone can read site settings" ON public.site_settings;

CREATE POLICY "Anyone can read public site settings"
  ON public.site_settings
  FOR SELECT
  TO public
  USING (key = 'site_config');
