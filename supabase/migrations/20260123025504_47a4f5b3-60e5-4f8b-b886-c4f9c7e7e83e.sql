-- Create lesson_comments table for threaded comments
CREATE TABLE public.lesson_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  parent_id uuid REFERENCES public.lesson_comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_lesson_comments_lesson_id ON public.lesson_comments(lesson_id);
CREATE INDEX idx_lesson_comments_parent_id ON public.lesson_comments(parent_id);

-- Enable RLS
ALTER TABLE public.lesson_comments ENABLE ROW LEVEL SECURITY;

-- Users can view comments of lessons they have access to
CREATE POLICY "Users can view lesson comments"
ON public.lesson_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM lessons l
    JOIN course_enrollments ce ON ce.course_id = l.course_id
    WHERE l.id = lesson_comments.lesson_id
    AND ce.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Users can create comments on lessons they have access to
CREATE POLICY "Users can create lesson comments"
ON public.lesson_comments
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM lessons l
    JOIN course_enrollments ce ON ce.course_id = l.course_id
    WHERE l.id = lesson_comments.lesson_id
    AND ce.user_id = auth.uid()
  )
);

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
ON public.lesson_comments
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own comments, admins can delete any
CREATE POLICY "Users can delete own comments"
ON public.lesson_comments
FOR DELETE
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_lesson_comments_updated_at
BEFORE UPDATE ON public.lesson_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();