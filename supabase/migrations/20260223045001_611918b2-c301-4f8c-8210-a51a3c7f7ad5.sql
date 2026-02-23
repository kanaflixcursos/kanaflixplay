
-- Drop and recreate all public triggers to ensure they exist

-- Profile triggers
DROP TRIGGER IF EXISTS trigger_create_lead_on_profile_complete ON public.profiles;
CREATE TRIGGER trigger_create_lead_on_profile_complete
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_lead_on_profile_complete();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Lead triggers
DROP TRIGGER IF EXISTS trigger_populate_lead_utm ON public.leads;
CREATE TRIGGER trigger_populate_lead_utm
  BEFORE INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.populate_lead_utm_from_profile();

DROP TRIGGER IF EXISTS update_leads_updated_at ON public.leads;
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enrollment trigger
DROP TRIGGER IF EXISTS trigger_convert_lead_on_enrollment ON public.course_enrollments;
CREATE TRIGGER trigger_convert_lead_on_enrollment
  AFTER INSERT ON public.course_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.convert_lead_on_enrollment();

-- Order triggers
DROP TRIGGER IF EXISTS trigger_auto_convert_lead_on_purchase ON public.orders;
CREATE TRIGGER trigger_auto_convert_lead_on_purchase
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.auto_convert_lead_on_purchase();

DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Support triggers
DROP TRIGGER IF EXISTS trigger_notify_on_ticket_reply ON public.support_ticket_messages;
CREATE TRIGGER trigger_notify_on_ticket_reply
  AFTER INSERT ON public.support_ticket_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_ticket_reply();

DROP TRIGGER IF EXISTS trigger_notify_on_refund_review ON public.refund_requests;
CREATE TRIGGER trigger_notify_on_refund_review
  AFTER UPDATE ON public.refund_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_refund_review();

DROP TRIGGER IF EXISTS update_refund_requests_updated_at ON public.refund_requests;
CREATE TRIGGER update_refund_requests_updated_at
  BEFORE UPDATE ON public.refund_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Comment trigger
DROP TRIGGER IF EXISTS trigger_notify_on_comment_reply ON public.lesson_comments;
CREATE TRIGGER trigger_notify_on_comment_reply
  AFTER INSERT ON public.lesson_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment_reply();

-- Auth triggers (recreate to ensure they exist)
DROP TRIGGER IF EXISTS on_auth_user_email_sync ON auth.users;
CREATE TRIGGER on_auth_user_email_sync
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_email_sync();
