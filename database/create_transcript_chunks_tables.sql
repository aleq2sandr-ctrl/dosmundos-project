-- Migration: Create transcript_chunks and transcript_chunks_summary tables
-- Run this in Supabase SQL editor or via supabase db push

-- Create transcript_chunks table for storing chunked transcript data
CREATE TABLE IF NOT EXISTS public.transcript_chunks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  episode_slug text NOT NULL,
  lang text NOT NULL,
  chunk_type text NOT NULL, -- 'utterances', 'text', 'transcript', 'edited_transcript'
  chunk_index integer NOT NULL,
  chunk_data jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT transcript_chunks_pkey PRIMARY KEY (id),
  CONSTRAINT transcript_chunks_unique_chunk UNIQUE (episode_slug, lang, chunk_type, chunk_index)
);

-- Create transcript_chunks_summary table for quick metadata access
CREATE TABLE IF NOT EXISTS public.transcript_chunks_summary (
  episode_slug text NOT NULL,
  lang text NOT NULL,
  total_chunks integer DEFAULT 0,
  text_chunks integer DEFAULT 0,
  utterance_chunks integer DEFAULT 0,
  transcript_chunks integer DEFAULT 0,
  edited_transcript_chunks integer DEFAULT 0,
  chunk_size integer DEFAULT 0,
  chunked_at timestamp with time zone DEFAULT now(),
  CONSTRAINT transcript_chunks_summary_pkey PRIMARY KEY (episode_slug, lang)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transcript_chunks_episode_slug ON public.transcript_chunks(episode_slug);
CREATE INDEX IF NOT EXISTS idx_transcript_chunks_lang ON public.transcript_chunks(lang);
CREATE INDEX IF NOT EXISTS idx_transcript_chunks_type ON public.transcript_chunks(chunk_type);
CREATE INDEX IF NOT EXISTS idx_transcript_chunks_index ON public.transcript_chunks(chunk_index);
CREATE INDEX IF NOT EXISTS idx_transcript_chunks_episode_lang ON public.transcript_chunks(episode_slug, lang);

-- Add foreign key constraint referencing episodes table
ALTER TABLE public.transcript_chunks_summary 
ADD CONSTRAINT fk_transcript_chunks_summary_episodes 
FOREIGN KEY (episode_slug) REFERENCES public.episodes(slug) ON DELETE CASCADE;

-- Add RLS policies for the new tables
-- Grant all operations to authenticated users
ALTER TABLE public.transcript_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcript_chunks_summary ENABLE ROW LEVEL SECURITY;

-- Policy for transcript_chunks: allow all operations for authenticated users
CREATE OR REPLACE POLICY "Enable all operations for authenticated users on transcript_chunks" 
ON public.transcript_chunks 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Policy for transcript_chunks_summary: allow all operations for authenticated users
CREATE OR REPLACE POLICY "Enable all operations for authenticated users on transcript_chunks_summary" 
ON public.transcript_chunks_summary 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Grant necessary permissions
GRANT ALL ON public.transcript_chunks TO authenticated;
GRANT ALL ON public.transcript_chunks_summary TO authenticated;

-- Informative comment
COMMENT ON TABLE public.transcript_chunks IS 'Stores chunked transcript data for large transcripts';
COMMENT ON TABLE public.transcript_chunks_summary IS 'Summary metadata for transcript chunks';
