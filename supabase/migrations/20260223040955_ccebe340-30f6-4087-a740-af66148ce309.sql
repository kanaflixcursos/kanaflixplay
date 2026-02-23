
-- Re-create all marketing triggers that are missing

-- 1. Lead creation on profile complete
DROP TRIGGER IF EXISTS trigger_create_lead_on_profile_complete ON public.profiles;
CREATE TRIGGER trigger_create_lead_on_profile_complete
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_lead_on_profile_complete();

-- 2. UTM population on lead insert
DROP TRIGGER IF EXISTS trigger_populate_lead_utm ON public.leads;
CREATE TRIGGER trigger_populate_lead_utm
  BEFORE INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.populate_lead_utm_from_profile();

-- 3. Convert lead on enrollment
DROP TRIGGER IF EXISTS trigger_convert_lead_on_enrollment ON public.course_enrollments;
CREATE TRIGGER trigger_convert_lead_on_enrollment
  AFTER INSERT ON public.course_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.convert_lead_on_enrollment();

-- 4. Auto convert lead on purchase
DROP TRIGGER IF EXISTS trigger_auto_convert_lead_on_purchase ON public.orders;
CREATE TRIGGER trigger_auto_convert_lead_on_purchase
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_convert_lead_on_purchase();

-- 5. Ensure handle_new_user trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 6. Ensure email sync trigger exists
DROP TRIGGER IF EXISTS on_auth_user_email_sync ON auth.users;
CREATE TRIGGER on_auth_user_email_sync
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_email_sync();
