-- RESTORE SCRIPT
-- Use this to restore data if episode_audios became empty.
-- It pulls data from episode_variants_v2 (the previous version of the table).

INSERT INTO public.episode_audios (episode_slug, lang, audio_url)
SELECT episode_slug, lang, audio_url
FROM public.episode_variants_v2
ON CONFLICT DO NOTHING;
