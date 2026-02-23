
CREATE OR REPLACE FUNCTION public.create_lead_on_profile_complete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only act when phone AND birth_date are being completed for the first time
  IF NEW.phone IS NOT NULL AND NEW.birth_date IS NOT NULL
     AND NEW.email IS NOT NULL AND NEW.email != ''
     AND (OLD.phone IS NULL OR OLD.birth_date IS NULL) THEN

    -- Check if lead already exists (e.g. from newsletter)
    IF EXISTS (SELECT 1 FROM public.leads WHERE email = lower(NEW.email)) THEN
      -- Update existing lead: promote to 'qualified', sync name/phone
      UPDATE public.leads
      SET 
        status = CASE 
          WHEN lead_stage_priority(status) < lead_stage_priority('qualified') 
          THEN 'qualified' 
          ELSE status 
        END,
        name = COALESCE(NEW.full_name, name),
        phone = COALESCE(NEW.phone, phone),
        utm_source = COALESCE(utm_source, NEW.utm_source),
        utm_medium = COALESCE(utm_medium, NEW.utm_medium),
        utm_campaign = COALESCE(utm_campaign, NEW.utm_campaign)
      WHERE email = lower(NEW.email);
    ELSE
      -- Create new lead
      INSERT INTO public.leads (email, name, phone, source, status)
      VALUES (lower(NEW.email), NEW.full_name, NEW.phone, 'signup', 'qualified');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
