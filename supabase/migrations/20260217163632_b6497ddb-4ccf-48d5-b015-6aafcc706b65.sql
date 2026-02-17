INSERT INTO public.user_roles (user_id, role) 
VALUES ('3c801afe-3422-42ee-b1ea-c2c3838a7f5e', 'student') 
ON CONFLICT DO NOTHING;