-- Обновляем все ссылки с darkviolet-caterpillar на silver-lemur
-- Дата: 2025-11-12

-- Обновляем audio_url в таблице episodes
UPDATE public.episodes 
SET audio_url = REPLACE(audio_url, 'https://darkviolet-caterpillar-781686.hostingersite.com/', 'https://silver-lemur-512881.hostingersite.com/')
WHERE audio_url LIKE 'https://darkviolet-caterpillar-781686.hostingersite.com/%';

-- Выводим количество обновленных записей
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO updated_count
    FROM public.episodes 
    WHERE audio_url LIKE 'https://silver-lemur-512881.hostingersite.com/%';
    
    RAISE NOTICE 'Updated % episode records with new audio URL', updated_count;
END $$;

-- Обновляем комментарий о миграции
COMMENT ON TABLE public.episodes IS 'Episodes table - audio URLs updated to silver-lemur domain on 2025-11-12';

