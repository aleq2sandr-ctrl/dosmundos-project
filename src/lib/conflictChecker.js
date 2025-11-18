// Упрощённый conflictChecker - без проверки конфликтов S3/Hostinger
// Старая версия перемещена в deprecated/

import { supabase } from '@/lib/supabaseClient';
import storageRouter from '@/lib/storageRouter';

/**
 * Проверка конфликтов имён файлов (упрощённая версия)
 */
export const checkForConflicts = async (filename) => {
  // В упрощённой версии просто возвращаем что конфликтов нет
  // Файлы автоматически переименовываются на сервере при загрузке
  return {
    hasConflict: false,
    suggestedName: filename
  };
};

/**
 * Проверка существования файла
 */
export const fileExists = async (filename) => {
  try {
    const res = await storageRouter.checkFileExists(filename);
    return !!res.exists;
  } catch (_e) {
    return false;
  }
};

/**
 * Проверка существования файла в хранилище
 */
export const checkFileExistsInStorage = async (fileKey) => {
  try {
    const fileInfo = await storageRouter.getFileInfo(fileKey);
    return {
      exists: true,
      url: fileInfo.url,
      size: fileInfo.size,
      source: 'storage'
    };
  } catch (error) {
    return {
      exists: false,
      url: null,
      size: null,
      source: null
    };
  }
};

/**
 * Проверка конфликтов файла (файл и БД)
 */
export const checkFileConflicts = async (item) => {
  const { episodeSlug, lang, file } = item;
  
  if (!episodeSlug) {
    return {
      hasFileConflict: false,
      hasDBConflict: false,
      dbConflict: null
    };
  }

  const conflicts = {
    // Больше не проверяем существование файла на сервере — сервер сам переименует при необходимости
    hasFileConflict: false,
    hasDBConflict: false,
    dbConflict: {
      episode: { exists: false },
      transcript: { exists: false },
      questions: { exists: false }
    }
  };

  try {
    // Проверка существования эпизода в БД
    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .select('slug, lang')
      .eq('slug', episodeSlug)
      .eq('lang', lang)
      .maybeSingle();

    if (!episodeError && episode) {
      conflicts.hasDBConflict = true;
      conflicts.dbConflict.episode.exists = true;
    }

    // Проверка существования транскрипта
    if (conflicts.hasDBConflict) {
      const { data: transcript, error: transcriptError } = await supabase
        .from('transcripts')
        .select('episode_slug, lang')
        .eq('episode_slug', episodeSlug)
        .eq('lang', lang)
        .maybeSingle();

      if (!transcriptError && transcript) {
        conflicts.dbConflict.transcript.exists = true;
      }

      // Проверка существования вопросов
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('id')
        .eq('episode_slug', episodeSlug)
        .eq('lang', lang)
        .limit(1);

      if (!questionsError && questions && questions.length > 0) {
        conflicts.dbConflict.questions.exists = true;
      }
    }

    return conflicts;
  } catch (error) {
    console.warn('Error checking conflicts:', error);
    // В случае ошибки возвращаем пустые конфликты
    return {
      hasFileConflict: false,
      hasDBConflict: false,
      dbConflict: {
        episode: { exists: false },
        transcript: { exists: false },
        questions: { exists: false }
      }
    };
  }
};

export default {
  checkForConflicts,
  fileExists,
  checkFileExistsInStorage,
  checkFileConflicts
};


