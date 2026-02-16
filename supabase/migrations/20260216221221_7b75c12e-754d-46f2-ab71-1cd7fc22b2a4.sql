-- Fix: Users can bypass payment by directly inserting enrollment for paid courses
-- Restrict INSERT policy to only allow enrollment in free courses (price = 0 or NULL)
-- Paid course enrollments are handled by the pagarme webhook (using service role key)

DROP POLICY IF EXISTS "Users can create their own enrollments" ON public.course_enrollments;

CREATE POLICY "Users can enroll in free courses only"
ON public.course_enrollments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE id = course_enrollments.course_id
    AND (price IS NULL OR price = 0)
  )
);