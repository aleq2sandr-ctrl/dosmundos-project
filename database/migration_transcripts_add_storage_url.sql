-- Migration: Add storage_url to transcripts table
-- Run this in Supabase SQL editor or via supabase db push

ALTER TABLE public.transcripts 
ADD COLUMN IF NOT EXISTS storage_url text;

-- Optional: Add index
CREATE INDEX IF NOT EXISTS idx_transcripts_storage_url ON public.transcripts(storage_url);

-- After data migration, optionally drop transcript_data:
-- ALTER TABLE public.transcripts DROP COLUMN IF EXISTS transcript_data;
-- But keep for now to avoid data loss

-- Verify:
-- SELECT episode_slug, lang, storage_url, provider FROM transcripts LIMIT 5;
