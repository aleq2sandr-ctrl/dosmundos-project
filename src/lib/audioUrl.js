// Простая утилита для получения URL аудио
const AUDIO_PUBLIC_BASE = import.meta.env.VITE_AUDIO_PUBLIC_BASE || 'https://dosmundos.pe/files/audio';

export const getAudioUrl = (episode) => {
  if (!episode) return null;
  
  // Приоритет: audio_url (полная ссылка из Supabase)
  if (episode.audio_url) {
    // Fix for broken Hostinger domain
    if (episode.audio_url.includes('silver-lemur-512881.hostingersite.com') || episode.audio_url.includes('hostingersite.com')) {
      const filename = episode.audio_url.split('/').pop();
      return `${AUDIO_PUBLIC_BASE}/${filename}`;
    }
    return episode.audio_url;
  }
  
  return null;
};
