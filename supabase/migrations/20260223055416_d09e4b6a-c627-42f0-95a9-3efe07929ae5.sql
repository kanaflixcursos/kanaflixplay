
-- Update auto_convert_lead_on_purchase to clear UTMs from profile after conversion
CREATE OR REPLACE FUNCTION public.auto_convert_lead_on_purchase()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') THEN
    UPDATE public.leads
    SET status = 'converted', converted_at = now()
    WHERE status != 'converted'
      AND email = (
        SELECT lower(COALESCE(p.email, ''))
        FROM public.profiles p
        WHERE p.user_id = NEW.user_id
        LIMIT 1
      );

    -- Clear UTMs from profile after conversion (attribution goal achieved)
    UPDATE public.profiles
    SET utm_source = NULL, utm_medium = NULL, utm_campaign = NULL
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$function$;

-- Update convert_lead_on_enrollment to also clear UTMs
CREATE OR REPLACE FUNCTION public.convert_lead_on_enrollment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_email text;
BEGIN
  SELECT lower(COALESCE(p.email, '')) INTO user_email
  FROM public.profiles p WHERE p.user_id = NEW.user_id LIMIT 1;

  IF user_email IS NOT NULL AND user_email != '' THEN
    UPDATE public.leads
    SET status = 'converted', converted_at = now()
    WHERE email = user_email
      AND lead_stage_priority(status) < lead_stage_priority('converted');
  END IF;

  -- Clear UTMs from profile after enrollment (attribution goal achieved)
  UPDATE public.profiles
  SET utm_source = NULL, utm_medium = NULL, utm_campaign = NULL
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$function$;
