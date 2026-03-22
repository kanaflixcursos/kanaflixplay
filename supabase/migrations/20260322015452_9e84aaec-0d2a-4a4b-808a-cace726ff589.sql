
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_creator_id uuid;
BEGIN
  -- Resolve creator_id from metadata (set during store signup)
  IF NEW.raw_user_meta_data->>'creator_id' IS NOT NULL THEN
    v_creator_id := (NEW.raw_user_meta_data->>'creator_id')::uuid;
  END IF;

  INSERT INTO public.profiles (user_id, full_name, phone, birth_date, email, utm_source, utm_medium, utm_campaign, creator_id)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    CASE 
      WHEN NEW.raw_user_meta_data->>'birth_date' IS NOT NULL 
           AND NEW.raw_user_meta_data->>'birth_date' != ''
      THEN (NEW.raw_user_meta_data->>'birth_date')::date
      ELSE NULL
    END,
    NEW.email,
    NULLIF(NEW.raw_user_meta_data->>'utm_source', ''),
    NULLIF(NEW.raw_user_meta_data->>'utm_medium', ''),
    NULLIF(NEW.raw_user_meta_data->>'utm_campaign', ''),
    v_creator_id
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    birth_date = COALESCE(EXCLUDED.birth_date, profiles.birth_date),
    email = COALESCE(EXCLUDED.email, profiles.email),
    utm_source = COALESCE(EXCLUDED.utm_source, profiles.utm_source),
    utm_medium = COALESCE(EXCLUDED.utm_medium, profiles.utm_medium),
    utm_campaign = COALESCE(EXCLUDED.utm_campaign, profiles.utm_campaign),
    creator_id = COALESCE(EXCLUDED.creator_id, profiles.creator_id);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student')
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$function$;
