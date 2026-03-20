
-- Update auto_convert_lead_on_purchase to also handle guest orders via buyer_email
CREATE OR REPLACE FUNCTION public.auto_convert_lead_on_purchase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') THEN
    -- Try by user_id first, then by buyer_email for guest orders
    UPDATE public.leads
    SET status = 'converted', converted_at = now()
    WHERE status != 'converted'
      AND (
        user_id = NEW.user_id
        OR email = COALESCE(
          NEW.buyer_email,
          (SELECT lower(COALESCE(p.email, '')) FROM public.profiles p WHERE p.user_id = NEW.user_id LIMIT 1)
        )
      );

    -- Clean UTM from profile if user exists
    IF NEW.user_id IS NOT NULL THEN
      UPDATE public.profiles
      SET utm_source = NULL, utm_medium = NULL, utm_campaign = NULL
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
