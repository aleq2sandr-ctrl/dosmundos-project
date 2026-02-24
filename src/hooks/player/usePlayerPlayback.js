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
  
  // Ref для доступа к актуальному jumpToTime внутри эффектов
  const jumpToTimeRef = useRef(jumpToTime);
  useEffect(() => {
    jumpToTimeRef.current = jumpToTime;
  }, [jumpToTime]);

  // Унифицированная попытка воспроизведения с обходом autoplay-политики
  const attemptPlay = async (audioElement) => {
    if (!audioElement.paused) return true;
    
    try {
      const p = audioElement.play();
      if (p !== undefined) {
        await p;
      }
      return true;
    } catch (err) {
      if (err?.name === 'NotAllowedError') {
        // Пытаемся начать в mute-режиме, затем снять mute
        try {
          // Стартуем в mute, оставляем mute до жеста пользователя
          const prevMuted = audioElement.muted;
          if (!audioElement.muted) audioElement.muted = true;
          const p2 = audioElement.play();
          if (p2 !== undefined) {
            await p2;
          }
          // Помечаем, что нужно снять mute при первом жесте пользователя
          autoplayPendingRef.current = 'unmute';
          // Если раньше не был mute, вернем громкость по жесту пользователя
          return true; // уже проигрывается (временно без звука)
        } catch (err2) {
          // Не удалось даже в mute — ждем жеста пользователя чтобы попытаться снова
          autoplayPendingRef.current = 'play';
          if (typeof setShowPlayOverlay === 'function') {
             console.log('[usePlayerPlayback] Autoplay blocked, showing overlay');
             setShowPlayOverlay(true);
          }
          return false;
        }
      }
      // AbortError - нормальное поведение при операциях seek/pause, просто игнорируем
      if (err?.name === 'AbortError') {
        logger.debug('[usePlayerPlayback] Play request aborted (expected during seek/pause operations)');
        return false;
      }
      // NotAllowedError - уже обработан выше
      if (err?.name === 'NotAllowedError') {
        return false;
      }
      // Другие ошибки логируем
      console.error('[usePlayerPlayback] Play error:', err);
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
    console.log('🔧 [usePlayerPlayback] Jump effect:', { 
      jumpToTime, 
      jumpId, 
      playAfterJump,
      currentSrc: audioRef.current?.src,
      currentTime: audioRef.current?.currentTime,
      readyState: audioRef.current?.readyState,
      paused: audioRef.current?.paused
    });
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
       console.log('🔧 [usePlayerPlayback] performSeek started:', { 
         audioRef: !!audioRef.current, 
         isSeeking: isSeekingRef.current, 
         time,
         src: audioRef.current?.src 
       });
       
       // If src is empty, we can't seek yet
       if (!audioRef.current || (!audioRef.current.src && !audioRef.current.currentSrc)) {
         console.log('🔧 [usePlayerPlayback] performSeek skipped: no src');
         return;
       }

       if (isSeekingRef.current) {
         console.log('🔧 [usePlayerPlayback] performSeek early return: already seeking');
         return;
       }
       
       isSeekingRef.current = true;

       // Cancel any pending play promise
       if (playPromiseRef.current) {
         playPromiseRef.current.catch(() => {});
         playPromiseRef.current = null;
       }
       
       const wasPlaying = isPlayingState;
       
       // Update UI immediately for responsiveness
       if (typeof setCurrentTimeState === 'function') {
         setCurrentTimeState(time);
       }
       onPlayerStateChange?.({ currentTime: time });
       
       try {
         // Set audio element time
         console.log('🔧 [usePlayerPlayback] Setting currentTime:', time);
         audioRef.current.currentTime = time;

         // Simplified approach: always wait for seeked event
         const onSeeked = () => {
           audioRef.current?.removeEventListener('seeked', onSeeked);
           
           if (playAfterJump || wasPlaying) {
             if (audioRef.current.paused && audioRef.current.readyState >= audioRef.current.HAVE_CURRENT_DATA) {
               console.log('🔧 [usePlayerPlayback] Attempting to play audio after seek...');
               playPromiseRef.current = attemptPlay(audioRef.current);
               playPromiseRef.current?.then((ok) => {
                 if (!ok) {
                    setIsPlayingState(false);
                    onPlayerStateChange?.({ isPlaying: false });
                    return;
                 }
                 setIsPlayingState(true);
                 onPlayerStateChange?.({ isPlaying: true });
               }).catch(e => {
                 console.error("Error in play promise chain (seeked):", e);
                 setIsPlayingState(false);
                 onPlayerStateChange?.({ isPlaying: false });
               }).finally(() => {
                 isSeekingRef.current = false;
               });
             } else {
               const shouldBePlaying = !audioRef.current.paused && audioRef.current.readyState >= audioRef.current.HAVE_CURRENT_DATA;
               setIsPlayingState(shouldBePlaying);
               onPlayerStateChange?.({ isPlaying: shouldBePlaying });
               isSeekingRef.current = false;
             }
           } else {
             if (!audioRef.current.paused) {
               try {
                 audioRef.current.pause();
               } catch (e) {
                 console.error('Error pausing audio after seek (seeked):', e);
               }
             }
             setIsPlayingState(false);
             onPlayerStateChange?.({ isPlaying: false });
             isSeekingRef.current = false;
           }
         };
         
         audioRef.current.addEventListener('seeked', onSeeked, { once: true });
         
         // Fallback to ensure seek operation completes even if seeked event fails
         setTimeout(() => {
           if (isSeekingRef.current) {
             console.warn('🔧 [usePlayerPlayback] Seek timeout — force-releasing seeking flag');
             isSeekingRef.current = false;
             
             if (playAfterJump && audioRef.current && audioRef.current.paused) {
               attemptPlay(audioRef.current).then(ok => {
                 if (ok) {
                   setIsPlayingState(true);
                   onPlayerStateChange?.({ isPlaying: true });
                 }
               }).catch(e => {
                 console.error('🔧 [usePlayerPlayback] Fallback play failed:', e);
               });
             } else {
               setIsPlayingState(wasPlaying);
               onPlayerStateChange?.({ isPlaying: wasPlaying });
             }
           }
         }, 800); // Reduced from 2000ms for faster recovery
         
       } catch (error) {
         console.error('🔧 [usePlayerPlayback] Error during seek:', error);
         isSeekingRef.current = false;
         setIsPlayingState(false);
         onPlayerStateChange?.({ isPlaying: false });
       }
     };

    console.log('🔧 [usePlayerPlayback] About to call performSeek');
    performSeek().catch(error => {
      console.error('🔧 [usePlayerPlayback] Error in performSeek:', error);
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
      
      // Отменяем предыдущий промис, если он есть
      if (playPromiseRef.current) {
        playPromiseRef.current.catch(() => {});
      }
      
      // Проверяем готовность аудио
      if (audioElement.readyState < audioElement.HAVE_CURRENT_DATA) {
        logger.debug('usePlayerPlayback: Audio not ready, waiting for canplay');
        
        // Ждем события canplay перед попыткой воспроизведения
        const onCanPlay = () => {
          if (isPlayingState && audioElement.paused) {
            playPromiseRef.current = attemptPlay(audioElement);
            playPromiseRef.current?.then((ok) => {
              if (!ok) return;
              logger.debug('usePlayerPlayback: Resume playback successful after canplay');
            }).catch(error => {
              if (error.name !== 'AbortError') {
                console.error("usePlayerPlayback: Resume playback error after canplay:", error);
                toast({
                  title: getLocaleString('playbackErrorTitle', currentLanguage),
                  description: getLocaleString('playbackErrorDescription', currentLanguage),
                  variant: "destructive",
                });
                isUpdatingPlayStateRef.current = true;
                setIsPlayingState(false);
                onPlayerStateChange?.({isPlaying: false});
                requestAnimationFrame(() => { isUpdatingPlayStateRef.current = false; });
              }
            });
          }
          audioElement.removeEventListener('canplay', onCanPlay);
        };
        
        audioElement.addEventListener('canplay', onCanPlay, { once: true });
        
        // Fallback timeout
        setTimeout(() => {
          audioElement.removeEventListener('canplay', onCanPlay);
        }, 3000);
        
        return;
      }
      
      playPromiseRef.current = attemptPlay(audioElement);
      playPromiseRef.current?.then((ok) => {
        if (!ok) return;
        logger.debug('usePlayerPlayback: Resume playback successful');
      }).catch(error => {
        // AbortError ожидаем при операциях seek/паузы - игнорируем
        if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') {
          console.error("usePlayerPlayback: Resume playback error:", error);
          toast({
            title: getLocaleString('playbackErrorTitle', currentLanguage),
            description: getLocaleString('playbackErrorDescription', currentLanguage),
            variant: "destructive",
          });
          isUpdatingPlayStateRef.current = true;
          setIsPlayingState(false);
          onPlayerStateChange?.({isPlaying: false});
          requestAnimationFrame(() => { isUpdatingPlayStateRef.current = false; });
        }
      });
    } 
    // Если состояние изменилось на "пауза", но аудио играет - ставим на паузу
    else if (!isPlayingState && !audioElement.paused) {
      logger.debug('usePlayerPlayback: State says paused but audio playing, pausing');
      try {
        audioElement.pause();
      } catch (error) {
        console.error('usePlayerPlayback: Error pausing audio:', error);
      }
    }
  }, [isPlayingState, toast, currentLanguage, setIsPlayingState, onPlayerStateChange]);

  // Синхронизация состояния с реальным состоянием аудио элемента (Audio -> React state)
  // Note: PlayerContext also handles play/pause/ended via JSX props on the <audio> element.
  // This effect syncs the LOCAL component state (isPlayingState) separately.
  // We use isUpdatingPlayStateRef to prevent feedback loops between the two.
  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) return;

    const handlePlay = () => {
      if (!isPlayingState && !isUpdatingPlayStateRef.current && !isSeekingRef.current) {
        isUpdatingPlayStateRef.current = true;
        setIsPlayingState(true);
        onPlayerStateChange?.({ isPlaying: true });
        // Use requestAnimationFrame instead of setTimeout for more reliable timing
        requestAnimationFrame(() => { isUpdatingPlayStateRef.current = false; });
      }
    };

    const handlePause = () => {
      if (isPlayingState && !isUpdatingPlayStateRef.current && !isSeekingRef.current) {
        isUpdatingPlayStateRef.current = true;
        setIsPlayingState(false);
        onPlayerStateChange?.({ isPlaying: false });
        requestAnimationFrame(() => { isUpdatingPlayStateRef.current = false; });
      }
    };

    const handleEnded = () => {
      if (!isUpdatingPlayStateRef.current) {
        isUpdatingPlayStateRef.current = true;
        setIsPlayingState(false);
        onPlayerStateChange?.({ isPlaying: false });
        requestAnimationFrame(() => { isUpdatingPlayStateRef.current = false; });
      }
    };
    
    // Release seeking guard on canplaythrough — handles cases where seeked event is missed
    const handleCanPlayThrough = () => {
      if (isSeekingRef.current) {
        isSeekingRef.current = false;
      }
    };

    audioElement.addEventListener('play', handlePlay);
    audioElement.addEventListener('pause', handlePause);
    audioElement.addEventListener('ended', handleEnded);
    audioElement.addEventListener('canplaythrough', handleCanPlayThrough);

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
      audioElement.removeEventListener('canplaythrough', handleCanPlayThrough);
      window.removeEventListener('pointerdown', handleFirstUserGesture, true);
      window.removeEventListener('click', handleFirstUserGesture, true);
      window.removeEventListener('keydown', handleFirstUserGesture, true);
      window.removeEventListener('touchstart', handleFirstUserGesture, true);
      window.removeEventListener('wheel', handleFirstUserGesture, true);
    };
  }, [audioRef, isPlayingState, setIsPlayingState, onPlayerStateChange]);

  // Единственный эффект автозапуска при смене эпизода
  useEffect(() => {
    if (!audioRef.current || !episodeData?.audio_url) return;
    
    const audioElement = audioRef.current;
    const newUrl = episodeData.audio_url;
    const normalizedNewUrl = normalizeUrl(newUrl);
    const normalizedCurrentUrl = normalizeUrl(audioElement.src);
    
    // Проверяем, изменился ли URL эпизода (с нормализацией для точного сравнения)
    const isNewEpisode = normalizedCurrentUrl !== normalizedNewUrl && normalizedNewUrl !== lastLoadedUrlRef.current;
    
    // Force update if src is empty but we have a URL (fix for initial load issues)
    const shouldUpdateSrc = isNewEpisode || (normalizedCurrentUrl === '' && normalizedNewUrl !== '');
    
    // Если мы в процессе поиска (seeking), но это НЕ новый эпизод - выходим
    if (isSeekingRef.current && !shouldUpdateSrc) return;
    
    // Check if the src is already set correctly (e.g. by PlayerContext)
    // If it is, we don't need to set it again, which avoids reloading
    if (normalizedCurrentUrl === normalizedNewUrl && normalizedNewUrl !== '') {
        // Just update our ref so we know we've "loaded" it
        lastLoadedUrlRef.current = normalizedNewUrl;
        return;
    }

    if (shouldUpdateSrc) {
      logger.debug('usePlayerPlayback: New episode detected', { 
        newUrl: normalizedNewUrl, 
        currentUrl: normalizedCurrentUrl,
        reason: isNewEpisode ? 'url_change' : 'empty_src'
      });
      
      console.log('[usePlayerPlayback] Setting new audio URL:', newUrl);
      
      // Сбрасываем флаг поиска, так как загружаем новый источник
      isSeekingRef.current = false;
      
      // Запоминаем загруженный URL
      lastLoadedUrlRef.current = normalizedNewUrl;

      // Создаем обработчики для быстрого автозапуска
      let autoplayAttempted = false;
      
      // Обработчик для быстрого старта (как только метаданные загружены)
      const handleLoadedMetadata = () => {
        // Remove both listeners to ensure we only run once
        audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audioElement.removeEventListener('canplay', handleCanPlay);
        
        if (autoplayAttempted) return;
        autoplayAttempted = true;
        
        logger.debug('usePlayerPlayback: Metadata loaded, attempting quick autoplay');
        
        // Восстанавливаем позицию, если она была задана (исправление потери прыжка при смене src)
        if (jumpToTimeRef.current !== null && jumpToTimeRef.current !== undefined) {
             const time = parseFloat(jumpToTimeRef.current);
             // Если время отличается более чем на 0.1с, восстанавливаем
             // Также восстанавливаем если это 0, чтобы гарантировать сброс
             if (!isNaN(time) && (Math.abs(audioElement.currentTime - time) > 0.1 || time === 0)) {
                 console.log('[usePlayerPlayback] Restoring jump after src load:', time);
                 audioElement.currentTime = time;
                 
                 // Update UI state as well
                 if (typeof setCurrentTimeState === 'function') {
                    setCurrentTimeState(time);
                 }
             }
        }
        
        // Проверяем, не начало ли уже воспроизводиться
        if (!audioElement.paused) {
          logger.debug('usePlayerPlayback: Already playing, skipping autoplay');
          isUpdatingPlayStateRef.current = true;
          setIsPlayingState(true);
          onPlayerStateChange?.({ isPlaying: true });
          requestAnimationFrame(() => { isUpdatingPlayStateRef.current = false; });
          return;
        }
        // Пытаемся запустить воспроизведение сразу
        const playPromise = attemptPlay(audioElement);
        playPromise?.then((ok) => {
          if (!ok) {
             // Autoplay failed or blocked - don't change state
             return;
          }
          logger.debug('usePlayerPlayback: Quick autoplay successful');
          isUpdatingPlayStateRef.current = true;
          setIsPlayingState(true);
          onPlayerStateChange?.({ isPlaying: true });
          requestAnimationFrame(() => { isUpdatingPlayStateRef.current = false; });
          // Пытаемся автоматически включить звук, если запустили в mute
          if (firstVisitRef.current || autoplayPendingRef.current === 'unmute') {
            scheduleAutoUnmute(audioElement);
          }
        }).catch(error => {
           console.error("usePlayerPlayback: Autoplay promise error:", error);
        });
      };
      
      // Fallback обработчик если loadedmetadata не сработал
      const handleCanPlay = () => {
        // Remove both listeners
        audioElement.removeEventListener('canplay', handleCanPlay);
        audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
        
        if (autoplayAttempted) return;
        autoplayAttempted = true;
        
        logger.debug('usePlayerPlayback: Can play event, attempting autoplay');
        
        if (!audioElement.paused) {
          logger.debug('usePlayerPlayback: Already playing, skipping autoplay');
          isUpdatingPlayStateRef.current = true;
          setIsPlayingState(true);
          onPlayerStateChange?.({ isPlaying: true });
          requestAnimationFrame(() => { isUpdatingPlayStateRef.current = false; });
          return;
        }
        
        const playPromise = attemptPlay(audioElement);
        playPromise?.then((ok) => {
          if (!ok) return;
          logger.debug('usePlayerPlayback: Fallback autoplay successful');
          isUpdatingPlayStateRef.current = true;
          setIsPlayingState(true);
          onPlayerStateChange?.({ isPlaying: true });
          requestAnimationFrame(() => { isUpdatingPlayStateRef.current = false; });
          if (firstVisitRef.current || autoplayPendingRef.current === 'unmute') {
            scheduleAutoUnmute(audioElement);
          }
        }).catch(error => {
           console.error("usePlayerPlayback: Fallback autoplay promise error:", error);
        });
      };
      
      audioElement.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
      audioElement.addEventListener('canplay', handleCanPlay, { once: true });

      // Устанавливаем новый src
      audioElement.src = newUrl;
      console.log('[usePlayerPlayback] audio.src set to:', audioElement.src);
      audioElement.load();
      console.log('[usePlayerPlayback] Called audio.load()');
      
      // Check if metadata is already loaded (e.g. from cache)
      // We check this AFTER setting src and calling load()
      // But we need to be careful not to trigger it twice if the browser fires the event immediately
      if (audioElement.readyState >= 1) { // HAVE_METADATA
         console.log('[usePlayerPlayback] Metadata already loaded, triggering handler manually');
         // Use setTimeout to allow the event loop to process any pending events first
         // This prevents double-firing if the browser fires the event synchronously
         setTimeout(() => {
            if (!autoplayAttempted) {
                handleLoadedMetadata();
            }
         }, 0);
      }
      
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
      
      // Cleanup функция для удаления обработчиков, если компонент размонтируется
      return () => {
        audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audioElement.removeEventListener('canplay', handleCanPlay);
      };
    }
  }, [episodeData?.slug, episodeData?.audio_url]); // Зависим только от slug и audio_url

};

export default usePlayerPlayback;