import { useEffect, useRef } from 'react';
import { getLocaleString } from '@/lib/locales';
import logger from '@/lib/logger';

const usePlayerPlayback = ({
  episodeData,
  audioRef,
  isPlayingState,
  setIsPlayingState,
  isSeekingRef,
  toast,
  currentLanguage,
  onPlayerStateChange,
  lastJumpIdProcessedRef,
  jumpToTime,
  jumpId,
  playAfterJump,
  setCurrentTimeState,
  setShowPlayOverlay // новый пропс
}) => {
  const playPromiseRef = useRef(null);
  const isUpdatingPlayStateRef = useRef(false); // Флаг для предотвращения циклов
  const lastLoadedUrlRef = useRef(''); // Отслеживаем загруженный URL
  const autoplayPendingRef = useRef(null); // 'play' | 'unmute' | null
  const firstVisitRef = useRef(typeof window !== 'undefined' ? !localStorage.getItem('autoplaySeen') : false);
  
  // Унифицированная попытка воспроизведения с обходом autoplay-политики
  const attemptPlay = async (audioElement) => {
    try {
      const p = audioElement.play();
      await p;
      return true;
    } catch (err) {
      if (err?.name === 'NotAllowedError') {
        // Пытаемся начать в mute-режиме, затем снять mute
        try {
          // Стартуем в mute, оставляем mute до жеста пользователя
          const prevMuted = audioElement.muted;
          if (!audioElement.muted) audioElement.muted = true;
          const p2 = audioElement.play();
          await p2;
          // Помечаем, что нужно снять mute при первом жесте пользователя
          autoplayPendingRef.current = 'unmute';
          // Если раньше не был mute, вернем громкость по жесту пользователя
          return true; // уже проигрывается (временно без звука)
        } catch (err2) {
          // Не удалось даже в mute — ждем жеста пользователя чтобы попытаться снова
          autoplayPendingRef.current = 'play';
          return false;
        }
      }
      return false;
    }
  };

  // Пробуем автоматически снять mute несколькими попытками, чтобы сделать звук без клика
  const scheduleAutoUnmute = (audioElement) => {
    const attempts = [150, 400, 1000];
    attempts.forEach((delay, idx) => {
      setTimeout(() => {
        try {
          if (!audioElement) return;
          if (!audioElement.muted) return; // уже со звуком
          audioElement.muted = false;
          if (!audioElement.paused && !audioElement.muted) {
            // Успешно включили звук — отмечаем первый визит обработан
            try { localStorage.setItem('autoplaySeen', '1'); } catch {}
            firstVisitRef.current = false;
          } else if (idx === attempts.length - 1 && typeof setShowPlayOverlay === 'function') {
            // Не удалось — покажем оверлей для жеста
            setShowPlayOverlay(true);
          }
        } catch {}
      }, delay);
    });
  };
  
  // Нормализация URL для корректного сравнения
  const normalizeUrl = (url) => {
    if (!url) return '';
    try {
      return new URL(url, window.location.href).href;
    } catch {
      return url;
    }
  };

  useEffect(() => {
    if (jumpToTime === null || jumpToTime === undefined || !audioRef.current) {
      return;
    }
    
    const time = parseFloat(jumpToTime);
    const id = jumpId;

    if (isNaN(time)) {
      return;
    }

    if (lastJumpIdProcessedRef && lastJumpIdProcessedRef.current === id) {
      return;
    }
    
    if (lastJumpIdProcessedRef) {
      lastJumpIdProcessedRef.current = id;
    }
    


    const performSeek = async () => {
      if (!audioRef.current || isSeekingRef.current) {
        return;
      }
      
      isSeekingRef.current = true;

      // Cancel any pending play promise
      if (playPromiseRef.current) {
        playPromiseRef.current.catch(() => {});
      }
      
      const wasPlaying = isPlayingState; // Используем состояние React вместо аудио элемента
      
      // Update the current time state immediately for UI responsiveness
      if (typeof setCurrentTimeState === 'function') {
        setCurrentTimeState(time);
      }
      onPlayerStateChange?.({ currentTime: time });
      
      // Set the audio element's time
      audioRef.current.currentTime = time;

      // Оптимизированная логика: не ждем события seeked, если аудио уже готово
      const isReady = audioRef.current.readyState >= audioRef.current.HAVE_CURRENT_DATA;
      
      if (isReady) {
        // Аудио готово - сразу продолжаем воспроизведение
        if (playAfterJump || wasPlaying) {
          // Дополнительная проверка: убеждаемся что аудио действительно на паузе
          if (audioRef.current.paused) {
            playPromiseRef.current = attemptPlay(audioRef.current);
            playPromiseRef.current?.then((ok) => {
              if (!ok) return; 
              setIsPlayingState(true);
              onPlayerStateChange?.({ isPlaying: true });
            }).catch(e => {
              if (e.name === 'NotAllowedError' && typeof setShowPlayOverlay === 'function') setShowPlayOverlay(true);
              if (e.name !== 'AbortError') console.error("Error playing after jump:", e);
              setIsPlayingState(false);
              onPlayerStateChange?.({ isPlaying: false });
            }).finally(() => {
              isSeekingRef.current = false;
            });
          } else {
            // Аудио уже воспроизводится - просто обновляем состояние
            setIsPlayingState(true);
            onPlayerStateChange?.({ isPlaying: true });
            isSeekingRef.current = false;
          }
        } else {
          // Если не нужно воспроизводить, убеждаемся что аудио на паузе
          if (!audioRef.current.paused) {
            audioRef.current.pause();
          }
          setIsPlayingState(false);
          onPlayerStateChange?.({ isPlaying: false });
          isSeekingRef.current = false;
        }
      } else {
        // Аудио не готово - используем старую логику с событием seeked
        const onSeeked = () => {
          audioRef.current?.removeEventListener('seeked', onSeeked);
          
          if (playAfterJump || wasPlaying) {
            // Дополнительная проверка перед воспроизведением
            if (audioRef.current.paused) {
              playPromiseRef.current = attemptPlay(audioRef.current);
              playPromiseRef.current?.then((ok) => {
                if (!ok) return;
                setIsPlayingState(true);
                onPlayerStateChange?.({ isPlaying: true });
              }).catch(e => {
                if (e.name === 'NotAllowedError' && typeof setShowPlayOverlay === 'function') setShowPlayOverlay(true);
                if (e.name !== 'AbortError') console.error("Error playing after jump:", e);
                setIsPlayingState(false);
                onPlayerStateChange?.({ isPlaying: false });
              }).finally(() => {
                isSeekingRef.current = false;
              });
            } else {
              // Аудио уже воспроизводится
              setIsPlayingState(true);
              onPlayerStateChange?.({ isPlaying: true });
              isSeekingRef.current = false;
            }
          } else {
            // Убеждаемся что аудио на паузе
            if (!audioRef.current.paused) {
              audioRef.current.pause();
            }
            setIsPlayingState(false);
            onPlayerStateChange?.({ isPlaying: false });
            isSeekingRef.current = false;
          }
        };
        
        audioRef.current.addEventListener('seeked', onSeeked, { once: true });
        
        // Уменьшенный timeout для более быстрого отклика
        setTimeout(() => {
          if (isSeekingRef.current) {
            logger.debug('usePlayerPlayback: Fallback timeout - clearing seeking flag');
            isSeekingRef.current = false;
          }
        }, 500); // Уменьшено с 2000ms до 500ms
      }
    };

    performSeek().catch(error => {
      logger.error("Error in performSeek:", error);
      isSeekingRef.current = false;
    });

  }, [jumpToTime, playAfterJump, jumpId]);


  // Синхронизация команды play/pause с аудио элементом (React state -> Audio)
  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement || isSeekingRef.current || isUpdatingPlayStateRef.current) return;

    // Если состояние изменилось на "играет", но аудио на паузе - запускаем
    if (isPlayingState && audioElement.paused) {
      logger.debug('usePlayerPlayback: State says playing but audio paused, resuming playback');
      
      if (playPromiseRef.current) {
        playPromiseRef.current.catch(() => {});
      }
      
      playPromiseRef.current = attemptPlay(audioElement);
      playPromiseRef.current?.then((ok) => {
        if (!ok) return;
        logger.debug('usePlayerPlayback: Resume playback successful');
      }).catch(error => {
        if (error.name !== 'AbortError') {
          console.error("usePlayerPlayback: Resume playback error:", error);
          toast({
            title: getLocaleString('playbackErrorTitle', currentLanguage),
            description: getLocaleString('playbackErrorDescription', currentLanguage),
            variant: "destructive",
          });
        }
        // Обновляем состояние с защитой от цикла
        isUpdatingPlayStateRef.current = true;
        setIsPlayingState(false);
        onPlayerStateChange?.({isPlaying: false});
        setTimeout(() => { isUpdatingPlayStateRef.current = false; }, 50);
      });
    } 
    // Если состояние изменилось на "пауза", но аудио играет - ставим на паузу
    else if (!isPlayingState && !audioElement.paused) {
      logger.debug('usePlayerPlayback: State says paused but audio playing, pausing');
      audioElement.pause();
    }
  }, [isPlayingState]);

  // Синхронизация состояния с реальным состоянием аудио элемента (Audio -> React state)
  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) return;

    const handlePlay = () => {
      logger.debug('usePlayerPlayback: Audio play event, syncing state');
      if (!isPlayingState && !isUpdatingPlayStateRef.current) {
        isUpdatingPlayStateRef.current = true;
        setIsPlayingState(true);
        onPlayerStateChange?.({ isPlaying: true });
        setTimeout(() => { isUpdatingPlayStateRef.current = false; }, 50);
      }
    };

    const handlePause = () => {
      logger.debug('usePlayerPlayback: Audio pause event, syncing state');
      if (isPlayingState && !isUpdatingPlayStateRef.current) {
        isUpdatingPlayStateRef.current = true;
        setIsPlayingState(false);
        onPlayerStateChange?.({ isPlaying: false });
        setTimeout(() => { isUpdatingPlayStateRef.current = false; }, 50);
      }
    };

    const handleEnded = () => {
      logger.debug('usePlayerPlayback: Audio ended event, syncing state');
      if (isPlayingState && !isUpdatingPlayStateRef.current) {
        isUpdatingPlayStateRef.current = true;
        setIsPlayingState(false);
        onPlayerStateChange?.({ isPlaying: false });
        setTimeout(() => { isUpdatingPlayStateRef.current = false; }, 50);
      }
    };

    audioElement.addEventListener('play', handlePlay);
    audioElement.addEventListener('pause', handlePause);
    audioElement.addEventListener('ended', handleEnded);

    // Если был NotAllowedError и есть намерение воспроизвести (например, play=true),
    // пробуем один раз запустить при первом пользовательском взаимодействии
    const handleFirstUserGesture = () => {
      if (autoplayPendingRef.current === 'play') {
        autoplayPendingRef.current = null;
        attemptPlay(audioElement).catch(() => {});
      } else if (autoplayPendingRef.current === 'unmute') {
        autoplayPendingRef.current = null;
        try {
          audioElement.muted = false;
          if (audioElement.paused) {
            attemptPlay(audioElement).catch(() => {});
          }
        } catch {}
      }
      window.removeEventListener('pointerdown', handleFirstUserGesture, true);
      window.removeEventListener('click', handleFirstUserGesture, true);
      window.removeEventListener('keydown', handleFirstUserGesture, true);
      window.removeEventListener('touchstart', handleFirstUserGesture, true);
      window.removeEventListener('wheel', handleFirstUserGesture, true);
    };
    window.addEventListener('pointerdown', handleFirstUserGesture, true);
    window.addEventListener('click', handleFirstUserGesture, true);
    window.addEventListener('keydown', handleFirstUserGesture, true);
    window.addEventListener('touchstart', handleFirstUserGesture, true);
    window.addEventListener('wheel', handleFirstUserGesture, { capture: true, passive: true });

    return () => {
      audioElement.removeEventListener('play', handlePlay);
      audioElement.removeEventListener('pause', handlePause);
      audioElement.removeEventListener('ended', handleEnded);
      window.removeEventListener('pointerdown', handleFirstUserGesture, true);
      window.removeEventListener('click', handleFirstUserGesture, true);
      window.removeEventListener('keydown', handleFirstUserGesture, true);
      window.removeEventListener('touchstart', handleFirstUserGesture, true);
      window.removeEventListener('wheel', handleFirstUserGesture, true);
    };
  }, [audioRef, isPlayingState, setIsPlayingState, onPlayerStateChange]);

  // Единственный эффект автозапуска при смене эпизода
  useEffect(() => {
    if (!audioRef.current || !episodeData?.audio_url || isSeekingRef.current) return;
    
    const audioElement = audioRef.current;
    const newUrl = episodeData.audio_url;
    const normalizedNewUrl = normalizeUrl(newUrl);
    const normalizedCurrentUrl = normalizeUrl(audioElement.src);
    
    // Проверяем, изменился ли URL эпизода (с нормализацией для точного сравнения)
    const isNewEpisode = normalizedCurrentUrl !== normalizedNewUrl && normalizedNewUrl !== lastLoadedUrlRef.current;
    
    if (isNewEpisode) {
      logger.debug('usePlayerPlayback: New episode detected', { 
        newUrl: normalizedNewUrl, 
        currentUrl: normalizedCurrentUrl 
      });
      
      console.log('[usePlayerPlayback] Setting new audio URL:', newUrl);
      
      // Запоминаем загруженный URL
      lastLoadedUrlRef.current = normalizedNewUrl;
      
      // Устанавливаем новый src
      audioElement.src = newUrl;
      console.log('[usePlayerPlayback] audio.src set to:', audioElement.src);
      audioElement.load();
      console.log('[usePlayerPlayback] Called audio.load()');
      
      // Обновляем время последнего доступа в кеше для приоритизации
      if (typeof window !== 'undefined' && window.audioCacheService) {
        window.audioCacheService.updateLastAccessed(newUrl).catch(err => {
          logger.debug('usePlayerPlayback: Failed to update cache access time', err);
        });
      }
      
      // На первом визите принудительно включаем mute, чтобы обойти блокировку
      if (firstVisitRef.current) {
        try { audioElement.muted = true; } catch {}
      }

      // Создаем обработчики для быстрого автозапуска
      let autoplayAttempted = false;
      
      // Обработчик для быстрого старта (как только метаданные загружены)
      const handleLoadedMetadata = () => {
        audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
        
        if (autoplayAttempted) return;
        autoplayAttempted = true;
        
        logger.debug('usePlayerPlayback: Metadata loaded, attempting quick autoplay');
        
        // Проверяем, не начало ли уже воспроизводиться
        if (!audioElement.paused) {
          logger.debug('usePlayerPlayback: Already playing, skipping autoplay');
          isUpdatingPlayStateRef.current = true;
          setIsPlayingState(true);
          onPlayerStateChange?.({ isPlaying: true });
          setTimeout(() => { isUpdatingPlayStateRef.current = false; }, 50);
          return;
        }
        
        // Пытаемся запустить воспроизведение сразу
        const playPromise = attemptPlay(audioElement);
        playPromise?.then((ok) => {
          if (!ok) return;
          logger.debug('usePlayerPlayback: Quick autoplay successful');
          isUpdatingPlayStateRef.current = true;
          setIsPlayingState(true);
          onPlayerStateChange?.({ isPlaying: true });
          setTimeout(() => { isUpdatingPlayStateRef.current = false; }, 50);
          // Пытаемся автоматически включить звук, если запустили в mute
          if (firstVisitRef.current || autoplayPendingRef.current === 'unmute') {
            scheduleAutoUnmute(audioElement);
          }
        }).catch(error => {
          if (error.name === 'NotAllowedError') {
            logger.debug('usePlayerPlayback: Autoplay blocked by browser - user interaction required');
            if (typeof setShowPlayOverlay === 'function') setShowPlayOverlay(true);
          } else if (error.name !== 'AbortError') {
            console.error("usePlayerPlayback: Autoplay error:", error);
          }
          // Не обновляем состояние при блокировке автозапуска
        });
      };
      
      // Fallback обработчик если loadedmetadata не сработал
      const handleCanPlay = () => {
        audioElement.removeEventListener('canplay', handleCanPlay);
        
        if (autoplayAttempted) return;
        autoplayAttempted = true;
        
        logger.debug('usePlayerPlayback: Can play event, attempting autoplay');
        
        if (!audioElement.paused) {
          logger.debug('usePlayerPlayback: Already playing, skipping autoplay');
          isUpdatingPlayStateRef.current = true;
          setIsPlayingState(true);
          onPlayerStateChange?.({ isPlaying: true });
          setTimeout(() => { isUpdatingPlayStateRef.current = false; }, 50);
          return;
        }
        
        const playPromise = attemptPlay(audioElement);
        playPromise?.then((ok) => {
          if (!ok) return;
          logger.debug('usePlayerPlayback: Fallback autoplay successful');
          isUpdatingPlayStateRef.current = true;
          setIsPlayingState(true);
          onPlayerStateChange?.({ isPlaying: true });
          setTimeout(() => { isUpdatingPlayStateRef.current = false; }, 50);
          if (firstVisitRef.current || autoplayPendingRef.current === 'unmute') {
            scheduleAutoUnmute(audioElement);
          }
        }).catch(error => {
          if (error.name === 'NotAllowedError') {
            logger.debug('usePlayerPlayback: Fallback autoplay blocked');
            if (typeof setShowPlayOverlay === 'function') setShowPlayOverlay(true);
          } else if (error.name !== 'AbortError') {
            console.error("usePlayerPlayback: Fallback autoplay error:", error);
          }
        });
      };
      
      audioElement.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
      audioElement.addEventListener('canplay', handleCanPlay, { once: true });
      
      // Cleanup функция для удаления обработчиков, если компонент размонтируется
      return () => {
        audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audioElement.removeEventListener('canplay', handleCanPlay);
      };
    }
  }, [episodeData?.slug, episodeData?.audio_url]); // Зависим только от slug и audio_url

};

export default usePlayerPlayback;