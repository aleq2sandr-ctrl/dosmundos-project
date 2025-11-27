// Простая утилита для получения URL аудио
const AUDIO_PUBLIC_BASE = import.meta.env.VITE_AUDIO_PUBLIC_BASE || 'https://dosmundos.pe/files/audio';

export const getAudioUrl = (episode) => {
  if (!episode) return null;
  
  // Приоритет: audio_url (полная ссылка из Supabase)
  if (episode.audio_url) {
    return episode.audio_url;
  }
  
  return null;
};
