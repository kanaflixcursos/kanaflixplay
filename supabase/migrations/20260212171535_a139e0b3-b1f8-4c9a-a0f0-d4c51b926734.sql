-- Add updated_at column to lesson_progress to track last interaction
ALTER TABLE public.lesson_progress 
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- Set existing rows' updated_at based on completed_at or fallback to now
UPDATE public.lesson_progress 
SET updated_at = COALESCE(completed_at, now());

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_lesson_progress_updated_at
BEFORE UPDATE ON public.lesson_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();