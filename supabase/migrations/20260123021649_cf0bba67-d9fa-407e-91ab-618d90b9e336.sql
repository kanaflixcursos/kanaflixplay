-- Create storage bucket for course covers
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-covers', 'course-covers', true);

-- RLS policies for course covers bucket
CREATE POLICY "Anyone can view course covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-covers');

CREATE POLICY "Admins can upload course covers"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'course-covers' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update course covers"
ON storage.objects FOR UPDATE
USING (bucket_id = 'course-covers' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete course covers"
ON storage.objects FOR DELETE
USING (bucket_id = 'course-covers' AND has_role(auth.uid(), 'admin'::app_role));

-- Add pandavideo_folder_id to courses table
ALTER TABLE public.courses
ADD COLUMN pandavideo_folder_id text;