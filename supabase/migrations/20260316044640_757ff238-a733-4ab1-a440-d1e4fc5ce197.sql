-- 1. Replace the comment points trigger: max 3 comments/day earn points
CREATE OR REPLACE FUNCTION public.award_comment_points()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  today_comment_points integer;
BEGIN
  -- Count how many comment points were already awarded today
  SELECT COUNT(*) INTO today_comment_points
  FROM public.lesson_comments
  WHERE user_id = NEW.user_id
    AND parent_id IS NULL OR parent_id IS NOT NULL -- all comments count
    AND created_at::date = CURRENT_DATE
    AND id != NEW.id;

  -- Only award if fewer than 3 comments earned points today
  IF today_comment_points < 3 THEN
    UPDATE public.profiles
    SET points = points + 10
    WHERE user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Create trigger to deduct points when a comment is deleted
CREATE OR REPLACE FUNCTION public.deduct_comment_points()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  comments_that_day integer;
BEGIN
  -- Count how many comments the user had on that day (before this deletion)
  SELECT COUNT(*) INTO comments_that_day
  FROM public.lesson_comments
  WHERE user_id = OLD.user_id
    AND created_at::date = OLD.created_at::date
    AND id != OLD.id;

  -- Only deduct if this comment was one of the first 3 that day (i.e. it earned points)
  -- If there were fewer than 3 OTHER comments that day, this one earned points
  IF comments_that_day < 3 THEN
    UPDATE public.profiles
    SET points = GREATEST(points - 10, 0)
    WHERE user_id = OLD.user_id;
  END IF;

  RETURN OLD;
END;
$$;

-- 3. Create the delete trigger (the insert trigger already exists from previous setup)
DROP TRIGGER IF EXISTS deduct_comment_points_trigger ON public.lesson_comments;
CREATE TRIGGER deduct_comment_points_trigger
  BEFORE DELETE ON public.lesson_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_comment_points();