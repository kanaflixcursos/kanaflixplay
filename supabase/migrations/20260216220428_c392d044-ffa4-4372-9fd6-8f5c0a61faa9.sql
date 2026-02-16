-- Fix: support-attachments storage policy is too permissive
-- Currently allows any authenticated user to view ALL attachments
-- Fix: restrict to file owner (by folder path) or admins

DROP POLICY IF EXISTS "Users can view their own support attachments" ON storage.objects;

CREATE POLICY "Users can view their own support attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'support-attachments' AND
  (
    -- User owns the file (files stored in {user_id}/{ticket_id}/{filename})
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    -- Admins can view all attachments
    public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);