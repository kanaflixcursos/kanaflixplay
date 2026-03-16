
-- Table to track daily login points (one entry per user per day)
CREATE TABLE public.daily_login_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  login_date date NOT NULL DEFAULT CURRENT_DATE,
  points_awarded integer NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, login_date)
);

ALTER TABLE public.daily_login_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own login points"
  ON public.daily_login_points FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own login points"
  ON public.daily_login_points FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all login points"
  ON public.daily_login_points FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to award points on comment creation
CREATE OR REPLACE FUNCTION public.award_comment_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.profiles
  SET points = points + 10
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$;

-- Trigger: award 10 points when a comment is inserted
CREATE TRIGGER on_comment_award_points
  AFTER INSERT ON public.lesson_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.award_comment_points();

-- Function to award daily login points
CREATE OR REPLACE FUNCTION public.award_daily_login_points(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_points integer := 0;
BEGIN
  INSERT INTO public.daily_login_points (user_id, login_date, points_awarded)
  VALUES (p_user_id, CURRENT_DATE, 5)
  ON CONFLICT (user_id, login_date) DO NOTHING;

  IF FOUND THEN
    UPDATE public.profiles SET points = points + 5 WHERE user_id = p_user_id;
    v_points := 5;
  END IF;

  RETURN v_points;
END;
$$;
