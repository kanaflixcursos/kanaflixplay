
-- Ensure the trigger for lead creation on profile complete exists
DROP TRIGGER IF EXISTS trigger_create_lead_on_profile_complete ON public.profiles;
CREATE TRIGGER trigger_create_lead_on_profile_complete
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_lead_on_profile_complete();

-- Ensure the trigger for UTM population on lead insert exists
DROP TRIGGER IF EXISTS trigger_populate_lead_utm ON public.leads;
CREATE TRIGGER trigger_populate_lead_utm
  BEFORE INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.populate_lead_utm_from_profile();

-- Ensure convert lead on enrollment trigger exists
DROP TRIGGER IF EXISTS trigger_convert_lead_on_enrollment ON public.course_enrollments;
CREATE TRIGGER trigger_convert_lead_on_enrollment
  AFTER INSERT ON public.course_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.convert_lead_on_enrollment();

-- Ensure auto convert lead on purchase trigger exists  
DROP TRIGGER IF EXISTS trigger_auto_convert_lead_on_purchase ON public.orders;
CREATE TRIGGER trigger_auto_convert_lead_on_purchase
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_convert_lead_on_purchase();
