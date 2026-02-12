-- Add course_id to banners for linking banners to courses
ALTER TABLE public.banners
ADD COLUMN course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL;