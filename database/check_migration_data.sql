-- DIAGNOSTIC SCRIPT
-- Run this to check why 0 rows are being migrated

-- 1. Check count in questions_old
SELECT count(*) as questions_old_count FROM public.questions_old;

-- 2. Check count in episodes
SELECT count(*) as episodes_count FROM public.episodes;

-- 3. Check for matching slugs
SELECT count(*) as matching_slugs_count
FROM public.questions_old qo
JOIN public.episodes e ON qo.episode_slug = e.slug;

-- 4. Sample data from questions_old (to see what the slugs look like)
SELECT episode_slug, lang, title FROM public.questions_old LIMIT 5;

-- 5. Sample data from episodes (to see what the slugs look like)
SELECT slug FROM public.episodes LIMIT 5;
