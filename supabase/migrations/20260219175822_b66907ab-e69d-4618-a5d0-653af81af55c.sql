
-- Add expires_at column to course_enrollments
ALTER TABLE public.course_enrollments
ADD COLUMN expires_at timestamp with time zone DEFAULT NULL;

-- Set default expiration for new enrollments (1 year from enrollment)
-- We'll handle this in the application layer when inserting

-- Update existing enrollments to expire 1 year from enrollment date
UPDATE public.course_enrollments
SET expires_at = enrolled_at + interval '1 year';

-- Update RLS policy for users viewing enrollments to only show active ones
DROP POLICY IF EXISTS "Users can view their own enrollments" ON public.course_enrollments;
CREATE POLICY "Users can view their own enrollments"
ON public.course_enrollments
FOR SELECT
USING (
  auth.uid() = user_id
  AND (expires_at IS NULL OR expires_at > now())
);

-- Update enrollment insert policy to also set expires_at
DROP POLICY IF EXISTS "Users can enroll in free courses only" ON public.course_enrollments;
CREATE POLICY "Users can enroll in free courses only"
ON public.course_enrollments
FOR INSERT
WITH CHECK (
  (auth.uid() = user_id)
  AND (EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = course_enrollments.course_id
    AND (courses.price IS NULL OR courses.price = 0)
  ))
);
