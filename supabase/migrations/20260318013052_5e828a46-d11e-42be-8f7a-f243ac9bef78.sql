
CREATE OR REPLACE FUNCTION public.award_daily_login_points(p_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_points integer := 0;
  v_today date;
BEGIN
  v_today := (now() AT TIME ZONE 'America/Sao_Paulo')::date;

  INSERT INTO public.daily_login_points (user_id, login_date, points_awarded)
  VALUES (p_user_id, v_today, 5)
  ON CONFLICT (user_id, login_date) DO NOTHING;

  IF FOUND THEN
    UPDATE public.profiles SET points = points + 5 WHERE user_id = p_user_id;
    v_points := 5;
  END IF;

  RETURN v_points;
END;
$$;
