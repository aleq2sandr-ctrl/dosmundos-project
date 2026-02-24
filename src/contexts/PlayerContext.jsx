import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { getAudioUrl } from '@/lib/audioUrl';

const PlayerContext = createContext(null);

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};

export const PlayerProvider = ({ children }) => {
  const audioRef = useRef(null);
  const [currentEpisode, setCurrentEpisode] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isGlobalPlayerVisible, setIsGlobalPlayerVisible] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [buffered, setBuffered] = useState(0); // Buffered percentage
  
  // ─── Seeking guard: prevents timeupdate from overwriting seek target ───
  const isSeekingRef = useRef(false);
  const seekTargetRef = useRef(null);
  const seekTimeoutRef = useRef(null);
  // Track whether user is dragging the progress bar
  const isDraggingRef = useRef(false);
  
  // ─── Playback health monitor: detects stuck audio ───
  const healthCheckRef = useRef(null);
  const lastHealthTimeRef = useRef(0);
  const stallCountRef = useRef(0);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;
  // Track stalled events to avoid loading flicker
  const stalledTimerRef = useRef(null);

  // Helper for safe playback
  const safePlay = useCallback(async () => {
    if (!audioRef.current) return;
    try {
      await audioRef.current.play();
      setIsPlaying(true);
      setAutoplayBlocked(false);
    } catch (error) {
      if (error.name === 'AbortError') {
        // Normal during rapid seek/play operations, ignore
        return;
      }
      console.error('[PlayerContext] Play error:', error);
      setIsPlaying(false);
      if (error.name === 'NotAllowedError') {
        setAutoplayBlocked(true);
      }
    }
  }, []);

  // Play a specific episode
  const playEpisode = useCallback(async (episode, startTime = 0) => {
    console.log('🎵 [PlayerContext] playEpisode called:', {
      episodeSlug: episode.slug,
      startTime,
      audioUrl: episode.audioUrl || episode.audio_url
    });
    
    const audioUrl = episode.audioUrl || episode.audio_url;
    
    if (!audioUrl) {
      console.error('[PlayerContext] No audio URL available for episode:', episode.slug);
      return;
    }

    const isSameEpisode = currentEpisode?.slug === episode.slug;
    const currentAudioUrl = currentEpisode?.audioUrl || currentEpisode?.audio_url;
    const isSameAudio = audioUrl === currentAudioUrl;
    
    if (isSameEpisode && isSameAudio) {
      console.log('🎵 [PlayerContext] Same episode and audio, ensuring playback');
      if (Math.abs(currentTime - startTime) > 1) {
        seek(startTime);
      }
      if (!isPlaying) {
        safePlay();
      }
      return;
    }
    
    console.log('🎵 [PlayerContext] Loading new episode/audio:', episode.slug);
    
    // Update state
    setCurrentEpisode(episode);
    setIsGlobalPlayerVisible(true);
    setAutoplayBlocked(false);
    
    if (audioRef.current) {
      // Pause current playback if any
      audioRef.current.pause();
      
      // Set new source
      audioRef.current.src = audioUrl;
      audioRef.current.playbackRate = playbackRate;
      
      // Handle start time
      if (startTime > 0) {
        audioRef.current.currentTime = startTime;
        setCurrentTime(startTime);
      } else {
        setCurrentTime(0);
      }

      // Load and play
      try {
        await audioRef.current.load();
        await safePlay();
      } catch (e) {
        if (e.name !== 'AbortError') {
          console.error('[PlayerContext] Error loading/playing:', e);
        }
      }
    }
  }, [currentEpisode, isPlaying, playbackRate, currentTime]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current || !audioRef.current.src) {
      console.warn('[PlayerContext] No audio source available for playback');
      setIsPlaying(false);
      return;
    }
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      safePlay();
    }
  }, [isPlaying, safePlay]);

  // Force-release seeking guard — used as a safety valve
  const releaseSeekingGuard = useCallback(() => {
    isSeekingRef.current = false;
    seekTargetRef.current = null;
    if (seekTimeoutRef.current) {
      clearTimeout(seekTimeoutRef.current);
      seekTimeoutRef.current = null;
    }
  }, []);

  const seek = useCallback((time) => {
    if (!audioRef.current) return;
    
    const dur = audioRef.current.duration;
    const maxTime = Number.isFinite(dur) ? dur : time; 
    const clampedTime = Math.max(0, Math.min(time, maxTime));
    
    // Set seeking guard — prevents timeupdate from overwriting our target
    isSeekingRef.current = true;
    seekTargetRef.current = clampedTime;
    
    // Clear any existing seek timeout
    if (seekTimeoutRef.current) {
      clearTimeout(seekTimeoutRef.current);
    }
    
    try {
      audioRef.current.currentTime = clampedTime;
      setCurrentTime(clampedTime);
    } catch (error) {
      console.error('[PlayerContext] Seek error:', error);
      releaseSeekingGuard();
    }
    
    // Safety: release seeking guard after timeout (reduced from 2000ms to 800ms)
    seekTimeoutRef.current = setTimeout(() => {
      if (isSeekingRef.current) {
        console.warn('[PlayerContext] Seek timeout — force-releasing seeking guard');
        releaseSeekingGuard();
        // Sync to actual position
        if (audioRef.current && !isDraggingRef.current) {
          setCurrentTime(audioRef.current.currentTime);
        }
      }
    }, 800);
  }, [releaseSeekingGuard]);

  // Seek and optionally play — atomic operation that avoids race conditions
  const seekAndPlay = useCallback((time, shouldPlay = false) => {
    if (!audioRef.current) return;
    
    const dur = audioRef.current.duration;
    const maxTime = Number.isFinite(dur) ? dur : time;
    const clampedTime = Math.max(0, Math.min(time, maxTime));
    
    isSeekingRef.current = true;
    seekTargetRef.current = clampedTime;
    
    if (seekTimeoutRef.current) {
      clearTimeout(seekTimeoutRef.current);
    }
    
    try {
      audioRef.current.currentTime = clampedTime;
      setCurrentTime(clampedTime);
    } catch (error) {
      console.error('[PlayerContext] SeekAndPlay seek error:', error);
      releaseSeekingGuard();
      return;
    }
    
    // Play after the browser confirms the seek completed
    if (shouldPlay && !isPlaying) {
      const onSeeked = () => {
        audioRef.current?.removeEventListener('seeked', onSeeked);
        safePlay();
      };
      audioRef.current.addEventListener('seeked', onSeeked, { once: true });
    }
    
    // Reduced timeout for faster recovery
    seekTimeoutRef.current = setTimeout(() => {
      if (isSeekingRef.current) {
        console.warn('[PlayerContext] SeekAndPlay timeout — force-releasing seeking guard');
        releaseSeekingGuard();
        if (audioRef.current && !isDraggingRef.current) {
          setCurrentTime(audioRef.current.currentTime);
        }
      }
    }, 800);
  }, [isPlaying, safePlay, releaseSeekingGuard]);

  // Notify context that a drag operation started/ended (called from ProgressBar)
  const startDragging = useCallback(() => {
    isDraggingRef.current = true;
    isSeekingRef.current = true;
  }, []);

  const stopDragging = useCallback(() => {
    isDraggingRef.current = false;
    // Small delay before releasing seeking guard so the final seek value sticks
    setTimeout(() => {
      if (!isDraggingRef.current) {
        releaseSeekingGuard();
      }
    }, 100);
  }, [releaseSeekingGuard]);

  const setRate = useCallback((rate) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, []);

  const closeGlobalPlayer = useCallback(() => {
    setIsGlobalPlayerVisible(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    setCurrentEpisode(null);
  }, []);

  // ─── Audio event handlers ───

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    // During seeking or dragging, don't let timeupdate overwrite the target position
    if (isSeekingRef.current || isDraggingRef.current) return;
    
    const time = audioRef.current.currentTime;
    // Validate time value
    if (isNaN(time) || time < 0) return;
    
    setCurrentTime(time);
    // Update health monitor reference
    lastHealthTimeRef.current = time;
    stallCountRef.current = 0;
  };

  const handleSeeking = () => {
    // Browser started seeking — keep guard active
    isSeekingRef.current = true;
  };

  const handleSeeked = () => {
    // Browser finished seeking — release guard (unless user is still dragging)
    if (seekTimeoutRef.current) {
      clearTimeout(seekTimeoutRef.current);
      seekTimeoutRef.current = null;
    }
    if (!isDraggingRef.current) {
      // Small delay to let the final timeupdate after seeked pass
      setTimeout(() => {
        if (!isDraggingRef.current) {
          releaseSeekingGuard();
          // Sync to the actual position after seek completes
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }
      }, 50);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const d = audioRef.current.duration;
      if (Number.isFinite(d) && d > 0) {
        setDuration(d);
      }
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setIsLoading(false);
    releaseSeekingGuard();
  };

  const handlePlay = () => {
    setIsPlaying(true);
    setIsLoading(false);
    retryCountRef.current = 0; // Reset retry counter on successful play
  };

  const handlePause = () => {
    setIsPlaying(false);
    setIsLoading(false);
  };

  const handleWaiting = () => {
    setIsLoading(true);
  };

  const handleCanPlay = () => {
    setIsLoading(false);
    // If seeking guard is stuck and we can play now, release it
    if (isSeekingRef.current && !isDraggingRef.current) {
      releaseSeekingGuard();
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
    }
  };
  
  const handleCanPlayThrough = () => {
    setIsLoading(false);
    // Ensure seeking guard is released when enough data is buffered
    if (isSeekingRef.current && !isDraggingRef.current) {
      releaseSeekingGuard();
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
    }
  };

  const handleLoadStart = () => {
    setIsLoading(true);
  };
  
  // Stalled: browser is trying to fetch but data isn't arriving
  // Use a debounced approach to avoid loading flicker
  const handleStalled = () => {
    if (stalledTimerRef.current) clearTimeout(stalledTimerRef.current);
    // Only show loading if stall persists for 1.5 seconds
    stalledTimerRef.current = setTimeout(() => {
      if (audioRef.current && !audioRef.current.paused && audioRef.current.readyState < 3) {
        setIsLoading(true);
      }
    }, 1500);
  };
  
  // Progress: update buffered percentage
  const handleProgress = () => {
    if (!audioRef.current || !audioRef.current.duration) return;
    const buf = audioRef.current.buffered;
    if (buf.length > 0) {
      const bufferedEnd = buf.end(buf.length - 1);
      setBuffered((bufferedEnd / audioRef.current.duration) * 100);
    }
  };

  const handleError = (e) => {
    const error = e.target.error;
    console.error('[PlayerContext] Audio error:', error);
    console.error('Audio error code:', error?.code, 'message:', error?.message);
    console.error('Audio source:', e.target.src);
    
    // Stop playback on error
    setIsPlaying(false);
    setIsLoading(false);
    releaseSeekingGuard();
    
    // Attempt to recover from network/decode errors (with retry limit)
    const isRecoverable = error?.code === MediaError.MEDIA_ERR_NETWORK || 
                          error?.code === MediaError.MEDIA_ERR_DECODE;
    
    if (isRecoverable && retryCountRef.current < MAX_RETRIES) {
      retryCountRef.current++;
      const delay = Math.min(1000 * Math.pow(2, retryCountRef.current - 1), 8000); // Exponential backoff: 1s, 2s, 4s
      console.log(`[PlayerContext] Recovery attempt ${retryCountRef.current}/${MAX_RETRIES} in ${delay}ms...`);
      
      // Try to refresh cache if SW is active
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'REFRESH_AUDIO_CACHE',
          url: e.target.src
        });
      }

      const savedTime = audioRef.current?.currentTime || currentTime;
      const savedSrc = audioRef.current?.src;

      setTimeout(() => {
        if (!audioRef.current || !savedSrc) return;
        console.log(`[PlayerContext] Reloading audio source (attempt ${retryCountRef.current})...`);
        
        audioRef.current.src = savedSrc;
        audioRef.current.load();
        
        // Restore position and play after metadata loads
        const onReady = () => {
          audioRef.current?.removeEventListener('loadedmetadata', onReady);
          if (!audioRef.current) return;
          try {
            audioRef.current.currentTime = savedTime;
            audioRef.current.play().catch(err => {
              console.error('[PlayerContext] Retry play failed:', err);
              setIsPlaying(false);
            });
          } catch (err) {
            console.error('[PlayerContext] Retry restore failed:', err);
          }
        };
        audioRef.current.addEventListener('loadedmetadata', onReady, { once: true });
        
        // Fallback if metadata never loads
        setTimeout(() => {
          audioRef.current?.removeEventListener('loadedmetadata', onReady);
        }, 5000);
      }, delay);
    } else if (retryCountRef.current >= MAX_RETRIES) {
      console.error('[PlayerContext] Max retries reached, giving up recovery');
    }
  };

  // ─── Playback health monitor ───
  // Detects when audio is supposed to be playing but currentTime isn't advancing
  useEffect(() => {
    if (!isPlaying) {
      // Clear health check when not playing
      if (healthCheckRef.current) {
        clearInterval(healthCheckRef.current);
        healthCheckRef.current = null;
      }
      stallCountRef.current = 0;
      return;
    }
    
    lastHealthTimeRef.current = audioRef.current?.currentTime || 0;
    
    healthCheckRef.current = setInterval(() => {
      if (!audioRef.current || !isPlaying || isSeekingRef.current || isDraggingRef.current) return;
      
      const currentAudioTime = audioRef.current.currentTime;
      const timeDelta = Math.abs(currentAudioTime - lastHealthTimeRef.current);
      
      // If time hasn't advanced in ~2 seconds and we're supposed to be playing
      if (timeDelta < 0.1 && !audioRef.current.paused && !audioRef.current.ended) {
        stallCountRef.current++;
        console.warn(`[PlayerContext] Stall detected (count: ${stallCountRef.current}), time stuck at ${currentAudioTime.toFixed(2)}s`);
        
        if (stallCountRef.current >= 2) {
          // Audio is stuck — attempt recovery
          console.warn('[PlayerContext] Audio stuck, attempting recovery...');
          stallCountRef.current = 0;
          
          // Force release any stuck seeking guards
          releaseSeekingGuard();
          
          // Strategy: nudge the currentTime slightly
          try {
            const nudgeTime = currentAudioTime + 0.1;
            audioRef.current.currentTime = nudgeTime;
          } catch (err) {
            console.error('[PlayerContext] Nudge failed:', err);
          }
          
          // If still paused after nudge, try to play
          if (audioRef.current.paused) {
            safePlay();
          }
        }
      } else {
        stallCountRef.current = 0;
        lastHealthTimeRef.current = currentAudioTime;
      }
    }, 2000);
    
    return () => {
      if (healthCheckRef.current) {
        clearInterval(healthCheckRef.current);
        healthCheckRef.current = null;
      }
    };
  }, [isPlaying, releaseSeekingGuard, safePlay]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
      if (healthCheckRef.current) clearInterval(healthCheckRef.current);
      if (stalledTimerRef.current) clearTimeout(stalledTimerRef.current);
    };
  }, []);

  return (
    <PlayerContext.Provider value={{
      currentEpisode,
      isPlaying,
      setIsPlaying,
      currentTime,
      setCurrentTime,
      duration,
      setDuration,
      audioRef,
      playEpisode,
      togglePlay,
      seek,
      seekAndPlay,
      startDragging,
      stopDragging,
      playbackRate,
      setPlaybackRate: setRate,
      isGlobalPlayerVisible,
      setIsGlobalPlayerVisible,
      closeGlobalPlayer,
      autoplayBlocked,
      setAutoplayBlocked,
      isLoading,
      buffered,
      releaseSeekingGuard
    }}>
      {children}
      <audio
        ref={audioRef}
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onSeeking={handleSeeking}
        onSeeked={handleSeeked}
        onEnded={handleEnded}
        onPlay={handlePlay}
        onPause={handlePause}
        onError={handleError}
        onWaiting={handleWaiting}
        onStalled={handleStalled}
        onCanPlay={handleCanPlay}
        onCanPlayThrough={handleCanPlayThrough}
        onLoadStart={handleLoadStart}
        onProgress={handleProgress}
        style={{ display: 'none' }}
      />
    </PlayerContext.Provider>
  );
};
