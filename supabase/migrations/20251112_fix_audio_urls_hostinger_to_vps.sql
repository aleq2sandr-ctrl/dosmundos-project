-- Fix audio URLs that incorrectly point to Hostinger /files/audio/ path
-- These files actually exist on VPS /files/audio/ directory
-- Replace Hostinger domain URLs with VPS relative paths
-- Дата: 2025-11-12

-- Update episodes where audio_url has Hostinger domain with /files/audio/ path
-- These should just be relative paths like /files/audio/filename.mp3
UPDATE public.episodes 
SET audio_url = REPLACE(
  audio_url, 
  'https://silver-lemur-512881.hostingersite.com/files/audio/', 
  '/files/audio/'
)
WHERE audio_url LIKE 'https://silver-lemur-512881.hostingersite.com/files/audio/%';

-- Also handle the old darkviolet domain if it exists
UPDATE public.episodes 
SET audio_url = REPLACE(
  audio_url, 
  'https://darkviolet-caterpillar-781686.hostingersite.com/files/audio/', 
  '/files/audio/'
)
WHERE audio_url LIKE 'https://darkviolet-caterpillar-781686.hostingersite.com/files/audio/%';

-- Verify the changes
SELECT COUNT(*) as audio_urls_on_vps
FROM public.episodes 
WHERE audio_url LIKE '/files/audio/%';

-- Also check if there are any remaining Hostinger file paths
SELECT COUNT(*) as remaining_hostinger_urls
FROM public.episodes 
WHERE audio_url LIKE 'https://%hostingersite.com/files/audio/%';

