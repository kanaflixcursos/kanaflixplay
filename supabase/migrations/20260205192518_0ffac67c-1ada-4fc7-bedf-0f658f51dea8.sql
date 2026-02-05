-- Add INSERT policy for course_enrollments to allow users to enroll themselves
CREATE POLICY "Users can create their own enrollments"
ON public.course_enrollments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);