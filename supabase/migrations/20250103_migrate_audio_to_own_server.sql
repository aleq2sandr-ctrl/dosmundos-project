-- Миграция аудио файлов на собственный сервер
-- Дата: 2025-01-03
-- Перенос с darkviolet-caterpillar-781686.hostingersite.com на dosmundos.pe

-- Шаг 1: Обновить все URL с Hostinger WordPress на собственный сервер
UPDATE public.episodes 
SET audio_url = REPLACE(
    audio_url, 
    'https://darkviolet-caterpillar-781686.hostingersite.com/wp-content/uploads/Audio/',
    'https://dosmundos.pe/audio/'
)
WHERE audio_url LIKE 'https://darkviolet-caterpillar-781686.hostingersite.com/wp-content/uploads/Audio/%';

-- Шаг 2: Также обновить URL с /files/ на /audio/ если есть старые
UPDATE public.episodes 
SET audio_url = REPLACE(
    audio_url,
    'https://darkviolet-caterpillar-781686.hostingersite.com/files/',
    'https://dosmundos.pe/audio/'
)
WHERE audio_url LIKE 'https://darkviolet-caterpillar-781686.hostingersite.com/files/%';

-- Проверка результатов
DO $$
DECLARE
    updated_count INTEGER;
    old_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO updated_count
    FROM public.episodes 
    WHERE audio_url LIKE 'https://dosmundos.pe/audio/%';
    
    SELECT COUNT(*) INTO old_count
    FROM public.episodes 
    WHERE audio_url LIKE 'https://darkviolet-caterpillar-781686.hostingersite.com/%';
    
    RAISE NOTICE '✅ Обновлено записей с новыми URL: %', updated_count;
    RAISE NOTICE '⚠️  Осталось записей со старыми URL: %', old_count;
END $$;

-- Комментарий для документации
COMMENT ON TABLE public.episodes IS 'Episodes table - audio migrated to dosmundos.pe/audio/ on 2025-01-03';


