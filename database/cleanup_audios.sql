-- CLEANUP SCRIPT: Smart Deduplication & Merge (Fixed for FK constraints)
-- 1. Normalizes episode_slug (removes _ru, _es suffixes)
-- 2. Checks if the normalized slug actually exists in 'episodes' table
-- 3. Merges 'ru' + 'es' into 'mixed' if they share the same file
-- 4. Removes duplicates and garbage

BEGIN;

-- Create a temporary table with the normalized data
CREATE TEMP TABLE final_audios AS
SELECT DISTINCT
    SUBSTRING(ea.episode_slug FROM 1 FOR 10) as episode_slug, -- Assumes YYYY-MM-DD format
    ea.lang,
    ea.audio_url
FROM public.episode_audios ea
WHERE ea.lang IN ('ru', 'es', 'mixed')
  -- CRITICAL FIX: Only include audios where the normalized slug exists in the parent table
  AND SUBSTRING(ea.episode_slug FROM 1 FOR 10) IN (SELECT slug FROM public.episodes);

-- Logic to merge RU + ES into MIXED
-- Insert 'mixed' rows where we have both RU and ES with same URL
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

-- Delete the RU and ES rows that were merged
DELETE FROM final_audios
WHERE lang IN ('ru', 'es')
  AND EXISTS (
    SELECT 1 FROM final_audios m
    WHERE m.episode_slug = final_audios.episode_slug
      AND m.lang = 'mixed'
      AND m.audio_url = final_audios.audio_url
  );

-- Replace the content of the main table
DELETE FROM public.episode_audios;

INSERT INTO public.episode_audios (episode_slug, lang, audio_url)
SELECT episode_slug, lang, audio_url FROM final_audios;

-- Clean up
DROP TABLE final_audios;

COMMIT;
