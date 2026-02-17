
-- ============================================
-- STEP 0: Drop storage policy that depends on course_id
-- ============================================
DROP POLICY IF EXISTS "Enrolled users can download lesson materials" ON storage.objects;

-- ============================================
-- STEP 1: Drop ALL RLS policies on affected tables
-- ============================================
DROP POLICY IF EXISTS "Admins can manage courses" ON public.courses;
DROP POLICY IF EXISTS "Anyone can view published courses" ON public.courses;
DROP POLICY IF EXISTS "Admins can manage modules" ON public.course_modules;
DROP POLICY IF EXISTS "Anyone can view modules of published courses" ON public.course_modules;
DROP POLICY IF EXISTS "Users can view modules of enrolled courses" ON public.course_modules;
DROP POLICY IF EXISTS "Admins can manage enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Admins can view all enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Users can enroll in free courses only" ON public.course_enrollments;
DROP POLICY IF EXISTS "Users can view their own enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Admins can manage lessons" ON public.lessons;
DROP POLICY IF EXISTS "Users can view lessons of enrolled courses" ON public.lessons;
DROP POLICY IF EXISTS "Users can create lesson comments" ON public.lesson_comments;
DROP POLICY IF EXISTS "Users can view lesson comments" ON public.lesson_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.lesson_comments;
DROP POLICY IF EXISTS "Users can update own comments" ON public.lesson_comments;
DROP POLICY IF EXISTS "Admins can manage lesson materials" ON public.lesson_materials;
DROP POLICY IF EXISTS "Users can view materials of enrolled course lessons" ON public.lesson_materials;
DROP POLICY IF EXISTS "Users can manage their own progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "Admins can view all progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "Admins can manage featured banner" ON public.featured_banner;
DROP POLICY IF EXISTS "Anyone can view featured banner" ON public.featured_banner;
DROP POLICY IF EXISTS "Admins can update any order" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update refund requests" ON public.refund_requests;
DROP POLICY IF EXISTS "Admins can view all refund requests" ON public.refund_requests;
DROP POLICY IF EXISTS "Users can create their own refund requests" ON public.refund_requests;
DROP POLICY IF EXISTS "Users can view their own refund requests" ON public.refund_requests;

-- ============================================
-- STEP 2: Drop all FK constraints
-- ============================================
ALTER TABLE public.course_modules DROP CONSTRAINT IF EXISTS course_modules_course_id_fkey;
ALTER TABLE public.lessons DROP CONSTRAINT IF EXISTS lessons_course_id_fkey;
ALTER TABLE public.featured_banner DROP CONSTRAINT IF EXISTS featured_banner_course_id_fkey;
ALTER TABLE public.course_enrollments DROP CONSTRAINT IF EXISTS course_enrollments_course_id_fkey;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_course_id_fkey;
ALTER TABLE public.refund_requests DROP CONSTRAINT IF EXISTS refund_requests_order_id_fkey;
ALTER TABLE public.lesson_comments DROP CONSTRAINT IF EXISTS lesson_comments_lesson_id_fkey;
ALTER TABLE public.lesson_materials DROP CONSTRAINT IF EXISTS lesson_materials_lesson_id_fkey;
ALTER TABLE public.lesson_progress DROP CONSTRAINT IF EXISTS lesson_progress_lesson_id_fkey;
ALTER TABLE public.lessons DROP CONSTRAINT IF EXISTS lessons_module_id_fkey;

-- Drop views
DROP VIEW IF EXISTS public.user_orders;

-- Drop PKs
ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_pkey;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_pkey;

-- ============================================
-- STEP 3: Alter column types
-- ============================================
ALTER TABLE public.courses ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE public.course_modules ALTER COLUMN course_id TYPE text USING course_id::text;
ALTER TABLE public.lessons ALTER COLUMN course_id TYPE text USING course_id::text;
ALTER TABLE public.featured_banner ALTER COLUMN course_id TYPE text USING course_id::text;
ALTER TABLE public.course_enrollments ALTER COLUMN course_id TYPE text USING course_id::text;
ALTER TABLE public.orders ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE public.orders ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.orders ALTER COLUMN course_id TYPE text USING course_id::text;
ALTER TABLE public.orders DROP COLUMN IF EXISTS pagarme_order_id;
ALTER TABLE public.refund_requests ALTER COLUMN order_id TYPE text USING order_id::text;

