
-- Add featured flag to courses
ALTER TABLE public.courses ADD COLUMN is_featured boolean NOT NULL DEFAULT false;

-- Create banners table for admin-managed ads
CREATE TABLE public.banners (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url text NOT NULL,
  link_url text,
  is_active boolean NOT NULL DEFAULT true,
  placement text NOT NULL DEFAULT 'courses_page',
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- Anyone can view active banners
CREATE POLICY "Anyone can view active banners"
ON public.banners
FOR SELECT
USING (is_active = true);

-- Admins can manage banners
CREATE POLICY "Admins can manage banners"
ON public.banners
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for banner images
INSERT INTO storage.buckets (id, name, public) VALUES ('banners', 'banners', true);

-- Storage policies for banners bucket
CREATE POLICY "Anyone can view banner images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'banners');

CREATE POLICY "Admins can upload banner images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'banners' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update banner images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'banners' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete banner images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'banners' AND has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at on banners
CREATE TRIGGER update_banners_updated_at
BEFORE UPDATE ON public.banners
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
