
-- Add buyer_email to orders for guest checkout
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS buyer_email text;

-- Allow anon users to insert orders (for guest checkout)
CREATE POLICY "Anyone can create orders with buyer_email"
ON public.orders
FOR INSERT
TO public
WITH CHECK (buyer_email IS NOT NULL AND user_id IS NULL);

-- Allow anon users to view their own orders by buyer_email (for payment result)
CREATE POLICY "Anon can view orders by buyer_email"
ON public.orders
FOR SELECT
TO public
USING (buyer_email IS NOT NULL AND user_id IS NULL);

-- Function to link guest orders to user on email confirmation
CREATE OR REPLACE FUNCTION public.link_guest_orders_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  order_record RECORD;
  combo_record RECORD;
BEGIN
  -- Only trigger when email is confirmed
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    -- Find all paid guest orders with matching email
    FOR order_record IN
      SELECT * FROM public.orders
      WHERE buyer_email = lower(NEW.email)
        AND user_id IS NULL
        AND status = 'paid'
    LOOP
      -- Link order to user
      UPDATE public.orders
      SET user_id = NEW.id
      WHERE id = order_record.id;

      -- Enroll in courses
      IF order_record.combo_id IS NOT NULL THEN
        -- Combo: enroll in all combo courses
        FOR combo_record IN
          SELECT course_id FROM public.combo_courses WHERE combo_id = order_record.combo_id
        LOOP
          INSERT INTO public.course_enrollments (user_id, course_id, expires_at)
          VALUES (NEW.id, combo_record.course_id, now() + interval '1 year')
          ON CONFLICT DO NOTHING;
        END LOOP;
      ELSIF order_record.course_id IS NOT NULL THEN
        -- Single course enrollment
        INSERT INTO public.course_enrollments (user_id, course_id, expires_at)
        VALUES (NEW.id, order_record.course_id, now() + interval '1 year')
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;

    -- Also handle pending PIX/boleto orders - link them so webhooks can process later
    UPDATE public.orders
    SET user_id = NEW.id
    WHERE buyer_email = lower(NEW.email)
      AND user_id IS NULL
      AND status = 'pending';
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on auth.users for email confirmation
CREATE TRIGGER on_email_confirmed_link_orders
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.link_guest_orders_on_signup();