-- ============================================
-- STEP 4: Update existing course IDs
-- ============================================
UPDATE public.courses SET id = '10000001' WHERE id = '83b7ad60-d228-4f41-96ae-656bf4a71ce1';
UPDATE public.courses SET id = '10000002' WHERE id = '6c3a00e2-df30-4f93-a5f2-67f1348281d6';
UPDATE public.courses SET id = '10000003' WHERE id = '695b563d-f17d-489f-9b01-55353af7b3d7';
UPDATE public.courses SET id = '10000004' WHERE id = '49b3d92b-ab2c-41c0-99d4-e9e9bc412400';
UPDATE public.courses SET id = '10000005' WHERE id = '737eac6b-a23a-4859-b379-2797e627836d';
UPDATE public.courses SET id = '10000006' WHERE id = 'b1a0d01c-9a58-4f36-b3f7-5c1501a686a2';
UPDATE public.courses SET id = '10000007' WHERE id = '4a79f5dc-37cf-41a2-a62c-727b19bf3955';

UPDATE public.course_modules SET course_id = '10000001' WHERE course_id = '83b7ad60-d228-4f41-96ae-656bf4a71ce1';
UPDATE public.course_modules SET course_id = '10000002' WHERE course_id = '6c3a00e2-df30-4f93-a5f2-67f1348281d6';
UPDATE public.course_modules SET course_id = '10000003' WHERE course_id = '695b563d-f17d-489f-9b01-55353af7b3d7';
UPDATE public.course_modules SET course_id = '10000004' WHERE course_id = '49b3d92b-ab2c-41c0-99d4-e9e9bc412400';
UPDATE public.course_modules SET course_id = '10000005' WHERE course_id = '737eac6b-a23a-4859-b379-2797e627836d';
UPDATE public.course_modules SET course_id = '10000006' WHERE course_id = 'b1a0d01c-9a58-4f36-b3f7-5c1501a686a2';
UPDATE public.course_modules SET course_id = '10000007' WHERE course_id = '4a79f5dc-37cf-41a2-a62c-727b19bf3955';

UPDATE public.lessons SET course_id = '10000001' WHERE course_id = '83b7ad60-d228-4f41-96ae-656bf4a71ce1';
UPDATE public.lessons SET course_id = '10000002' WHERE course_id = '6c3a00e2-df30-4f93-a5f2-67f1348281d6';
UPDATE public.lessons SET course_id = '10000003' WHERE course_id = '695b563d-f17d-489f-9b01-55353af7b3d7';
UPDATE public.lessons SET course_id = '10000004' WHERE course_id = '49b3d92b-ab2c-41c0-99d4-e9e9bc412400';
UPDATE public.lessons SET course_id = '10000005' WHERE course_id = '737eac6b-a23a-4859-b379-2797e627836d';
UPDATE public.lessons SET course_id = '10000006' WHERE course_id = 'b1a0d01c-9a58-4f36-b3f7-5c1501a686a2';
UPDATE public.lessons SET course_id = '10000007' WHERE course_id = '4a79f5dc-37cf-41a2-a62c-727b19bf3955';

UPDATE public.featured_banner SET course_id = '10000001' WHERE course_id = '83b7ad60-d228-4f41-96ae-656bf4a71ce1';
UPDATE public.featured_banner SET course_id = '10000002' WHERE course_id = '6c3a00e2-df30-4f93-a5f2-67f1348281d6';
UPDATE public.featured_banner SET course_id = '10000003' WHERE course_id = '695b563d-f17d-489f-9b01-55353af7b3d7';
UPDATE public.featured_banner SET course_id = '10000004' WHERE course_id = '49b3d92b-ab2c-41c0-99d4-e9e9bc412400';
UPDATE public.featured_banner SET course_id = '10000005' WHERE course_id = '737eac6b-a23a-4859-b379-2797e627836d';
UPDATE public.featured_banner SET course_id = '10000006' WHERE course_id = 'b1a0d01c-9a58-4f36-b3f7-5c1501a686a2';
UPDATE public.featured_banner SET course_id = '10000007' WHERE course_id = '4a79f5dc-37cf-41a2-a62c-727b19bf3955';

-- ============================================
-- STEP 5: Restore PKs, sequences, FKs
-- ============================================
CREATE SEQUENCE IF NOT EXISTS public.course_id_seq START WITH 10000008 MAXVALUE 99999999;
ALTER TABLE public.courses ALTER COLUMN id SET DEFAULT nextval('public.course_id_seq')::text;
ALTER TABLE public.courses ADD PRIMARY KEY (id);
ALTER TABLE public.orders ADD PRIMARY KEY (id);

ALTER TABLE public.course_modules ADD CONSTRAINT course_modules_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id);
ALTER TABLE public.lessons ADD CONSTRAINT lessons_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id);
ALTER TABLE public.lessons ADD CONSTRAINT lessons_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.course_modules(id);
ALTER TABLE public.featured_banner ADD CONSTRAINT featured_banner_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id);
ALTER TABLE public.course_enrollments ADD CONSTRAINT course_enrollments_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id);
ALTER TABLE public.orders ADD CONSTRAINT orders_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id);
ALTER TABLE public.refund_requests ADD CONSTRAINT refund_requests_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);
ALTER TABLE public.lesson_comments ADD CONSTRAINT lesson_comments_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id);
ALTER TABLE public.lesson_materials ADD CONSTRAINT lesson_materials_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id);
ALTER TABLE public.lesson_progress ADD CONSTRAINT lesson_progress_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id);

