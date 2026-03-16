
-- Function to award points on course enrollment
-- +180 for paid courses, +50 for free courses
CREATE OR REPLACE FUNCTION public.award_enrollment_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  course_price integer;
  points_to_award integer;
BEGIN
  SELECT COALESCE(price, 0) INTO course_price FROM public.courses WHERE id = NEW.course_id;
  
  IF course_price > 0 THEN
    points_to_award := 180;
  ELSE
    points_to_award := 50;
  END IF;
  
  UPDATE public.profiles SET points = points + points_to_award WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Trigger on course_enrollments
CREATE TRIGGER on_enrollment_award_points
AFTER INSERT ON public.course_enrollments
FOR EACH ROW EXECUTE FUNCTION public.award_enrollment_points();

-- Leaderboard function (security definer to bypass RLS on profiles)
CREATE OR REPLACE FUNCTION public.get_leaderboard(limit_count integer DEFAULT 10)
RETURNS TABLE(user_id uuid, full_name text, avatar_url text, points integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT p.user_id, p.full_name, p.avatar_url, p.points
  FROM public.profiles p
  WHERE p.points > 0
  ORDER BY p.points DESC
  LIMIT limit_count;
$$;
