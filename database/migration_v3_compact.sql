-- MIGRATION V3: Compact Database Structure
-- This script finalizes the move to a clean structure:
-- 1. Ensures all episodes have a normalized entry (YYYY-MM-DD)
-- 2. Moves Translations to these normalized episodes
-- 3. Cleans up Audios (merges RU+ES -> Mixed) and links them to normalized episodes
-- 4. Removes the old suffixed episode entries (e.g. 2025-01-29_ru)

BEGIN;

-- STEP 1: Create normalized parent episodes
-- We extract the date part (first 10 chars) and ensure a row exists for it.
INSERT INTO public.episodes (slug, date)
SELECT DISTINCT
    SUBSTRING(slug FROM 1 FOR 10), -- YYYY-MM-DD
    date
FROM public.episodes
WHERE LENGTH(slug) > 10 -- Only process those with suffixes like _ru
ON CONFLICT (slug) DO NOTHING;


-- STEP 2: Move Translations to normalized episodes

-- A. Remove rows that conflict with EXISTING rows in the target location
-- (If the clean slug already has this language, we discard the one from the dirty slug)
DELETE FROM public.episode_translations t1
WHERE LENGTH(episode_slug) > 10
  AND EXISTS (
    SELECT 1 FROM public.episode_translations t2
    WHERE t2.episode_slug = SUBSTRING(t1.episode_slug FROM 1 FOR 10)
      AND t2.lang = t1.lang
  );

-- B. Remove internal duplicates within the rows to be moved.
-- (If multiple dirty slugs map to the same clean slug + language, keep only one)
DELETE FROM public.episode_translations t1
WHERE LENGTH(episode_slug) > 10
  AND EXISTS (
    SELECT 1 FROM public.episode_translations t2
    WHERE SUBSTRING(t2.episode_slug FROM 1 FOR 10) = SUBSTRING(t1.episode_slug FROM 1 FOR 10)
      AND t2.lang = t1.lang
      AND LENGTH(t2.episode_slug) > 10
      AND t2.ctid < t1.ctid -- Keep one arbitrary row using internal Postgres ID
  );

-- C. Now move the remaining translations to the normalized slug.
UPDATE public.episode_translations
SET episode_slug = SUBSTRING(episode_slug FROM 1 FOR 10)
WHERE LENGTH(episode_slug) > 10
  AND SUBSTRING(episode_slug FROM 1 FOR 10) IN (SELECT slug FROM public.episodes);


-- STEP 3: Smart Cleanup & Move for Audios
-- We create a clean list of audios attached to the normalized slugs.
CREATE TEMP TABLE final_audios AS
SELECT DISTINCT
    SUBSTRING(ea.episode_slug FROM 1 FOR 10) as episode_slug,
    ea.lang,
    ea.audio_url
FROM public.episode_audios ea
WHERE ea.lang IN ('ru', 'es', 'mixed')
  AND SUBSTRING(ea.episode_slug FROM 1 FOR 10) IN (SELECT slug FROM public.episodes);

-- Logic to merge RU + ES into MIXED
-- If we have both RU and ES with the same URL for an episode, create a 'mixed' entry.
INSERT INTO final_audios (episode_slug, lang, audio_url)
SELECT DISTINCT t1.episode_slug, 'mixed', t1.audio_url
FROM final_audios t1
JOIN final_audios t2 ON t1.episode_slug = t2.episode_slug
WHERE t1.lang = 'ru' 
  AND t2.lang = 'es' 
  AND t1.audio_url = t2.audio_url
  AND NOT EXISTS (
      SELECT 1 FROM final_audios existing 
      WHERE existing.episode_slug = t1.episode_slug 
      AND existing.lang = 'mixed'
  );

-- Delete the RU and ES rows that were merged (because they are now covered by 'mixed')
DELETE FROM final_audios
WHERE lang IN ('ru', 'es')
  AND EXISTS (
    SELECT 1 FROM final_audios m
    WHERE m.episode_slug = final_audios.episode_slug
      AND m.lang = 'mixed'
      AND m.audio_url = final_audios.audio_url
  );

-- Replace the content of the main table with our clean data
DELETE FROM public.episode_audios;

INSERT INTO public.episode_audios (episode_slug, lang, audio_url)
SELECT episode_slug, lang, audio_url FROM final_audios;

DROP TABLE final_audios;


-- STEP 4: Cleanup old episodes
-- Now that audios and translations are moved, we can delete the old suffixed episodes.
DELETE FROM public.episodes
WHERE slug ~ '^\d{4}-\d{2}-\d{2}_[a-z]{2}$'; -- Matches YYYY-MM-DD_LL format

COMMIT;