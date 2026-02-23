
-- Drop old triggers and function with CASCADE
DROP TRIGGER IF EXISTS trg_create_lead_on_profile_complete ON public.profiles;
DROP TRIGGER IF EXISTS on_profile_complete_create_lead ON public.profiles;
DROP TRIGGER IF EXISTS trigger_create_lead_on_profile_complete ON public.profiles;
DROP FUNCTION IF EXISTS public.create_lead_on_profile_complete() CASCADE;

-- Create simple function: email confirmed = lead created
CREATE OR REPLACE FUNCTION public.create_lead_on_email_confirmed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  profile_record RECORD;
BEGIN
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    SELECT * INTO profile_record FROM public.profiles WHERE user_id = NEW.id LIMIT 1;

    IF EXISTS (SELECT 1 FROM public.leads WHERE email = lower(NEW.email)) THEN
      UPDATE public.leads
      SET 
        status = CASE 
          WHEN lead_stage_priority(status) < lead_stage_priority('qualified') THEN 'qualified' 
          ELSE status 
        END,
        name = COALESCE(profile_record.full_name, name),
        phone = COALESCE(profile_record.phone, phone),
        source = CASE WHEN source = 'form' THEN 'signup' ELSE source END,
        utm_source = COALESCE(utm_source, profile_record.utm_source),
        utm_medium = COALESCE(utm_medium, profile_record.utm_medium),
        utm_campaign = COALESCE(utm_campaign, profile_record.utm_campaign)
      WHERE email = lower(NEW.email);
    ELSE
      INSERT INTO public.leads (email, name, phone, source, status,
        utm_source, utm_medium, utm_campaign)
      VALUES (
        lower(NEW.email),
        profile_record.full_name,
        profile_record.phone,
        'signup',
        'qualified',
        profile_record.utm_source,
        profile_record.utm_medium,
        profile_record.utm_campaign
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_create_lead_on_email_confirmed ON auth.users;
CREATE TRIGGER trigger_create_lead_on_email_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_lead_on_email_confirmed();
