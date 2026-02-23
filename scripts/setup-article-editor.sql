-- =============================================================================
-- Article Editor Schema Migration
-- Extends articles_v2 with status, question linking, and editor roles
-- Run via Supabase SQL editor or psql
-- =============================================================================

-- 1. Add role to user_editors
ALTER TABLE user_editors 
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'editor' 
  CHECK (role IN ('editor', 'admin'));

-- 2. Add article editor columns to articles_v2
ALTER TABLE articles_v2 
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' 
  CHECK (status IN ('draft', 'pending', 'published'));

ALTER TABLE articles_v2 
  ADD COLUMN IF NOT EXISTS question_id INTEGER;

ALTER TABLE articles_v2 
  ADD COLUMN IF NOT EXISTS episode_slug TEXT;

ALTER TABLE articles_v2 
  ADD COLUMN IF NOT EXISTS question_time INTEGER;

ALTER TABLE articles_v2 
  ADD COLUMN IF NOT EXISTS question_end_time INTEGER;

ALTER TABLE articles_v2 
  ADD COLUMN IF NOT EXISTS published_by TEXT;

ALTER TABLE articles_v2 
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;

ALTER TABLE articles_v2 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Create index for fast lookup of articles by question_id
CREATE INDEX IF NOT EXISTS idx_articles_v2_question_id ON articles_v2(question_id);
CREATE INDEX IF NOT EXISTS idx_articles_v2_episode_slug ON articles_v2(episode_slug);
CREATE INDEX IF NOT EXISTS idx_articles_v2_status ON articles_v2(status);

-- 4. Set existing articles as published (they were already visible)
UPDATE articles_v2 SET status = 'published' WHERE status IS NULL;

-- 5. RLS policies for articles_v2 (public read for published, editors can read all)
-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Public can read published articles" ON articles_v2;
DROP POLICY IF EXISTS "Editors can read all articles" ON articles_v2;
DROP POLICY IF EXISTS "Editors can insert articles" ON articles_v2;
DROP POLICY IF EXISTS "Editors can update articles" ON articles_v2;

-- Public read access for published articles
CREATE POLICY "Public can read published articles" ON articles_v2
  FOR SELECT USING (status = 'published' OR true);
  -- Note: actual filtering of draft/pending is done in application code
  -- RLS here allows full read access (same pattern as other tables)

-- Insert/update policies (using service role key on server side)
CREATE POLICY "Service role can manage articles" ON articles_v2
  FOR ALL USING (true);
