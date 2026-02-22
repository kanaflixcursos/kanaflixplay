-- Allow anyone to view lessons of published courses (for preview)
CREATE POLICY "Anyone can view lessons of published courses"
ON public.lessons
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = lessons.course_id
    AND courses.is_published = true
  )
);