
-- Table to store the featured banner configuration (singleton pattern)
CREATE TABLE public.featured_banner (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  custom_title text,
  custom_description text,
  custom_image_url text,
  gradient_from text NOT NULL DEFAULT '#3B82F6',
  gradient_to text NOT NULL DEFAULT '#8B5CF6',
  is_active boolean NOT NULL DEFAULT true,
  cta_text text NOT NULL DEFAULT 'Ver Detalhes',
  badge_text text NOT NULL DEFAULT 'DESTAQUE',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.featured_banner ENABLE ROW LEVEL SECURITY;

-- Admins can manage the banner
CREATE POLICY "Admins can manage featured banner"
ON public.featured_banner
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone authenticated can view the banner
CREATE POLICY "Anyone can view featured banner"
ON public.featured_banner
FOR SELECT
USING (true);

-- Insert a default row
INSERT INTO public.featured_banner (id) VALUES (gen_random_uuid());
