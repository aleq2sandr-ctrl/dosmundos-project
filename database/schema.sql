-- Dos Mundos Database Schema
-- Based on approved schema (Nov 2025)

-- 1. EPISODES
-- Central entity, language-agnostic
CREATE TABLE public.episodes (
  slug text NOT NULL,
  date date NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT episodes_pkey PRIMARY KEY (slug)
);

-- 2. USER EDITORS
-- Users who can edit content
CREATE TABLE public.user_editors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  is_active boolean DEFAULT true,
  last_login timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_editors_pkey PRIMARY KEY (id)
);

-- 3. TRANSCRIPTS (Unified table containing transcripts and translations)
CREATE TABLE public.transcripts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  episode_slug text,
  lang text NOT NULL,
  title text,
  status text DEFAULT 'pending'::text,
  edited_transcript_data jsonb,
  transcript_data jsonb,  -- full data with words and etc from transcription or translation
  short_description text,  -- краткое описание ai
  provider text DEFAULT 'assemblyai'::text,
  provider_id text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT transcripts_pkey PRIMARY KEY (id),
  CONSTRAINT fk_transcripts_episodes FOREIGN KEY (episode_slug) REFERENCES public.episodes(slug) ON DELETE CASCADE,
  CONSTRAINT transcripts_unique_lang UNIQUE (episode_slug, lang)
);

-- 4. EPISODE AUDIOS
CREATE TABLE public.episode_audios (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  episode_slug text,
  lang text NOT NULL,
  audio_url text NOT NULL,
  duration integer,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT episode_audios_pkey PRIMARY KEY (id),
  CONSTRAINT episode_audios_episode_slug_fkey FOREIGN KEY (episode_slug) REFERENCES public.episodes(slug) ON DELETE CASCADE,
  CONSTRAINT episode_audios_unique_lang UNIQUE (episode_slug, lang)
);

-- 5. TIMECODES (formerly questions)
CREATE TABLE public.timecodes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  episode_slug text,
  lang text NOT NULL,
  time integer NOT NULL,
  title text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT timecodes_pkey PRIMARY KEY (id),
  CONSTRAINT timecodes_episode_slug_fkey1 FOREIGN KEY (episode_slug) REFERENCES public.episodes(slug) ON DELETE CASCADE
);

-- 6. EDIT HISTORY
CREATE TABLE public.edit_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  editor_id uuid,
  editor_email text,
  editor_name text,
  edit_type text,
  target_type text,
  target_id text,
  file_path text,
  content_before text,
  content_after text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  is_rolled_back boolean DEFAULT false,
  rolled_back_at timestamp with time zone,
  rolled_back_by text,
  rollback_reason text,
  CONSTRAINT edit_history_pkey PRIMARY KEY (id),
  CONSTRAINT edit_history_editor_id_fkey FOREIGN KEY (editor_id) REFERENCES public.user_editors(id)
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_episode_audios_slug ON public.episode_audios(episode_slug);
CREATE INDEX IF NOT EXISTS idx_transcripts_slug ON public.transcripts(episode_slug);
CREATE INDEX IF NOT EXISTS idx_timecodes_slug ON public.timecodes(episode_slug);
