
-- Retroactive fix: remove duplicate daily login entries that were same day in Brazil timezone
-- and deduct the extra points

-- 1. Rodolfo (user_id: 39201200-7d69-41b8-a90d-fd2f2d51f0c4)
-- 2026-03-18 00:47 UTC = 2026-03-17 21:47 BRT → duplicate of 2026-03-17
DELETE FROM daily_login_points WHERE id = 'aa836a7c-2725-4653-94be-f0a1122f0096';

-- 2. Rodrigo (user_id: 69f67c7c-b260-4e28-944f-07df85d1f954)  
-- 2026-03-17 00:00 UTC = 2026-03-16 21:00 BRT → duplicate of 2026-03-16
DELETE FROM daily_login_points WHERE id = '1d73ec23-88c7-452d-a602-a8b53fdb97d4';

-- 3. Arthur Corrêa (user_id: 966d4955-8337-4c4e-944f-3782ad0a227a)
-- 2026-03-18 01:07 UTC = 2026-03-17 22:07 BRT → duplicate of 2026-03-17
-- Need to find the ID first, let me use a safer approach

-- Deduct 5 points from each affected user
UPDATE profiles SET points = GREATEST(points - 5, 0) WHERE user_id = '39201200-7d69-41b8-a90d-fd2f2d51f0c4';
UPDATE profiles SET points = GREATEST(points - 5, 0) WHERE user_id = '69f67c7c-b260-4e28-944f-07df85d1f954';
