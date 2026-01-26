-- Fix 1: Restrict profiles visibility - users can only view their own profile or profiles of course mates
-- First drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create policy for users to view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create policy for admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create policy for users to view basic info of course mates (for comments feature)
CREATE POLICY "Users can view profiles of course mates"
ON public.profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM course_enrollments ce1
    JOIN course_enrollments ce2 ON ce2.course_id = ce1.course_id
    WHERE ce1.user_id = auth.uid()
    AND ce2.user_id = profiles.user_id
  )
);

-- Fix 2: Secure the lesson-materials storage bucket
-- Drop the overly permissive storage policy
DROP POLICY IF EXISTS "Anyone can view lesson materials" ON storage.objects;

-- Make the bucket private
UPDATE storage.buckets SET public = false WHERE id = 'lesson-materials';

-- Create enrollment-based storage policy for viewing materials
CREATE POLICY "Enrolled users can download lesson materials"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'lesson-materials'
  AND (
    EXISTS (
      SELECT 1 
      FROM lesson_materials lm
      JOIN lessons l ON l.id = lm.lesson_id
      JOIN course_enrollments ce ON ce.course_id = l.course_id
      WHERE lm.file_url LIKE '%' || storage.objects.name || '%'
      AND ce.user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Fix 3: Secure notifications table - only allow inserts from database triggers (not direct client access)
-- Drop the overly permissive insert policy
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Create a more restrictive policy - notifications should only be created by database triggers
-- Since the notify_on_comment_reply function uses SECURITY DEFINER, it can insert notifications
-- Regular users should not be able to insert notifications directly
CREATE POLICY "Only system can insert notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (false);

-- Note: The notify_on_comment_reply trigger function uses SECURITY DEFINER
-- which bypasses RLS, so it can still insert notifications