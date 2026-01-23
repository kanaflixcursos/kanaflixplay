-- Add is_hidden column to lessons table
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;

-- Create lesson_materials table for supplementary files
CREATE TABLE public.lesson_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lesson_materials ENABLE ROW LEVEL SECURITY;

-- RLS policies for lesson_materials
CREATE POLICY "Admins can manage lesson materials"
ON public.lesson_materials
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view materials of enrolled course lessons"
ON public.lesson_materials
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM lessons l
    JOIN course_enrollments ce ON ce.course_id = l.course_id
    WHERE l.id = lesson_materials.lesson_id
    AND ce.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Create storage bucket for lesson materials
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('lesson-materials', 'lesson-materials', true, 15728640)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for lesson materials
CREATE POLICY "Admins can upload lesson materials"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'lesson-materials' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update lesson materials"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'lesson-materials' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete lesson materials"
ON storage.objects
FOR DELETE
USING (bucket_id = 'lesson-materials' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view lesson materials"
ON storage.objects
FOR SELECT
USING (bucket_id = 'lesson-materials');