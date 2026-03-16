
UPDATE public.courses SET points_reward = 180 WHERE id = '10000005';
UPDATE public.courses SET points_reward = 170 WHERE id = '10000002';
UPDATE public.courses SET points_reward = 150 WHERE id = '10000006';
UPDATE public.courses SET points_reward = 140 WHERE id = '10000007';
UPDATE public.courses SET points_reward = 120 WHERE id IN ('10000001','10000010');
UPDATE public.courses SET points_reward = 110 WHERE id = '10000003';
UPDATE public.courses SET points_reward = 100 WHERE id IN ('10000008','10000009');
UPDATE public.courses SET points_reward = 50  WHERE id = '10000004';
