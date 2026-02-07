-- Drop the trigger and function that notifies admins on ticket messages
-- Admins should only see the badge count in the sidebar, not receive notifications

DROP TRIGGER IF EXISTS notify_admins_on_ticket_message ON public.support_ticket_messages;
DROP FUNCTION IF EXISTS public.notify_admins_on_ticket_message();

-- Also drop the trigger that notifies admins on new tickets (keep only sidebar badge)
DROP TRIGGER IF EXISTS notify_admins_on_new_ticket ON public.support_tickets;
DROP FUNCTION IF EXISTS public.notify_admins_on_new_ticket();