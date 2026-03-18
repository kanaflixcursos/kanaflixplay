
-- Fix Arthur Corrêa duplicate: 2026-03-18 01:07 UTC = 2026-03-17 22:07 BRT (same day as 2026-03-17)
DELETE FROM daily_login_points WHERE id = '640b6bf2-93d8-43d4-8548-107efdc7a289';
UPDATE profiles SET points = GREATEST(points - 5, 0) WHERE user_id = '966d4955-8337-4c4e-944f-3782ad0a227a';
