
-- 1. Add points_reward column to courses
ALTER TABLE public.courses ADD COLUMN points_reward integer NOT NULL DEFAULT 0;

-- 2. Update the trigger function to use the course's points_reward
CREATE OR REPLACE FUNCTION public.award_enrollment_points()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  points_to_award integer;
BEGIN
  SELECT COALESCE(points_reward, 0) INTO points_to_award FROM public.courses WHERE id = NEW.course_id;
  
  IF points_to_award > 0 THEN
    UPDATE public.profiles SET points = points + points_to_award WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. Reset all user points to 0
UPDATE public.profiles SET points = 0;

-- 4. Clear daily login points history
TRUNCATE public.daily_login_points;
