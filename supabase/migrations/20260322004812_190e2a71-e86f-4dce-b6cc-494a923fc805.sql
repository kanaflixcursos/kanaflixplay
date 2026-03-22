
-- 1. Insert default Kanaflix creator
INSERT INTO public.creators (id, user_id, name, slug, description, status)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  '966d4955-8337-4c4e-944f-3782ad0a227a',
  'Kanaflix',
  'kanaflix',
  'Plataforma principal Kanaflix',
  'active'
);

-- 2. Insert default creator_settings
INSERT INTO public.creator_settings (creator_id, primary_color, platform_name, platform_description)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'emerald',
  'Kanaflix',
  'Plataforma de cursos online'
);

-- 3. Migrate all existing data to default creator
UPDATE public.courses SET creator_id = 'a0000000-0000-0000-0000-000000000001' WHERE creator_id IS NULL;
UPDATE public.combos SET creator_id = 'a0000000-0000-0000-0000-000000000001' WHERE creator_id IS NULL;
UPDATE public.orders SET creator_id = 'a0000000-0000-0000-0000-000000000001' WHERE creator_id IS NULL;
UPDATE public.course_enrollments SET creator_id = 'a0000000-0000-0000-0000-000000000001' WHERE creator_id IS NULL;
UPDATE public.discount_coupons SET creator_id = 'a0000000-0000-0000-0000-000000000001' WHERE creator_id IS NULL;
UPDATE public.leads SET creator_id = 'a0000000-0000-0000-0000-000000000001' WHERE creator_id IS NULL;
UPDATE public.lead_forms SET creator_id = 'a0000000-0000-0000-0000-000000000001' WHERE creator_id IS NULL;
UPDATE public.email_campaigns SET creator_id = 'a0000000-0000-0000-0000-000000000001' WHERE creator_id IS NULL;
UPDATE public.featured_banner SET creator_id = 'a0000000-0000-0000-0000-000000000001' WHERE creator_id IS NULL;
UPDATE public.site_visits SET creator_id = 'a0000000-0000-0000-0000-000000000001' WHERE creator_id IS NULL;
UPDATE public.user_events SET creator_id = 'a0000000-0000-0000-0000-000000000001' WHERE creator_id IS NULL;
UPDATE public.notifications SET creator_id = 'a0000000-0000-0000-0000-000000000001' WHERE creator_id IS NULL;
UPDATE public.support_tickets SET creator_id = 'a0000000-0000-0000-0000-000000000001' WHERE creator_id IS NULL;
UPDATE public.refund_requests SET creator_id = 'a0000000-0000-0000-0000-000000000001' WHERE creator_id IS NULL;

-- 4. Update course_modules and lessons via courses
UPDATE public.course_modules cm SET creator_id = 'a0000000-0000-0000-0000-000000000001' WHERE creator_id IS NULL;
UPDATE public.lessons SET creator_id = 'a0000000-0000-0000-0000-000000000001' WHERE creator_id IS NULL;
UPDATE public.lesson_comments SET creator_id = 'a0000000-0000-0000-0000-000000000001' WHERE creator_id IS NULL;
UPDATE public.lesson_materials SET creator_id = 'a0000000-0000-0000-0000-000000000001' WHERE creator_id IS NULL;
UPDATE public.lesson_progress SET creator_id = 'a0000000-0000-0000-0000-000000000001' WHERE creator_id IS NULL;
UPDATE public.support_ticket_messages SET creator_id = 'a0000000-0000-0000-0000-000000000001' WHERE creator_id IS NULL;

-- 5. Now make creator_id NOT NULL on core tables (with default for backward compat)
ALTER TABLE public.courses ALTER COLUMN creator_id SET DEFAULT 'a0000000-0000-0000-0000-000000000001';
ALTER TABLE public.courses ALTER COLUMN creator_id SET NOT NULL;
ALTER TABLE public.combos ALTER COLUMN creator_id SET DEFAULT 'a0000000-0000-0000-0000-000000000001';
ALTER TABLE public.combos ALTER COLUMN creator_id SET NOT NULL;
ALTER TABLE public.orders ALTER COLUMN creator_id SET DEFAULT 'a0000000-0000-0000-0000-000000000001';
ALTER TABLE public.orders ALTER COLUMN creator_id SET NOT NULL;
ALTER TABLE public.course_enrollments ALTER COLUMN creator_id SET DEFAULT 'a0000000-0000-0000-0000-000000000001';
ALTER TABLE public.course_enrollments ALTER COLUMN creator_id SET NOT NULL;
ALTER TABLE public.course_modules ALTER COLUMN creator_id SET DEFAULT 'a0000000-0000-0000-0000-000000000001';
ALTER TABLE public.course_modules ALTER COLUMN creator_id SET NOT NULL;
ALTER TABLE public.lessons ALTER COLUMN creator_id SET DEFAULT 'a0000000-0000-0000-0000-000000000001';
ALTER TABLE public.lessons ALTER COLUMN creator_id SET NOT NULL;
ALTER TABLE public.leads ALTER COLUMN creator_id SET DEFAULT 'a0000000-0000-0000-0000-000000000001';
ALTER TABLE public.leads ALTER COLUMN creator_id SET NOT NULL;
ALTER TABLE public.lead_forms ALTER COLUMN creator_id SET DEFAULT 'a0000000-0000-0000-0000-000000000001';
ALTER TABLE public.lead_forms ALTER COLUMN creator_id SET NOT NULL;
ALTER TABLE public.discount_coupons ALTER COLUMN creator_id SET DEFAULT 'a0000000-0000-0000-0000-000000000001';
ALTER TABLE public.discount_coupons ALTER COLUMN creator_id SET NOT NULL;
ALTER TABLE public.email_campaigns ALTER COLUMN creator_id SET DEFAULT 'a0000000-0000-0000-0000-000000000001';
ALTER TABLE public.email_campaigns ALTER COLUMN creator_id SET NOT NULL;
ALTER TABLE public.featured_banner ALTER COLUMN creator_id SET DEFAULT 'a0000000-0000-0000-0000-000000000001';
ALTER TABLE public.featured_banner ALTER COLUMN creator_id SET NOT NULL;
