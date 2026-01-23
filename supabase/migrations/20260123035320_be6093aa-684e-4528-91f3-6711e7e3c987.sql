-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'comment_reply',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE
USING (auth.uid() = user_id);

-- System can insert notifications (via trigger)
CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(user_id, is_read);

-- Function to create notification when comment reply is added
CREATE OR REPLACE FUNCTION public.notify_on_comment_reply()
RETURNS TRIGGER AS $$
DECLARE
  parent_comment RECORD;
  commenter_profile RECORD;
  lesson_record RECORD;
  course_record RECORD;
BEGIN
  -- Only trigger for replies (comments with parent_id)
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get parent comment info
  SELECT * INTO parent_comment FROM public.lesson_comments WHERE id = NEW.parent_id;
  
  -- Don't notify if replying to own comment
  IF parent_comment.user_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Get commenter profile
  SELECT full_name INTO commenter_profile FROM public.profiles WHERE user_id = NEW.user_id;

  -- Get lesson info
  SELECT * INTO lesson_record FROM public.lessons WHERE id = NEW.lesson_id;
  
  -- Get course info
  SELECT * INTO course_record FROM public.courses WHERE id = lesson_record.course_id;

  -- Create notification
  INSERT INTO public.notifications (user_id, type, title, message, link, metadata)
  VALUES (
    parent_comment.user_id,
    'comment_reply',
    'Nova resposta ao seu comentário',
    COALESCE(commenter_profile.full_name, 'Alguém') || ' respondeu ao seu comentário em "' || lesson_record.title || '"',
    '/courses/' || course_record.id || '?lesson=' || lesson_record.id,
    jsonb_build_object(
      'comment_id', NEW.id,
      'parent_comment_id', NEW.parent_id,
      'lesson_id', NEW.lesson_id,
      'course_id', course_record.id,
      'replier_id', NEW.user_id
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
CREATE TRIGGER on_comment_reply
  AFTER INSERT ON public.lesson_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_comment_reply();