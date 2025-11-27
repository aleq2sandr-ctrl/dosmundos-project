-- PROPOSED NEW SCHEMA (V2)
-- Цель: Убрать дублирование данных, упростить работу с файлами разных языков, удалить мусор.

-- 1. EPISODES (ЭПИЗОДЫ)
-- Содержит только общую информацию об эпизоде, не зависящую от языка.
-- Slug является уникальным идентификатором (например, '2022-12-04').
CREATE TABLE public.episodes (
  slug text PRIMARY KEY,          -- '2022-12-04' (Используем как ID)
  date date NOT NULL,             -- Дата выхода
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. EPISODE_VARIANTS (ВАРИАНТЫ ЭПИЗОДА)
-- Содержит контент для конкретного языка (аудио, заголовки).
-- Заменяет старую логику с суффиксами файлов.
CREATE TABLE public.episode_variants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  episode_slug text REFERENCES public.episodes(slug) ON DELETE CASCADE,
  lang text NOT NULL,             -- 'ru', 'es', 'mixed' (для старых файлов)
  title text,                     -- Заголовок на этом языке
  
  -- Аудио данные
  audio_url text NOT NULL,        -- Полный URL к файлу
  duration integer,               -- Длительность в секундах
  
  -- Поиск
  search_vector tsvector,         -- Для полнотекстового поиска
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Гарантируем, что для одного эпизода только одна запись на язык
  UNIQUE(episode_slug, lang)
);

-- 3. TRANSCRIPTS (ТРАНСКРИПЦИИ)
-- Привязаны к эпизоду и языку.
CREATE TABLE public.transcripts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  episode_slug text REFERENCES public.episodes(slug) ON DELETE CASCADE,
  lang text NOT NULL,
  
  content jsonb,                  -- JSON структура транскрипции
  plain_text text,                -- Простой текст для поиска (опционально)
  
  status text DEFAULT 'pending',  -- 'pending', 'completed', 'error'
  provider_id text,               -- ID из AssemblyAI
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(episode_slug, lang)
);

-- 4. TIMECODES (ТАЙМКОДЫ / ВОПРОСЫ)
-- Бывшая таблица questions.
CREATE TABLE public.timecodes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  episode_slug text REFERENCES public.episodes(slug) ON DELETE CASCADE,
  lang text NOT NULL,             -- Язык заголовка таймкода
  
  time_seconds integer NOT NULL,  -- Время в секундах
  title text NOT NULL,            -- Описание момента
  
  created_at timestamptz DEFAULT now()
);

-- 5. EDIT_HISTORY (ИСТОРИЯ ИЗМЕНЕНИЙ)
-- Оставляем как есть, но можно упростить.
CREATE TABLE public.edit_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  editor_id uuid REFERENCES public.user_editors(id),
  target_table text,              -- 'episodes', 'transcripts' и т.д.
  target_id text,                 -- ID изменяемой записи
  action_type text,               -- 'update', 'create', 'delete'
  changes jsonb,                  -- Было/Стало { "before": ..., "after": ... }
  created_at timestamptz DEFAULT now()
);

-- 6. USER_EDITORS (РЕДАКТОРЫ)
-- Без изменений.
CREATE TABLE public.user_editors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  is_active boolean DEFAULT true,
  last_login timestamptz
);

-- ИНДЕКСЫ ДЛЯ БЫСТРОГО ПОИСКА
CREATE INDEX idx_episode_variants_search ON public.episode_variants USING GIN(search_vector);
CREATE INDEX idx_transcripts_slug ON public.transcripts(episode_slug);
CREATE INDEX idx_timecodes_slug ON public.timecodes(episode_slug);
