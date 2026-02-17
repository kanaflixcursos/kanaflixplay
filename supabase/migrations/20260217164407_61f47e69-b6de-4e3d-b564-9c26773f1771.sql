
-- Lead capture forms
CREATE TABLE public.lead_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  slug text NOT NULL UNIQUE,
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  redirect_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage lead forms"
  ON public.lead_forms FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active lead forms"
  ON public.lead_forms FOR SELECT
  USING (is_active = true);

CREATE TRIGGER update_lead_forms_updated_at
  BEFORE UPDATE ON public.lead_forms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Leads table
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid REFERENCES public.lead_forms(id) ON DELETE SET NULL,
  name text,
  email text NOT NULL,
  phone text,
  source text NOT NULL DEFAULT 'form',
  status text NOT NULL DEFAULT 'new',
  tags text[] NOT NULL DEFAULT '{}'::text[],
  custom_data jsonb DEFAULT '{}'::jsonb,
  converted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage leads"
  ON public.leads FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can insert leads via forms"
  ON public.leads FOR INSERT
  WITH CHECK (true);

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_leads_email ON public.leads(email);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_form_id ON public.leads(form_id);
CREATE INDEX idx_leads_created_at ON public.leads(created_at DESC);
