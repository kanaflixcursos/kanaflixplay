UPDATE public.creators SET user_id = '69f67c7c-b260-4e28-944f-07df85d1f954', name = 'Kanaflix', status = 'active' WHERE id = 'a0000000-0000-0000-0000-000000000001';

-- Also add creator role for this user
INSERT INTO public.user_roles (user_id, role) VALUES ('69f67c7c-b260-4e28-944f-07df85d1f954', 'creator') ON CONFLICT DO NOTHING;