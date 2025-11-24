// Простая утилита для получения URL аудио
const AUDIO_PUBLIC_BASE = import.meta.env.VITE_AUDIO_PUBLIC_BASE || 'https://dosmundos.pe/files/audio';

export const getAudioUrl = (episode) => {
  if (!episode) return null;
  
  console.log('🔧 [getAudioUrl] Episode data:', {
    slug: episode.slug,
    r2_object_key: episode.r2_object_key,
    audio_url: episode.audio_url
  });
  
  // Приоритет: audio_url (полная ссылка из Supabase) > r2_object_key
  if (episode.audio_url && episode.audio_url.startsWith('http')) {
    console.log('🔧 [getAudioUrl] Using audio_url from Supabase:', episode.audio_url);
    return episode.audio_url;
  }
  
  // Fallback: если есть r2_object_key, собираем URL
  if (episode.r2_object_key) {
    const fullUrl = episode.r2_object_key.startsWith('http') 
      ? episode.r2_object_key 
      : `${AUDIO_PUBLIC_BASE}/${encodeURIComponent(episode.r2_object_key)}`;
    
    console.log('🔧 [getAudioUrl] Using r2_object_key fallback:', fullUrl);
    return fullUrl;
  }
  
  // Проверяем что audio_url не指向 WordPress uploads (заблокировано CSP)
  if (episode.audio_url && !episode.audio_url.includes('/wp-content/uploads/')) {
    console.log('🔧 [getAudioUrl] Using audio_url:', episode.audio_url);
    return episode.audio_url;
  }
  
  // Если это WordPress URL, пробуем создать R2 URL из имени файла
  if (episode.audio_url && episode.audio_url.includes('/wp-content/uploads/')) {
    // Извлекаем имя файла из WordPress URL
    const fileName = episode.audio_url.split('/').pop();
    if (fileName) {
      const fallbackUrl = `${AUDIO_PUBLIC_BASE}/${encodeURIComponent(fileName)}`;
      console.log('🔧 [getAudioUrl] WordPress URL detected, using fallback:', fallbackUrl);
      return fallbackUrl;
    }
  }
  
  console.log('🔧 [getAudioUrl] No valid URL found for episode:', episode.slug);
  return null;
};
