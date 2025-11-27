-- MIGRATE DURATION: episodes_old -> episode_audios
-- Run this in Supabase SQL Editor

BEGIN;

-- Update duration in episode_audios from episodes_old
-- We match on audio_url as it is unique per file
UPDATE public.episode_audios ea
SET duration = eo.duration
FROM public.episodes_old eo
WHERE ea.audio_url = eo.audio_url
  AND eo.duration IS NOT NULL;

COMMIT;

-- Verification
SELECT count(*) as updated_count FROM public.episode_audios WHERE duration IS NOT NULL;
