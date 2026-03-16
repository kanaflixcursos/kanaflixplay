
-- Combos table
CREATE TABLE public.combos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  thumbnail_url text,
  price integer NOT NULL DEFAULT 0,
  max_installments integer NOT NULL DEFAULT 12,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Combo courses junction table
CREATE TABLE public.combo_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_id uuid NOT NULL REFERENCES public.combos(id) ON DELETE CASCADE,
  course_id text NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (combo_id, course_id)
);

-- Add combo_id to orders table
ALTER TABLE public.orders ADD COLUMN combo_id uuid REFERENCES public.combos(id);

-- Enable RLS
ALTER TABLE public.combos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combo_courses ENABLE ROW LEVEL SECURITY;

-- RLS for combos
CREATE POLICY "Admins can manage combos" ON public.combos FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view active combos" ON public.combos FOR SELECT USING (is_active = true);

-- RLS for combo_courses
CREATE POLICY "Admins can manage combo courses" ON public.combo_courses FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view combo courses of active combos" ON public.combo_courses FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.combos WHERE combos.id = combo_courses.combo_id AND combos.is_active = true)
);

-- Updated_at trigger for combos
CREATE TRIGGER update_combos_updated_at
  BEFORE UPDATE ON public.combos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
