-- Function to get lesson count for published courses (bypasses RLS for count only)
CREATE OR REPLACE FUNCTION public.get_public_lesson_count(course_id_param UUID)
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COUNT(*)
  FROM public.lessons l
  JOIN public.courses c ON c.id = l.course_id
  WHERE l.course_id = course_id_param
    AND l.is_hidden = false
    AND c.is_published = true;
$$;