-- Table for creator team members (creators can grant admin access to their students)
CREATE TABLE public.creator_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(creator_id, user_id)
);

ALTER TABLE public.creator_admins ENABLE ROW LEVEL SECURITY;

-- Creator owner can manage their team
CREATE POLICY "Creator owner can manage team"
ON public.creator_admins
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.creators
    WHERE creators.id = creator_admins.creator_id
    AND creators.user_id = auth.uid()
  )
);

-- Super admins can manage all
CREATE POLICY "Super admins can manage all creator admins"
ON public.creator_admins
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Team members can view their own membership
CREATE POLICY "Users can view their own team membership"
ON public.creator_admins
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);