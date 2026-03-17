
-- 1. Add user_id column to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Backfill user_id from profiles (match by email)
UPDATE public.leads l
SET user_id = p.user_id
FROM public.profiles p
WHERE lower(p.email) = lower(l.email)
  AND l.user_id IS NULL;

-- 3. Rename status 'qualified' to 'subscribed' for existing leads
UPDATE public.leads SET status = 'subscribed' WHERE status = 'qualified';

-- 4. Update lead_stage_priority function with new statuses
CREATE OR REPLACE FUNCTION public.lead_stage_priority(stage text)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $$
  SELECT CASE stage
    WHEN 'new' THEN 1
    WHEN 'subscribed' THEN 2
    WHEN 'opportunity' THEN 3
    WHEN 'converted' THEN 4
    ELSE 0
  END;
$$;

-- 5. Update create_lead_on_email_confirmed to use 'subscribed' and set user_id
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
        user_id = NEW.id,
        status = CASE 
          WHEN lead_stage_priority(status) < lead_stage_priority('subscribed') THEN 'subscribed' 
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
      INSERT INTO public.leads (email, name, phone, source, status, user_id,
        utm_source, utm_medium, utm_campaign)
      VALUES (
        lower(NEW.email),
        profile_record.full_name,
        profile_record.phone,
        'signup',
        'subscribed',
        NEW.id,
        profile_record.utm_source,
        profile_record.utm_medium,
        profile_record.utm_campaign
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 6. Update mark_checkout_abandoned: remove lead status change, only create event
CREATE OR REPLACE FUNCTION public.mark_checkout_abandoned()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT DISTINCT ON (cs.visitor_id, (cs.event_data->>'course_id'))
      cs.id,
      cs.visitor_id,
      cs.user_id,
      cs.page_path,
      cs.event_data,
      cs.utm_source,
      cs.utm_medium,
      cs.utm_campaign
    FROM user_events cs
    WHERE cs.event_type = 'checkout_started'
      AND cs.created_at < now() - interval '30 minutes'
      AND NOT EXISTS (
        SELECT 1 FROM user_events cc
        WHERE cc.event_type = 'checkout_completed'
          AND cc.visitor_id = cs.visitor_id
          AND cc.event_data->>'course_id' = cs.event_data->>'course_id'
          AND cc.created_at > cs.created_at
      )
      AND NOT EXISTS (
        SELECT 1 FROM user_events ca
        WHERE ca.event_type = 'checkout_abandoned'
          AND ca.visitor_id = cs.visitor_id
          AND ca.event_data->>'course_id' = cs.event_data->>'course_id'
          AND ca.created_at > cs.created_at
      )
    ORDER BY cs.visitor_id, (cs.event_data->>'course_id'), cs.created_at DESC
  LOOP
    INSERT INTO user_events (visitor_id, user_id, event_type, page_path, event_data, utm_source, utm_medium, utm_campaign)
    VALUES (
      rec.visitor_id,
      rec.user_id,
      'checkout_abandoned',
      rec.page_path,
      rec.event_data,
      rec.utm_source,
      rec.utm_medium,
      rec.utm_campaign
    );
  END LOOP;
END;
$$;

-- 7. Update promote_lead_on_checkout to also match by user_id
CREATE OR REPLACE FUNCTION public.promote_lead_on_checkout(user_email text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.leads
  SET status = 'opportunity'
  WHERE (email = lower(user_email))
    AND lead_stage_priority(status) < lead_stage_priority('opportunity');
END;
$$;

-- 8. Update auto_convert_lead_on_purchase to use user_id
CREATE OR REPLACE FUNCTION public.auto_convert_lead_on_purchase()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') THEN
    -- Try by user_id first, fallback to email
    UPDATE public.leads
    SET status = 'converted', converted_at = now()
    WHERE status != 'converted'
      AND (
        user_id = NEW.user_id
        OR email = (
          SELECT lower(COALESCE(p.email, ''))
          FROM public.profiles p
          WHERE p.user_id = NEW.user_id
          LIMIT 1
        )
      );

    UPDATE public.profiles
    SET utm_source = NULL, utm_medium = NULL, utm_campaign = NULL
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

-- 9. Update convert_lead_on_enrollment to use user_id
CREATE OR REPLACE FUNCTION public.convert_lead_on_enrollment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  user_email text;
BEGIN
  -- Try by user_id first, fallback to email
  UPDATE public.leads
  SET status = 'converted', converted_at = now()
  WHERE user_id = NEW.user_id
    AND lead_stage_priority(status) < lead_stage_priority('converted');

  IF NOT FOUND THEN
    SELECT lower(COALESCE(p.email, '')) INTO user_email
    FROM public.profiles p WHERE p.user_id = NEW.user_id LIMIT 1;

    IF user_email IS NOT NULL AND user_email != '' THEN
      UPDATE public.leads
      SET status = 'converted', converted_at = now(), user_id = NEW.user_id
      WHERE email = user_email
        AND lead_stage_priority(status) < lead_stage_priority('converted');
    END IF;
  END IF;

  UPDATE public.profiles
  SET utm_source = NULL, utm_medium = NULL, utm_campaign = NULL
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$;
