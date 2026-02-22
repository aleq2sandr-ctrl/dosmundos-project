// Утилита для получения URL аудио с поддержкой вариантов дорожек
const AUDIO_PUBLIC_BASE = import.meta.env.VITE_AUDIO_PUBLIC_BASE || 'https://silver-lemur-512881.hostingersite.com/wp-content/uploads/Audio';

export const getAudioUrl = (episode, lang = null) => {
  if (!episode) return null;
  
  // Если указан язык, пытаемся найти соответствующий вариант
  if (lang) {
    const normalizedLang = String(lang).toLowerCase();
    
    // Проверяем available_variants или audio_variants (устаревший формат)
    const variants = episode.episode_audios || episode.audio_variants || episode.available_variants || [];
    
    // Поиск варианта по языку
    const audioVariant = variants.find(v => {
      const variantLang = (typeof v === 'string' ? v : v.lang);
      return String(variantLang).toLowerCase() === normalizedLang;
    });
    
    if (audioVariant) {
      return typeof audioVariant === 'string' ? null : (audioVariant.audio_url || audioVariant.audioUrl || null);
    }
  }
  
  // Приоритет: audio_url (полная ссылка из Supabase)
  if (episode.audio_url) {
    return episode.audio_url;
  }
  
  return null;
};

// Получение всех доступных аудиодорожек для эпизода
export const getAvailableAudioVariants = (episode) => {
  if (!episode) return [];
  
  const variants = episode.episode_audios || episode.audio_variants || episode.available_variants || [];
  
  return variants.map(v => {
    if (typeof v === 'string') {
      return { lang: v.toLowerCase(), audio_url: null };
    }
    return { 
      lang: String(v.lang || '').toLowerCase(), 
      audio_url: v.audio_url || v.audioUrl || null 
    };
  }).filter(v => v.lang && v.lang !== 'en'); // Исключаем английский язык
};

// Получение текущего выбранного языка аудиодорожки
export const getCurrentAudioLang = (episode) => {
  if (!episode) return 'mixed';
  
  // Проверяем прямое указание языка
  if (episode.lang) {
    return String(episode.lang).toLowerCase();
  }
  
  // Проверяем язык из audio_variants
  const variants = getAvailableAudioVariants(episode);
  if (variants.length > 0) {
    return variants[0].lang;
  }
  
  return 'mixed';
};
