-- This script restores data from 'transcripts_old' to the 'transcripts' table.
-- It handles the slug format change (removing '_ru', '_es' suffixes) and extracts data from JSON.

-- 1. Ensure 'transcripts' table exists and has the required columns
-- If the table doesn't exist, create it (based on V2 schema but with our needed columns)
CREATE TABLE IF NOT EXISTS transcripts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  episode_slug text,
  lang text NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(episode_slug, lang)
);

-- Ensure columns exist (idempotent)
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS edited_transcript_data jsonb;
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS utterances jsonb;
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS words jsonb;
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS text text;

-- 2. Insert data from transcripts_old
-- We use a CTE to deduplicate source rows that map to the same target (slug, lang)
WITH source_data AS (
    SELECT 
        REGEXP_REPLACE(episode_slug, '_[a-z]{2}$', '') as clean_slug,
        lang,
        status,
        edited_transcript_data,
        ctid -- Use internal ID for stable sorting if dates are missing
    FROM transcripts_old
),
deduplicated_data AS (
    SELECT DISTINCT ON (clean_slug, lang)
        clean_slug,
        lang,
        status,
        edited_transcript_data
    FROM source_data
    ORDER BY clean_slug, lang, ctid DESC -- Keep the most recently inserted row
)
INSERT INTO transcripts (episode_slug, lang, status, edited_transcript_data, utterances, words, text)
SELECT 
    clean_slug,
    lang,
    status,
    edited_transcript_data,
    -- Extract structured data from the JSON blob
    COALESCE(edited_transcript_data->'utterances', '[]'::jsonb) as utterances,
    COALESCE(edited_transcript_data->'words', '[]'::jsonb) as words,
    COALESCE(edited_transcript_data->>'text', '') as text
FROM deduplicated_data
-- Update existing records if they exist
ON CONFLICT (episode_slug, lang) 
DO UPDATE SET
    status = EXCLUDED.status,
    edited_transcript_data = EXCLUDED.edited_transcript_data,
    utterances = EXCLUDED.utterances,
    words = EXCLUDED.words,
    text = EXCLUDED.text,
    updated_at = NOW();
