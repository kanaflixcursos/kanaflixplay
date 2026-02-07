-- Remove enrollment for kanaflixcursos@gmail.com who had approved refund
DELETE FROM public.course_enrollments 
WHERE user_id = '3c801afe-3422-42ee-b1ea-c2c3838a7f5e' 
AND course_id = '695b563d-f17d-489f-9b01-55353af7b3d7';

-- Update order status to refunded
UPDATE public.orders 
SET status = 'refunded' 
WHERE id = '1aa8dee8-ccf1-40e8-b64b-ea854797c783';