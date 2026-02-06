-- Add 'professor' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'professor';

-- Create refund_requests table
CREATE TABLE public.refund_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for refund_requests
CREATE POLICY "Users can view their own refund requests"
ON public.refund_requests
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own refund requests"
ON public.refund_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all refund requests"
ON public.refund_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update refund requests"
ON public.refund_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create support_tickets table
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'feedback',
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'normal',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_tickets
CREATE POLICY "Users can view their own tickets"
ON public.support_tickets
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tickets"
ON public.support_tickets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tickets"
ON public.support_tickets
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all tickets"
ON public.support_tickets
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update any ticket"
ON public.support_tickets
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create support_ticket_messages table for replies
CREATE TABLE public.support_ticket_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  is_admin_reply BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_ticket_messages
CREATE POLICY "Users can view messages of their tickets"
ON public.support_ticket_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE id = support_ticket_messages.ticket_id
    AND user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can create messages on their tickets"
ON public.support_ticket_messages
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE id = support_ticket_messages.ticket_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Admins can create messages on any ticket"
ON public.support_ticket_messages
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at on refund_requests
CREATE TRIGGER update_refund_requests_updated_at
BEFORE UPDATE ON public.refund_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on support_tickets
CREATE TRIGGER update_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to notify user when admin replies to ticket
CREATE OR REPLACE FUNCTION public.notify_on_ticket_reply()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ticket_record RECORD;
  admin_profile RECORD;
BEGIN
  -- Only trigger for admin replies
  IF NEW.is_admin_reply = false THEN
    RETURN NEW;
  END IF;

  -- Get ticket info
  SELECT * INTO ticket_record FROM public.support_tickets WHERE id = NEW.ticket_id;
  
  -- Get admin profile
  SELECT full_name INTO admin_profile FROM public.profiles WHERE user_id = NEW.user_id;

  -- Create notification for ticket owner
  INSERT INTO public.notifications (user_id, type, title, message, link, metadata)
  VALUES (
    ticket_record.user_id,
    'ticket_reply',
    'Resposta do Suporte',
    'Sua solicitação "' || ticket_record.subject || '" recebeu uma resposta.',
    '/suporte?ticket=' || ticket_record.id,
    jsonb_build_object(
      'ticket_id', NEW.ticket_id,
      'message_id', NEW.id,
      'admin_id', NEW.user_id
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_ticket_reply
AFTER INSERT ON public.support_ticket_messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_ticket_reply();

-- Create trigger to notify user when refund is reviewed
CREATE OR REPLACE FUNCTION public.notify_on_refund_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_record RECORD;
  course_record RECORD;
  status_text TEXT;
BEGIN
  -- Only trigger when status changes from pending
  IF OLD.status = NEW.status OR NEW.status = 'pending' THEN
    RETURN NEW;
  END IF;

  -- Get order info
  SELECT * INTO order_record FROM public.orders WHERE id = NEW.order_id;
  
  -- Get course info
  SELECT title INTO course_record FROM public.courses WHERE id = order_record.course_id;

  -- Set status text
  IF NEW.status = 'approved' THEN
    status_text := 'aprovada';
  ELSE
    status_text := 'recusada';
  END IF;

  -- Create notification for user
  INSERT INTO public.notifications (user_id, type, title, message, link, metadata)
  VALUES (
    NEW.user_id,
    'refund_review',
    'Solicitação de Reembolso ' || INITCAP(status_text),
    'Sua solicitação de reembolso para "' || COALESCE(course_record.title, 'o curso') || '" foi ' || status_text || '.',
    '/suporte',
    jsonb_build_object(
      'refund_request_id', NEW.id,
      'order_id', NEW.order_id,
      'status', NEW.status
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_refund_review
AFTER UPDATE ON public.refund_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_refund_review();