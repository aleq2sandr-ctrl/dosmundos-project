-- Performance migration: indexes and minor tweaks
-- Run this on Supabase/Postgres

BEGIN;

-- 1) Episodes ordered by date in list views
CREATE INDEX IF NOT EXISTS idx_episodes_date ON public.episodes (date);

-- 2) Timecodes queried by episode + lang and ordered by time
--    (covers: eq('episode_slug'), eq('lang'), order('time'))
CREATE INDEX IF NOT EXISTS idx_timecodes_slug_lang_time ON public.timecodes (episode_slug, lang, time);

-- 3) Transcripts are looked up by (episode_slug, lang). There is a UNIQUE already,
--    but keep this here as documentation (the UNIQUE creates the index automatically).
-- CREATE UNIQUE INDEX IF NOT EXISTS transcripts_unique_lang_idx ON public.transcripts (episode_slug, lang);

-- 4) Episode audios have a UNIQUE (episode_slug, lang) already. Documented here.
-- CREATE UNIQUE INDEX IF NOT EXISTS episode_audios_unique_lang_idx ON public.episode_audios (episode_slug, lang);

COMMIT;
