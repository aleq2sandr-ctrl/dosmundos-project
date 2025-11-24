// Простая утилита для получения URL аудио
const AUDIO_PUBLIC_BASE = import.meta.env.VITE_AUDIO_PUBLIC_BASE || 'https://dosmundos.pe/files/audio';

export const getAudioUrl = (episode) => {
  if (!episode) return null;
  
  // Приоритет: audio_url (полная ссылка из Supabase) > r2_object_key
  if (episode.audio_url && episode.audio_url.startsWith('http')) {
    return episode.audio_url;
  }
  
  // Fallback: если есть r2_object_key, собираем URL
  if (episode.r2_object_key) {
    const fullUrl = episode.r2_object_key.startsWith('http') 
      ? episode.r2_object_key 
      : `${AUDIO_PUBLIC_BASE}/${encodeURIComponent(episode.r2_object_key)}`;
    
    return fullUrl;
  }
  
  // Проверяем что audio_url не指向 WordPress uploads (заблокировано CSP)
  if (episode.audio_url && !episode.audio_url.includes('/wp-content/uploads/')) {
    return episode.audio_url;
  }
  
  // Если это WordPress URL, пробуем создать R2 URL из имени файла
  if (episode.audio_url && episode.audio_url.includes('/wp-content/uploads/')) {
    // Извлекаем имя файла из WordPress URL
    const fileName = episode.audio_url.split('/').pop();
    if (fileName) {
      return `${AUDIO_PUBLIC_BASE}/${encodeURIComponent(fileName)}`;
    }
  }
  
  return null;
};
