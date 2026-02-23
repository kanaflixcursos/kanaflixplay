
-- =============================================
-- RE-CREATE ALL MISSING TRIGGERS
-- =============================================

-- 1. Profile creation on auth signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 2. Email sync on auth user changes
CREATE OR REPLACE TRIGGER on_auth_user_email_sync
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_email_sync();

-- 3. Lead creation when profile is completed (phone + birth_date filled)
CREATE OR REPLACE TRIGGER trigger_create_lead_on_profile_complete
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_lead_on_profile_complete();

-- 4. Populate lead UTM from profile when lead is created
CREATE OR REPLACE TRIGGER trigger_populate_lead_utm
  BEFORE INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.populate_lead_utm_from_profile();

-- 5. Convert lead when user enrolls in a course
CREATE OR REPLACE TRIGGER trigger_convert_lead_on_enrollment
  AFTER INSERT ON public.course_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.convert_lead_on_enrollment();

-- 6. Convert lead when order is paid
CREATE OR REPLACE TRIGGER trigger_auto_convert_lead_on_purchase
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_convert_lead_on_purchase();

-- 7. Notification triggers
CREATE OR REPLACE TRIGGER trigger_notify_on_comment_reply
  AFTER INSERT ON public.lesson_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_comment_reply();

CREATE OR REPLACE TRIGGER trigger_notify_on_ticket_reply
  AFTER INSERT ON public.support_ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_ticket_reply();

CREATE OR REPLACE TRIGGER trigger_notify_on_refund_review
  AFTER UPDATE ON public.refund_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_refund_review();

-- 8. Updated_at triggers
CREATE OR REPLACE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
