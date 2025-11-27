-- REDO MIGRATION: questions_old -> timecodes
-- Run this in Supabase SQL Editor

BEGIN;

-- 1. Drop timecodes if it exists (to start fresh)
DROP TABLE IF EXISTS public.timecodes CASCADE;

-- 2. Create timecodes table
CREATE TABLE public.timecodes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  episode_slug text REFERENCES public.episodes(slug) ON DELETE CASCADE,
  lang text NOT NULL,
  time integer NOT NULL,
  title text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 3. Migrate Data with SMART MATCHING
-- This handles cases where questions_old has slugs like 'slug_es' but episodes table has 'slug'
INSERT INTO public.timecodes (episode_slug, lang, time, title, created_at)
SELECT DISTINCT
  e.slug, -- Use the VALID slug from the episodes table
  COALESCE(qo.lang, 'mixed'),
  qo.time,
  qo.title,
  qo.created_at
FROM public.questions_old qo
JOIN public.episodes e ON (
  -- Try exact match
  qo.episode_slug = e.slug 
  -- OR try matching by stripping language suffix (e.g. 'slug_es' -> 'slug')
  OR regexp_replace(qo.episode_slug, '_[a-z]{2}$', '') = e.slug
);

-- 4. Create Index
CREATE INDEX IF NOT EXISTS idx_timecodes_slug ON public.timecodes(episode_slug);

-- 5. Enable Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'timecodes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.timecodes;
  END IF;
END $$;

COMMIT;

-- Verification
SELECT count(*) as migrated_count FROM public.timecodes;
