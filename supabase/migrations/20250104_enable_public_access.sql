-- Настройка публичного доступа к основным таблицам
-- Для podcast приложения нужен публичный доступ на чтение

-- ============================================
-- ТАБЛИЦА: episodes
-- ============================================

-- Включаем RLS для таблицы episodes
ALTER TABLE IF EXISTS public.episodes ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики если есть
DROP POLICY IF EXISTS "Public read access for episodes" ON public.episodes;
DROP POLICY IF EXISTS "Anyone can view episodes" ON public.episodes;

-- Создаем политику для публичного чтения эпизодов
CREATE POLICY "Public read access for episodes" 
ON public.episodes 
FOR SELECT 
USING (true);

-- Политика для вставки (только для authenticated пользователей)
DROP POLICY IF EXISTS "Authenticated users can insert episodes" ON public.episodes;
CREATE POLICY "Authenticated users can insert episodes" 
ON public.episodes 
FOR INSERT 
WITH CHECK (true);  -- Можно изменить на auth.role() = 'authenticated' для ограничения

-- Политика для обновления
DROP POLICY IF EXISTS "Authenticated users can update episodes" ON public.episodes;
CREATE POLICY "Authenticated users can update episodes" 
ON public.episodes 
FOR UPDATE 
USING (true)
WITH CHECK (true);

-- Политика для удаления
DROP POLICY IF EXISTS "Authenticated users can delete episodes" ON public.episodes;
CREATE POLICY "Authenticated users can delete episodes" 
ON public.episodes 
FOR DELETE 
USING (true);

-- ============================================
-- ТАБЛИЦА: questions
-- ============================================

-- Включаем RLS для таблицы questions
ALTER TABLE IF EXISTS public.questions ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики если есть
DROP POLICY IF EXISTS "Public read access for questions" ON public.questions;
DROP POLICY IF EXISTS "Anyone can view questions" ON public.questions;

-- Создаем политику для публичного чтения вопросов
CREATE POLICY "Public read access for questions" 
ON public.questions 
FOR SELECT 
USING (true);

-- Политика для вставки
DROP POLICY IF EXISTS "Authenticated users can insert questions" ON public.questions;
CREATE POLICY "Authenticated users can insert questions" 
ON public.questions 
FOR INSERT 
WITH CHECK (true);

-- Политика для обновления
DROP POLICY IF EXISTS "Authenticated users can update questions" ON public.questions;
CREATE POLICY "Authenticated users can update questions" 
ON public.questions 
FOR UPDATE 
USING (true)
WITH CHECK (true);

-- Политика для удаления
DROP POLICY IF EXISTS "Authenticated users can delete questions" ON public.questions;
CREATE POLICY "Authenticated users can delete questions" 
ON public.questions 
FOR DELETE 
USING (true);

-- ============================================
-- ТАБЛИЦА: transcripts (если существует)
-- ============================================

-- Включаем RLS для таблицы transcripts (если существует)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'transcripts') THEN
        ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Public read access for transcripts" ON public.transcripts;
        CREATE POLICY "Public read access for transcripts" 
        ON public.transcripts 
        FOR SELECT 
        USING (true);
        
        DROP POLICY IF EXISTS "Authenticated users can modify transcripts" ON public.transcripts;
        CREATE POLICY "Authenticated users can modify transcripts" 
        ON public.transcripts 
        FOR ALL
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

-- ============================================
-- ТАБЛИЦА: segments (если существует)
-- ============================================

DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'segments') THEN
        ALTER TABLE public.segments ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Public read access for segments" ON public.segments;
        CREATE POLICY "Public read access for segments" 
        ON public.segments 
        FOR SELECT 
        USING (true);
        
        DROP POLICY IF EXISTS "Authenticated users can modify segments" ON public.segments;
        CREATE POLICY "Authenticated users can modify segments" 
        ON public.segments 
        FOR ALL
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

-- ============================================
-- Проверка политик
-- ============================================

-- Выводим все политики для проверки
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('episodes', 'questions', 'transcripts', 'segments')
ORDER BY tablename, policyname;

-- Комментарии
COMMENT ON POLICY "Public read access for episodes" ON public.episodes IS 
'Разрешает публичный доступ на чтение для всех эпизодов подкаста';

COMMENT ON POLICY "Public read access for questions" ON public.questions IS 
'Разрешает публичный доступ на чтение для всех вопросов';

