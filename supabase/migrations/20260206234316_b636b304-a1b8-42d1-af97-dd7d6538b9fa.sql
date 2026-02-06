-- Create trigger to notify admins when a new support ticket is created
CREATE OR REPLACE FUNCTION public.notify_admins_on_new_ticket()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  admin_user RECORD;
BEGIN
  -- Get all admin users
  FOR admin_user IN 
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    -- Create notification for each admin
    INSERT INTO public.notifications (user_id, type, title, message, link, metadata)
    VALUES (
      admin_user.user_id,
      'support_ticket',
      'Nova solicitação de suporte',
      'Um novo ticket de suporte foi aberto: "' || NEW.subject || '"',
      '/admin/suporte?ticket=' || NEW.id,
      jsonb_build_object(
        'ticket_id', NEW.id,
        'category', NEW.category,
        'user_id', NEW.user_id
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS notify_admins_on_new_ticket ON public.support_tickets;
CREATE TRIGGER notify_admins_on_new_ticket
  AFTER INSERT ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_on_new_ticket();

-- Also notify admins when user replies to a ticket
CREATE OR REPLACE FUNCTION public.notify_admins_on_ticket_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  admin_user RECORD;
  ticket_record RECORD;
  user_profile RECORD;
BEGIN
  -- Only trigger for user replies (not admin replies)
  IF NEW.is_admin_reply = true THEN
    RETURN NEW;
  END IF;

  -- Get ticket info
  SELECT * INTO ticket_record FROM public.support_tickets WHERE id = NEW.ticket_id;
  
  -- Get user profile
  SELECT full_name INTO user_profile FROM public.profiles WHERE user_id = NEW.user_id;

  -- Get all admin users
  FOR admin_user IN 
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    -- Create notification for each admin
    INSERT INTO public.notifications (user_id, type, title, message, link, metadata)
    VALUES (
      admin_user.user_id,
      'support_message',
      'Nova mensagem no suporte',
      COALESCE(user_profile.full_name, 'Usuário') || ' respondeu ao ticket: "' || ticket_record.subject || '"',
      '/admin/suporte?ticket=' || ticket_record.id,
      jsonb_build_object(
        'ticket_id', NEW.ticket_id,
        'message_id', NEW.id,
        'user_id', NEW.user_id
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS notify_admins_on_ticket_message ON public.support_ticket_messages;
CREATE TRIGGER notify_admins_on_ticket_message
  AFTER INSERT ON public.support_ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_on_ticket_message();