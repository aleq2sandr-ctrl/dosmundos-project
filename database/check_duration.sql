-- CHECK DURATION DATA
-- Run this to see if we have duration in the old table

SELECT slug, duration, audio_url FROM public.episodes_old LIMIT 20;

-- Check current episode_audios
SELECT * FROM public.episode_audios LIMIT 20;
