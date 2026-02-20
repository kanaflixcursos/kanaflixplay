
-- Add course_ids array column to support multiple courses
ALTER TABLE public.discount_coupons ADD COLUMN course_ids text[] NOT NULL DEFAULT '{}';

-- Migrate existing course_id data to course_ids
UPDATE public.discount_coupons 
SET course_ids = ARRAY[course_id] 
WHERE course_id IS NOT NULL;
