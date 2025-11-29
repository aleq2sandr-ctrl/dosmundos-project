-- Clean transcripts text recognition data
-- Clears text fields while preserving structural data (id, episode_slug, lang, status, provider)
-- Safe to run multiple times
-- Run: psql -d dosmundos -f database/clean_transcripts_text.sql

BEGIN;

-- Clear main transcript data (AI recognition results)
UPDATE public.transcripts 
SET 
    transcript_data = NULL,
    edited_transcript_data = NULL,
    title = NULL,
    short_description = NULL,
    updated_at = now()
WHERE transcript_data IS NOT NULL 
   OR edited_transcript_data IS NOT NULL 
   OR title IS NOT NULL 
   OR short_description IS NOT NULL;

-- Report count of cleaned records
SELECT 
    COUNT(*) as cleaned_records,
    COUNT(transcript_data) FILTER (WHERE transcript_data IS NOT NULL) as remaining_transcript_data,
    COUNT(edited_transcript_data) FILTER (WHERE edited_transcript_data IS NOT NULL) as remaining_edited_data
FROM public.transcripts;

COMMIT;

-- Uncomment to rollback if needed:
-- ROLLBACK;
