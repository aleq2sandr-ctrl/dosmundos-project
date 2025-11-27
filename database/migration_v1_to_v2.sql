-- MIGRATION SCRIPT: V1 to V2
-- Run this in Supabase SQL Editor to apply the new schema and migrate data.

BEGIN;

-- 1. Rename old tables to keep them as backup
ALTER TABLE public.episodes RENAME TO episodes_old;
ALTER TABLE public.questions RENAME TO questions_old;
ALTER TABLE public.transcripts RENAME TO transcripts_old;

-- 2. Create new tables
CREATE TABLE public.episodes (
  slug text PRIMARY KEY,
  date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.episode_variants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  episode_slug text REFERENCES public.episodes(slug) ON DELETE CASCADE,
  lang text NOT NULL,             -- 'ru', 'es', 'mixed'
  title text,
  
  -- Audio Data
  audio_url text NOT NULL,
  duration integer,
  
  -- Search
  search_vector tsvector,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(episode_slug, lang)
);

CREATE TABLE public.transcripts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  episode_slug text REFERENCES public.episodes(slug) ON DELETE CASCADE,
  lang text NOT NULL,
  
  content jsonb,
  plain_text text,
  status text DEFAULT 'pending',
  provider_id text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(episode_slug, lang)
);

CREATE TABLE public.timecodes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  episode_slug text REFERENCES public.episodes(slug) ON DELETE CASCADE,
  lang text NOT NULL,
  
  time_seconds integer NOT NULL,
  title text NOT NULL,
  
  created_at timestamptz DEFAULT now()
);

-- 3. Migrate Data: Episodes
-- We extract unique episodes based on slug.
INSERT INTO public.episodes (slug, date, created_at, updated_at)
SELECT DISTINCT
  slug,
  -- Try to parse date, fallback to created_at
  CASE 
    WHEN date ~ '^\d{4}-\d{2}-\d{2}$' THEN date::date 
    ELSE created_at::date 
  END,
  created_at,
  updated_at
FROM public.episodes_old
ON CONFLICT (slug) DO NOTHING;

-- 4. Migrate Data: Episode Variants
-- We map existing rows to variants.
INSERT INTO public.episode_variants (episode_slug, lang, title, audio_url, duration, search_vector, created_at, updated_at)
SELECT
  slug,
  CASE 
    -- Try to guess language from filename if marked
    WHEN file_has_lang_suffix = true AND audio_url ILIKE '%_ru.mp3' THEN 'ru'
    WHEN file_has_lang_suffix = true AND audio_url ILIKE '%_es.mp3' THEN 'es'
    WHEN lang IS NOT NULL AND lang != '' THEN lang
    ELSE 'mixed'
  END,
  title,
  audio_url,
  duration,
  search_vector,
  created_at,
  updated_at
FROM public.episodes_old;

-- 5. Migrate Data: Timecodes (Questions)
INSERT INTO public.timecodes (episode_slug, lang, time_seconds, title, created_at)
SELECT
  episode_slug,
  COALESCE(lang, 'mixed'),
  time,
  title,
  created_at
FROM public.questions_old
WHERE episode_slug IN (SELECT slug FROM public.episodes);

-- 6. Migrate Data: Transcripts
INSERT INTO public.transcripts (episode_slug, lang, content, status, created_at, updated_at)
SELECT DISTINCT ON (episode_slug, COALESCE(lang, 'mixed'))
  episode_slug,
  COALESCE(lang, 'mixed'),
  edited_transcript_data,
  status,
  created_at,
  updated_at
FROM public.transcripts_old
WHERE episode_slug IN (SELECT slug FROM public.episodes)
ORDER BY episode_slug, COALESCE(lang, 'mixed'), updated_at DESC;

-- 7. Create Indexes
CREATE INDEX idx_episode_variants_search ON public.episode_variants USING GIN(search_vector);
CREATE INDEX idx_transcripts_slug ON public.transcripts(episode_slug);
CREATE INDEX idx_timecodes_slug ON public.timecodes(episode_slug);

COMMIT;
