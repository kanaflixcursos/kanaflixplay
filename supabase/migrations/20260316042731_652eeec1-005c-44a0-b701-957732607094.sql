-- Fix points for Rodrigo Silveira: add missing 180 pts from course enrollment reward
UPDATE profiles SET points = 185 WHERE user_id = '69f67c7c-b260-4e28-944f-07df85d1f954';