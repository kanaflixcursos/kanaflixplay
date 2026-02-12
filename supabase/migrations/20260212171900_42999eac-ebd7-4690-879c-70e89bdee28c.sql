-- Create course categories table
CREATE TABLE public.course_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.course_categories ENABLE ROW LEVEL SECURITY;

-- Admins can manage categories
CREATE POLICY "Admins can manage categories"
ON public.course_categories
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view categories
CREATE POLICY "Anyone can view categories"
ON public.course_categories
FOR SELECT
USING (true);

-- Add category_id to courses
ALTER TABLE public.courses
ADD COLUMN category_id UUID REFERENCES public.course_categories(id) ON DELETE SET NULL;