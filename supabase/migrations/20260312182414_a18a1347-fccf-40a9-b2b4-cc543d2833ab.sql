-- Create email-assets storage bucket (public, for campaign images)
INSERT INTO storage.buckets (id, name, public)
VALUES ('email-assets', 'email-assets', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: Admins can upload/manage files
CREATE POLICY "Admins can manage email assets"
ON storage.objects
FOR ALL
USING (bucket_id = 'email-assets' AND public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (bucket_id = 'email-assets' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- RLS: Anyone can view email assets (public bucket for email rendering)
CREATE POLICY "Anyone can view email assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'email-assets');