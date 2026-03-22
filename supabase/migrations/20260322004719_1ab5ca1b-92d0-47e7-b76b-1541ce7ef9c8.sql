
-- 1. Add 'creator' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'creator';

-- 2. Create creators table
CREATE TABLE public.creators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'active', 'suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Create creator_settings table (per-creator secrets & branding)
CREATE TABLE public.creator_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE UNIQUE,
  -- Branding
  primary_color text DEFAULT 'emerald',
  platform_name text,
  platform_description text,
  logo_url text,
  -- Secrets (encrypted at rest by Supabase)
  pandavideo_api_key text,
  resend_api_key text,
  sender_name text,
  sender_email text,
  -- GTM
  gtm_container_id text,
  -- Production URL / custom domain
  production_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Add creator_id to all relevant tables (nullable for backward compat during migration)
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES public.creators(id);
ALTER TABLE public.course_modules ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES public.creators(id);
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES public.creators(id);
ALTER TABLE public.combos ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES public.creators(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES public.creators(id);
ALTER TABLE public.course_enrollments ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES public.creators(id);
ALTER TABLE public.discount_coupons ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES public.creators(id);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES public.creators(id);
ALTER TABLE public.lead_forms ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES public.creators(id);
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES public.creators(id);
ALTER TABLE public.featured_banner ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES public.creators(id);
ALTER TABLE public.site_visits ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES public.creators(id);
ALTER TABLE public.user_events ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES public.creators(id);
ALTER TABLE public.lesson_comments ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES public.creators(id);
ALTER TABLE public.lesson_materials ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES public.creators(id);
ALTER TABLE public.lesson_progress ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES public.creators(id);
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES public.creators(id);
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES public.creators(id);
ALTER TABLE public.support_ticket_messages ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES public.creators(id);
ALTER TABLE public.refund_requests ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES public.creators(id);

-- 5. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_courses_creator_id ON public.courses(creator_id);
CREATE INDEX IF NOT EXISTS idx_orders_creator_id ON public.orders(creator_id);
CREATE INDEX IF NOT EXISTS idx_leads_creator_id ON public.leads(creator_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_creator_id ON public.course_enrollments(creator_id);
CREATE INDEX IF NOT EXISTS idx_user_events_creator_id ON public.user_events(creator_id);
CREATE INDEX IF NOT EXISTS idx_site_visits_creator_id ON public.site_visits(creator_id);
CREATE INDEX IF NOT EXISTS idx_creators_slug ON public.creators(slug);
CREATE INDEX IF NOT EXISTS idx_creators_user_id ON public.creators(user_id);

-- 6. Updated_at triggers
CREATE TRIGGER update_creators_updated_at BEFORE UPDATE ON public.creators
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_creator_settings_updated_at BEFORE UPDATE ON public.creator_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. RLS on creators
ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage all creators"
  ON public.creators FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Creators can view their own record"
  ON public.creators FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view active creators"
  ON public.creators FOR SELECT
  USING (status = 'active');

-- 8. RLS on creator_settings
ALTER TABLE public.creator_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage all creator settings"
  ON public.creator_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Creators can view their own settings"
  ON public.creator_settings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.creators
    WHERE creators.id = creator_settings.creator_id
      AND creators.user_id = auth.uid()
  ));

CREATE POLICY "Creators can update their own settings"
  ON public.creator_settings FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.creators
    WHERE creators.id = creator_settings.creator_id
      AND creators.user_id = auth.uid()
  ));

-- 9. Helper function to get creator_id for current user
CREATE OR REPLACE FUNCTION public.get_creator_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.creators WHERE user_id = _user_id LIMIT 1;
$$;

-- 10. Helper function to check if user is creator or admin
CREATE OR REPLACE FUNCTION public.is_creator_or_admin(_user_id uuid, _creator_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM public.creators WHERE id = _creator_id AND user_id = _user_id AND status = 'active'
  );
$$;
