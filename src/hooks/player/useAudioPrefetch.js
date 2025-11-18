import { useEffect, useRef } from 'react';
import audioCacheService from '@/lib/audioCacheService';
import logger from '@/lib/logger';

// Счетчик последовательных неудач для отключения prefetching
let consecutiveFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 5;

/**
 * Хук для предзагрузки следующего эпизода в фоне
 * Улучшает пользовательский опыт за счет мгновенного переключения между эпизодами
 */
const useAudioPrefetch = ({ 
  currentEpisodeSlug, 
  allEpisodes, 
  currentLanguage,
  isOfflineMode = false 
}) => {
  const prefetchedRef = useRef(new Set());
  const prefetchTimeoutRef = useRef(null);
  
  useEffect(() => {
    // Не делаем prefetch в офлайн режиме
    if (isOfflineMode || !currentEpisodeSlug || !allEpisodes || allEpisodes.length === 0) {
      return;
    }
    
    // Очищаем предыдущий таймаут
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current);
    }
    
    // Ждем немного перед prefetch, чтобы не мешать текущему воспроизведению
    prefetchTimeoutRef.current = setTimeout(async () => {
      try {
        // Находим индекс текущего эпизода
        const currentIndex = allEpisodes.findIndex(ep => ep.slug === currentEpisodeSlug);
        
        if (currentIndex === -1) {
          logger.debug('useAudioPrefetch: Current episode not found in list');
          return;
        }
        
        // Определяем следующий эпизод
        const nextEpisode = allEpisodes[currentIndex + 1];
        
        if (!nextEpisode || !nextEpisode.audio_url) {
          logger.debug('useAudioPrefetch: No next episode to prefetch');
          return;
        }
        
        // Проверяем, не загружали ли мы уже этот эпизод
        const prefetchKey = `${nextEpisode.slug}-${currentLanguage}`;
        if (prefetchedRef.current.has(prefetchKey)) {
          logger.debug('useAudioPrefetch: Already prefetched', prefetchKey);
          return;
        }
        
        // Проверяем, есть ли уже в кеше
        const isCached = await audioCacheService.isAudioCached(nextEpisode.audio_url);
        
        if (isCached) {
          logger.debug('useAudioPrefetch: Next episode already cached', nextEpisode.slug);
          prefetchedRef.current.add(prefetchKey);
          return;
        }
        
        logger.debug('useAudioPrefetch: Prefetching next episode', {
          slug: nextEpisode.slug,
          url: nextEpisode.audio_url
        });
        
        // Запускаем фоновое кеширование
        await audioCacheService.cacheAudio(nextEpisode.audio_url, nextEpisode.slug);
        
        // Отмечаем как загруженный
        prefetchedRef.current.add(prefetchKey);

        // Сбрасываем счетчик неудач при успешной загрузке
        consecutiveFailures = 0;

        logger.debug('useAudioPrefetch: Successfully prefetched', nextEpisode.slug);
      } catch (error) {
        consecutiveFailures++;

        // Если слишком много последовательных неудач, отключаем prefetching
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          logger.warn(`useAudioPrefetch: Too many consecutive failures (${consecutiveFailures}), disabling prefetching`);
          return;
        }

        // Не показываем ошибку пользователю, это фоновый процесс
        // Для сетевых ошибок используем более тихий лог
        if (error.message.includes('Failed to fetch') ||
            error.message.includes('NetworkError') ||
            error.message.includes('ERR_CONNECTION_RESET') ||
            error.name === 'TypeError') {
          logger.debug('useAudioPrefetch: Network issue during prefetch (non-critical)', error.message);
        } else {
          logger.debug('useAudioPrefetch: Prefetch failed (non-critical)', error);
        }
      }
    }, 3000); // 3 секунды после начала воспроизведения текущего эпизода
    
    return () => {
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current);
      }
    };
  }, [currentEpisodeSlug, allEpisodes, currentLanguage, isOfflineMode]);
  
  // Функция для явного prefetch (например, при наведении на следующий эпизод)
  const prefetchEpisode = async (episodeSlug, audioUrl) => {
    if (!audioUrl || isOfflineMode) return;
    
    const prefetchKey = `${episodeSlug}-${currentLanguage}`;
    if (prefetchedRef.current.has(prefetchKey)) {
      return;
    }
    
    try {
      const isCached = await audioCacheService.isAudioCached(audioUrl);
      if (!isCached) {
        logger.debug('useAudioPrefetch: Manual prefetch', episodeSlug);
        await audioCacheService.cacheAudio(audioUrl, episodeSlug);
        prefetchedRef.current.add(prefetchKey);
      }
    } catch (error) {
      logger.debug('useAudioPrefetch: Manual prefetch failed', error);
    }
  };
  
  return { prefetchEpisode };
};

export default useAudioPrefetch;