-- ============================================
-- STEP 6: Recreate ALL RLS policies
-- ============================================
CREATE POLICY "Admins can manage courses" ON public.courses FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view published courses" ON public.courses FOR SELECT USING ((is_published = true) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage modules" ON public.course_modules FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view modules of published courses" ON public.course_modules FOR SELECT USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = course_modules.course_id AND courses.is_published = true));
CREATE POLICY "Users can view modules of enrolled courses" ON public.course_modules FOR SELECT USING ((EXISTS (SELECT 1 FROM course_enrollments WHERE course_enrollments.course_id = course_modules.course_id AND course_enrollments.user_id = auth.uid())) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage enrollments" ON public.course_enrollments FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all enrollments" ON public.course_enrollments FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can enroll in free courses only" ON public.course_enrollments FOR INSERT WITH CHECK ((auth.uid() = user_id) AND (EXISTS (SELECT 1 FROM courses WHERE courses.id = course_enrollments.course_id AND (courses.price IS NULL OR courses.price = 0))));
CREATE POLICY "Users can view their own enrollments" ON public.course_enrollments FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage lessons" ON public.lessons FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view lessons of enrolled courses" ON public.lessons FOR SELECT USING ((EXISTS (SELECT 1 FROM course_enrollments WHERE course_enrollments.course_id = lessons.course_id AND course_enrollments.user_id = auth.uid())) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create lesson comments" ON public.lesson_comments FOR INSERT WITH CHECK ((auth.uid() = user_id) AND (EXISTS (SELECT 1 FROM lessons l JOIN course_enrollments ce ON ce.course_id = l.course_id WHERE l.id = lesson_comments.lesson_id AND ce.user_id = auth.uid())));
CREATE POLICY "Users can view lesson comments" ON public.lesson_comments FOR SELECT USING ((EXISTS (SELECT 1 FROM lessons l JOIN course_enrollments ce ON ce.course_id = l.course_id WHERE l.id = lesson_comments.lesson_id AND ce.user_id = auth.uid())) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can delete own comments" ON public.lesson_comments FOR DELETE USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can update own comments" ON public.lesson_comments FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage lesson materials" ON public.lesson_materials FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view materials of enrolled course lessons" ON public.lesson_materials FOR SELECT USING ((EXISTS (SELECT 1 FROM lessons l JOIN course_enrollments ce ON ce.course_id = l.course_id WHERE l.id = lesson_materials.lesson_id AND ce.user_id = auth.uid())) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can manage their own progress" ON public.lesson_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all progress" ON public.lesson_progress FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage featured banner" ON public.featured_banner FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view featured banner" ON public.featured_banner FOR SELECT USING (true);

CREATE POLICY "Admins can update any order" ON public.orders FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all orders" ON public.orders FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can create their own orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can update refund requests" ON public.refund_requests FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all refund requests" ON public.refund_requests FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can create their own refund requests" ON public.refund_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own refund requests" ON public.refund_requests FOR SELECT USING (auth.uid() = user_id);

-- Recreate storage policy
CREATE POLICY "Enrolled users can download lesson materials" ON storage.objects FOR SELECT USING (
  (bucket_id = 'lesson-materials') AND (
    (EXISTS (
      SELECT 1
      FROM lesson_materials lm
      JOIN lessons l ON l.id = lm.lesson_id
      JOIN course_enrollments ce ON ce.course_id = l.course_id
      WHERE lm.file_url LIKE '%' || objects.name || '%'
        AND ce.user_id = auth.uid()
    )) OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- ============================================
-- STEP 7: Update functions
-- ============================================
CREATE OR REPLACE FUNCTION public.get_public_lesson_count(course_id_param text)
RETURNS bigint
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)
  FROM public.lessons l
  JOIN public.courses c ON c.id = l.course_id
  WHERE l.course_id = course_id_param
    AND l.is_hidden = false
    AND c.is_published = true;
$$;

DROP FUNCTION IF EXISTS public.get_public_lesson_count(uuid);

-- Recreate user_orders view
CREATE VIEW public.user_orders AS
SELECT o.id, o.user_id, o.course_id, o.amount, o.status, o.payment_method,
  o.paid_at, o.pix_qr_code, o.pix_qr_code_url, o.pix_expires_at,
  o.boleto_url, o.boleto_barcode, o.boleto_due_date, o.created_at, o.updated_at
FROM public.orders o
WHERE o.user_id = auth.uid();
