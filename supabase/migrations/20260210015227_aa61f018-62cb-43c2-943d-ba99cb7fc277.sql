
-- Allow authenticated users to read their own imported_user record (matched by auth_user_id)
CREATE POLICY "Users can view their own imported record"
ON public.imported_users
FOR SELECT
USING (auth.uid() = auth_user_id);

-- Allow authenticated users to update their own imported record status
CREATE POLICY "Users can update their own imported record"
ON public.imported_users
FOR UPDATE
USING (auth.uid() = auth_user_id);

-- Add unique constraint on course_enrollments for upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'course_enrollments_user_course_unique'
  ) THEN
    ALTER TABLE public.course_enrollments 
    ADD CONSTRAINT course_enrollments_user_course_unique UNIQUE (user_id, course_id);
  END IF;
END $$;
