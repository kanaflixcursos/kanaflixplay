-- Fix video URLs to use the correct Pandavideo player domain
UPDATE lessons 
SET video_url = 'https://player-vz-910d72b1-f0c.tv.pandavideo.com.br/embed/?v=' || pandavideo_video_id 
WHERE pandavideo_video_id IS NOT NULL;