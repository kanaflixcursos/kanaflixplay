
-- Retroactively award enrollment points for existing enrollments
-- that were created before the trigger was added
DO $$
DECLARE
  rec RECORD;
  points_to_add integer;
  course_price integer;
BEGIN
  FOR rec IN
    SELECT ce.user_id, ce.course_id
    FROM public.course_enrollments ce
  LOOP
    SELECT COALESCE(price, 0) INTO course_price FROM public.courses WHERE id = rec.course_id;
    
    IF course_price > 0 THEN
      points_to_add := 180;
    ELSE
      points_to_add := 50;
    END IF;
    
    UPDATE public.profiles
    SET points = points + points_to_add
    WHERE user_id = rec.user_id;
  END LOOP;
END;
$$;
