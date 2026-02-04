// Утилита для валидации данных транскрипта
export const validateTranscriptData = (transcript) => {
  const errors = [];
  
  // Проверяем, что transcript существует и является объектом
  if (!transcript || typeof transcript !== 'object') {
    errors.push('Transcript must be a valid object');
    return { isValid: false, errors, sanitizedData: null };
  }
  
  // Проверяем обязательные поля
  if (!transcript.episode_slug || typeof transcript.episode_slug !== 'string') {
    errors.push('Episode slug is required and must be a string');
  }
  
  if (!transcript.lang || typeof transcript.lang !== 'string') {
    errors.push('Language is required and must be a string');
  }
  
  // Проверяем utterances
  if (!Array.isArray(transcript.utterances)) {
    errors.push('Utterances must be an array');
  } else {
    transcript.utterances.forEach((utterance, index) => {
      if (!utterance || typeof utterance !== 'object') {
        errors.push(`Utterance at index ${index} must be an object`);
        return;
      }
      
      if (typeof utterance.start !== 'number' || utterance.start < 0) {
        errors.push(`Utterance at index ${index} must have a valid start time (number >= 0)`);
      }
      
      if (typeof utterance.end !== 'number' || utterance.end <= utterance.start) {
        errors.push(`Utterance at index ${index} must have a valid end time (number > start)`);
      }
      
      if (!utterance.text || typeof utterance.text !== 'string') {
        errors.push(`Utterance at index ${index} must have text content`);
      }
    });
  }
  
  // Проверяем words (опционально)
  if (transcript.words !== undefined && !Array.isArray(transcript.words)) {
    errors.push('Words must be an array if provided');
  }
  
  // Проверяем text
  if (transcript.text !== undefined && typeof transcript.text !== 'string') {
    errors.push('Text must be a string if provided');
  }
  
  const isValid = errors.length === 0;
  
  // Создаем очищенные данные
  let sanitizedData = null;
  if (isValid) {
    sanitizedData = {
      ...transcript,
      id: transcript.id !== undefined ? Number(transcript.id) : undefined,
      utterances: transcript.utterances || [],
      words: transcript.words || [],
      text: transcript.text || (transcript.utterances || []).map(u => u.text).join(' '),
      cached_at: transcript.cached_at || Date.now(),
      last_updated: transcript.last_updated || Date.now()
    };
  }
  
  return { isValid, errors, sanitizedData };
};

// Helper to fix utterance timings
const fixUtterances = (utterances) => {
  if (!Array.isArray(utterances)) return [];
  
  return utterances.map((u, index, arr) => {
    if (!u || typeof u !== 'object') return null;
    
    // Ensure start is a non-negative number
    let start = typeof u.start === 'number' && !isNaN(u.start) && u.start >= 0 ? u.start : 0;
    
    // If start is 0 and it's not the first utterance, try to use previous end
    if (start === 0 && index > 0 && arr[index-1] && typeof arr[index-1].end === 'number') {
        // Add a small gap (e.g. 100ms) if using previous end
        start = arr[index-1].end + 100;
    }

    let end = typeof u.end === 'number' && !isNaN(u.end) ? u.end : 0;
    
    // Fix invalid end time (must be > start)
    if (end <= start) {
      // Try to use next utterance start
      if (index < arr.length - 1 && arr[index+1] && typeof arr[index+1].start === 'number' && arr[index+1].start > start) {
        // End at next start minus small gap
        end = Math.max(start + 100, arr[index+1].start - 100);
      } else {
        // Estimate based on text length (approx 50ms per character) or default 2s
        // AssemblyAI usually uses milliseconds
        const textLen = u.text ? u.text.length : 0;
        const duration = textLen > 0 ? Math.max(1000, textLen * 50) : 2000; // Min 1s
        end = start + duration;
      }
    }
    
    return {
      ...u,
      start,
      end,
      text: u.text || ''
    };
  }).filter(u => u !== null);
};

// Функция для очистки данных транскрипта перед сохранением
export const sanitizeTranscriptForSave = (transcript) => {
  // Если transcript отсутствует или некорректен, создаем базовую структуру
  if (!transcript || typeof transcript !== 'object') {
    console.warn('Invalid transcript data, creating fallback structure');
    return {
      id: Date.now(),
      episode_slug: 'unknown',
      lang: 'en',
      utterances: [],
      words: [],
      text: 'No text content',
      status: 'completed',
      cached_at: Date.now(),
      last_updated: Date.now()
    };
  }

  // Attempt to fix utterances before validation
  const fixedUtterances = fixUtterances(transcript.utterances);
  
  const transcriptToValidate = {
    ...transcript,
    utterances: fixedUtterances
  };

  const { isValid, errors, sanitizedData } = validateTranscriptData(transcriptToValidate);
  
  if (!isValid) {
    console.warn('Transcript validation errors (even after fix attempt):', errors);
    // Возвращаем данные с исправленными utterances, даже если есть другие ошибки
    return {
      id: transcript.id !== undefined ? Number(transcript.id) || Date.now() : Date.now(),
      episode_slug: transcript.episode_slug || 'unknown',
      lang: transcript.lang || 'en',
      utterances: fixedUtterances,
      words: Array.isArray(transcript.words) ? transcript.words : [],
      text: transcript.text || 'No text content',
      status: transcript.status || 'completed',
      cached_at: Date.now(),
      last_updated: Date.now()
    };
  }
  
  return sanitizedData;
};

// Функция для проверки совместимости с базой данных
export const isCompatibleWithDatabase = (transcript) => {
  if (!transcript || !transcript.id) return false;
  
  const transcriptId = Number(transcript.id);
  return !isNaN(transcriptId) && transcriptId > 0;
};

// Функция для создания безопасного ID
export const createSafeTranscriptId = (originalId) => {
  if (!originalId) return Date.now();
  
  const numericId = Number(originalId);
  if (!isNaN(numericId) && numericId > 0) {
    return numericId;
  }
  
  // Если ID некорректен, создаем новый на основе timestamp
  return Date.now();
};
