
-- Table to store imported users from CSV (Hotmart migration)
CREATE TABLE public.imported_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  course_ids TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  auth_user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for quick email lookups
CREATE UNIQUE INDEX idx_imported_users_email ON public.imported_users (LOWER(email));

-- Enable RLS
ALTER TABLE public.imported_users ENABLE ROW LEVEL SECURITY;

-- Only admins can manage imported users
CREATE POLICY "Admins can manage imported users"
ON public.imported_users
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Edge functions with service role need access too (no RLS bypass needed since service role bypasses RLS)

-- Trigger for updated_at
CREATE TRIGGER update_imported_users_updated_at
BEFORE UPDATE ON public.imported_users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
