
-- COURSES
DROP POLICY IF EXISTS "Admins can manage courses" ON public.courses;
CREATE POLICY "Admins and creators can manage courses"
  ON public.courses FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR (creator_id = get_creator_id(auth.uid())));

-- COURSE_MODULES
DROP POLICY IF EXISTS "Admins can manage modules" ON public.course_modules;
CREATE POLICY "Admins and creators can manage modules"
  ON public.course_modules FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR (creator_id = get_creator_id(auth.uid())));

-- LESSONS
DROP POLICY IF EXISTS "Admins can manage lessons" ON public.lessons;
CREATE POLICY "Admins and creators can manage lessons"
  ON public.lessons FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR (creator_id = get_creator_id(auth.uid())));

-- COMBOS
DROP POLICY IF EXISTS "Admins can manage combos" ON public.combos;
CREATE POLICY "Admins and creators can manage combos"
  ON public.combos FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR (creator_id = get_creator_id(auth.uid())));

-- ORDERS
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
CREATE POLICY "Admins and creators can view orders"
  ON public.orders FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR (creator_id = get_creator_id(auth.uid())) OR (auth.uid() = user_id) OR (buyer_email IS NOT NULL AND user_id IS NULL));

DROP POLICY IF EXISTS "Admins can update any order" ON public.orders;
CREATE POLICY "Admins and creators can update orders"
  ON public.orders FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR (creator_id = get_creator_id(auth.uid())));

-- COURSE_ENROLLMENTS
DROP POLICY IF EXISTS "Admins can manage enrollments" ON public.course_enrollments;
CREATE POLICY "Admins and creators can manage enrollments"
  ON public.course_enrollments FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR (creator_id = get_creator_id(auth.uid())));

DROP POLICY IF EXISTS "Admins can view all enrollments" ON public.course_enrollments;
CREATE POLICY "Admins and creators can view all enrollments"
  ON public.course_enrollments FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR (creator_id = get_creator_id(auth.uid())));

-- DISCOUNT_COUPONS
DROP POLICY IF EXISTS "Admins can manage coupons" ON public.discount_coupons;
CREATE POLICY "Admins and creators can manage coupons"
  ON public.discount_coupons FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR (creator_id = get_creator_id(auth.uid())));

-- LEADS
DROP POLICY IF EXISTS "Admins can manage leads" ON public.leads;
CREATE POLICY "Admins and creators can manage leads"
  ON public.leads FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR (creator_id = get_creator_id(auth.uid())));

-- LEAD_FORMS
DROP POLICY IF EXISTS "Admins can manage lead forms" ON public.lead_forms;
CREATE POLICY "Admins and creators can manage lead forms"
  ON public.lead_forms FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR (creator_id = get_creator_id(auth.uid())));

-- EMAIL_CAMPAIGNS
DROP POLICY IF EXISTS "Admins can manage email campaigns" ON public.email_campaigns;
CREATE POLICY "Admins and creators can manage email campaigns"
  ON public.email_campaigns FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR (creator_id = get_creator_id(auth.uid())));

-- EMAIL_OPENS
DROP POLICY IF EXISTS "Admins can manage email opens" ON public.email_opens;
CREATE POLICY "Admins and creators can manage email opens"
  ON public.email_opens FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR (creator_id = get_creator_id(auth.uid())));

-- FEATURED_BANNER
DROP POLICY IF EXISTS "Admins can manage featured banner" ON public.featured_banner;
CREATE POLICY "Admins and creators can manage featured banner"
  ON public.featured_banner FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR (creator_id = get_creator_id(auth.uid())));

-- LESSON_COMMENTS (update view policy)
DROP POLICY IF EXISTS "Users can view lesson comments" ON public.lesson_comments;
CREATE POLICY "Users can view lesson comments"
  ON public.lesson_comments FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM lessons l JOIN course_enrollments ce ON ce.course_id = l.course_id WHERE l.id = lesson_comments.lesson_id AND ce.user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (creator_id = get_creator_id(auth.uid()))
  );

-- LESSON_MATERIALS
DROP POLICY IF EXISTS "Admins can manage lesson materials" ON public.lesson_materials;
CREATE POLICY "Admins and creators can manage lesson materials"
  ON public.lesson_materials FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR (creator_id = get_creator_id(auth.uid())));

-- LESSON_PROGRESS
DROP POLICY IF EXISTS "Admins can view all progress" ON public.lesson_progress;
CREATE POLICY "Admins and creators can view all progress"
  ON public.lesson_progress FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR (creator_id = get_creator_id(auth.uid())) OR (auth.uid() = user_id));

-- SUPPORT_TICKETS
DROP POLICY IF EXISTS "Admins can view all tickets" ON public.support_tickets;
CREATE POLICY "Admins and creators can view all tickets"
  ON public.support_tickets FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR (creator_id = get_creator_id(auth.uid())) OR (auth.uid() = user_id));

DROP POLICY IF EXISTS "Admins can update any ticket" ON public.support_tickets;
CREATE POLICY "Admins and creators can update any ticket"
  ON public.support_tickets FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR (creator_id = get_creator_id(auth.uid())) OR (auth.uid() = user_id));

-- REFUND_REQUESTS
DROP POLICY IF EXISTS "Admins can view all refund requests" ON public.refund_requests;
CREATE POLICY "Admins and creators can view all refund requests"
  ON public.refund_requests FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR (creator_id = get_creator_id(auth.uid())) OR (auth.uid() = user_id));

DROP POLICY IF EXISTS "Admins can update refund requests" ON public.refund_requests;
CREATE POLICY "Admins and creators can update refund requests"
  ON public.refund_requests FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR (creator_id = get_creator_id(auth.uid())));

-- SITE_VISITS
DROP POLICY IF EXISTS "Admins can read visits" ON public.site_visits;
CREATE POLICY "Admins and creators can read visits"
  ON public.site_visits FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR (creator_id = get_creator_id(auth.uid())));

-- USER_EVENTS
DROP POLICY IF EXISTS "Admins can view all events" ON public.user_events;
CREATE POLICY "Admins and creators can view all events"
  ON public.user_events FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR (creator_id = get_creator_id(auth.uid())));

-- COMBO_COURSES
DROP POLICY IF EXISTS "Admins can manage combo courses" ON public.combo_courses;
CREATE POLICY "Admins and creators can manage combo courses"
  ON public.combo_courses FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.combos WHERE combos.id = combo_courses.combo_id AND combos.creator_id = get_creator_id(auth.uid()))
  );

-- PROFILES (admins + creators can view their enrolled students)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (auth.uid() = user_id)
    OR EXISTS (SELECT 1 FROM public.course_enrollments ce WHERE ce.user_id = profiles.user_id AND ce.creator_id = get_creator_id(auth.uid()))
  );

-- IMPORTED_USERS
DROP POLICY IF EXISTS "Admins can manage imported users" ON public.imported_users;
CREATE POLICY "Admins and creators can manage imported users"
  ON public.imported_users FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));
