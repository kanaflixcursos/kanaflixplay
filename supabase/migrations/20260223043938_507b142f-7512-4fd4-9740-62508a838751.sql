
-- Fix 1: Update handle_new_user to extract phone and birth_date from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, phone, birth_date)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    CASE 
      WHEN NEW.raw_user_meta_data->>'birth_date' IS NOT NULL 
           AND NEW.raw_user_meta_data->>'birth_date' != ''
      THEN (NEW.raw_user_meta_data->>'birth_date')::date
      ELSE NULL
    END
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  
  RETURN NEW;
END;
$function$;

-- Fix 2: Update handle_user_email_sync to also sync phone and birth_date on INSERT
CREATE OR REPLACE FUNCTION public.handle_user_email_sync()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.profiles (user_id, email, full_name, phone, birth_date)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      NULLIF(NEW.raw_user_meta_data->>'phone', ''),
      CASE 
        WHEN NEW.raw_user_meta_data->>'birth_date' IS NOT NULL 
             AND NEW.raw_user_meta_data->>'birth_date' != ''
        THEN (NEW.raw_user_meta_data->>'birth_date')::date
        ELSE NULL
      END
    )
    ON CONFLICT (user_id) DO UPDATE SET 
      email = EXCLUDED.email,
      phone = COALESCE(EXCLUDED.phone, profiles.phone),
      birth_date = COALESCE(EXCLUDED.birth_date, profiles.birth_date);
  END IF;
  
  IF TG_OP = 'UPDATE' AND OLD.email IS DISTINCT FROM NEW.email THEN
    UPDATE public.profiles SET email = NEW.email WHERE user_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix 3: Make create_lead_on_profile_complete work on INSERT too
CREATE OR REPLACE FUNCTION public.create_lead_on_profile_complete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- For INSERT: check if phone AND birth_date are already set
  -- For UPDATE: check if they are being completed for the first time
  IF NEW.phone IS NOT NULL AND NEW.birth_date IS NOT NULL
     AND NEW.email IS NOT NULL AND NEW.email != '' THEN

    -- For UPDATE, only act if phone or birth_date was previously NULL
    IF TG_OP = 'UPDATE' AND OLD.phone IS NOT NULL AND OLD.birth_date IS NOT NULL THEN
      RETURN NEW;
    END IF;

    -- Check if lead already exists (e.g. from newsletter)
    IF EXISTS (SELECT 1 FROM public.leads WHERE email = lower(NEW.email)) THEN
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
      INSERT INTO public.leads (email, name, phone, source, status)
      VALUES (lower(NEW.email), NEW.full_name, NEW.phone, 'signup', 'qualified');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix 4: Ensure the trigger fires on INSERT OR UPDATE (not just UPDATE)
DROP TRIGGER IF EXISTS on_profile_complete_create_lead ON public.profiles;
CREATE TRIGGER on_profile_complete_create_lead
  AFTER INSERT OR UPDATE OF phone, birth_date ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_lead_on_profile_complete();
