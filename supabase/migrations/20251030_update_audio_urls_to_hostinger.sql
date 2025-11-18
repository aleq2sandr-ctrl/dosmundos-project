-- Обновляем все ссылки на аудио файлы с dosmundos.pe на darkviolet-caterpillar-781686.hostingersite.com
-- Дата: 2025-10-30

-- Обновляем audio_url в таблице episodes
UPDATE public.episodes 
SET audio_url = REPLACE(audio_url, 'https://dosmundos.pe/', 'https://darkviolet-caterpillar-781686.hostingersite.com/')
WHERE audio_url LIKE 'https://dosmundos.pe/%';

-- Выводим количество обновленных записей
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO updated_count
    FROM public.episodes 
    WHERE audio_url LIKE 'https://darkviolet-caterpillar-781686.hostingersite.com/%';
    
    RAISE NOTICE 'Updated % episode records with new audio URL', updated_count;
END $$;

-- Комментарий о миграции
COMMENT ON TABLE public.episodes IS 'Episodes table - audio URLs updated to Hostinger domain on 2025-10-30';







