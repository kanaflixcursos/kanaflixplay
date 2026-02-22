
-- Helper: retorna prioridade do estágio do funil
CREATE OR REPLACE FUNCTION public.lead_stage_priority(stage text)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT CASE stage
    WHEN 'new' THEN 1
    WHEN 'qualified' THEN 2
    WHEN 'opportunity' THEN 3
    WHEN 'converted' THEN 4
    ELSE 0
  END;
$$;

-- 1. Criar lead quando perfil é completado (phone + birth_date preenchidos)
CREATE OR REPLACE FUNCTION public.create_lead_on_profile_complete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.phone IS NOT NULL AND NEW.birth_date IS NOT NULL
     AND NEW.email IS NOT NULL AND NEW.email != ''
     AND (OLD.phone IS NULL OR OLD.birth_date IS NULL) THEN

    IF NOT EXISTS (SELECT 1 FROM public.leads WHERE email = lower(NEW.email)) THEN
      INSERT INTO public.leads (email, name, phone, source, status)
      VALUES (lower(NEW.email), NEW.full_name, NEW.phone, 'signup', 'new');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_lead_on_profile_complete
AFTER UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_lead_on_profile_complete();

-- 2. Converter lead quando matriculado em qualquer curso (gratuito ou pago)
CREATE OR REPLACE FUNCTION public.convert_lead_on_enrollment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
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
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_convert_lead_on_enrollment
AFTER INSERT ON public.course_enrollments
FOR EACH ROW
EXECUTE FUNCTION public.convert_lead_on_enrollment();

-- 3. RPC para promover lead a "opportunity" quando visita checkout
CREATE OR REPLACE FUNCTION public.promote_lead_on_checkout(user_email text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.leads
  SET status = 'opportunity'
  WHERE email = lower(user_email)
    AND lead_stage_priority(status) < lead_stage_priority('opportunity');
END;
$$;
