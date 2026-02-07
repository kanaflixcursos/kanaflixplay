-- Add attachments column to support_ticket_messages table
ALTER TABLE public.support_ticket_messages 
ADD COLUMN attachments jsonb DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.support_ticket_messages.attachments IS 'Array of attachment objects with name, url, type, and size fields';

-- Create storage bucket for support attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('support-attachments', 'support-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for support-attachments bucket
CREATE POLICY "Users can upload support attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'support-attachments' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can view their own support attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'support-attachments' AND
  (
    -- User can view if they're authenticated
    auth.uid() IS NOT NULL
  )
);

CREATE POLICY "Admins can view all support attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'support-attachments' AND
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Users can delete their own support attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'support-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);