
-- Trigger to auto-convert leads when an order is paid
CREATE OR REPLACE FUNCTION public.auto_convert_lead_on_purchase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only act when status changes to 'paid'
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') THEN
    -- Find lead by email (from the buyer's profile) and mark as converted
    UPDATE public.leads
    SET status = 'converted', converted_at = now()
    WHERE status != 'converted'
      AND email = (
        SELECT lower(COALESCE(p.email, ''))
        FROM public.profiles p
        WHERE p.user_id = NEW.user_id
        LIMIT 1
      );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_convert_lead_on_purchase
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.auto_convert_lead_on_purchase();
