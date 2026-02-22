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
  
  // ─── Seeking guard: prevents timeupdate from overwriting seek target ───
  const isSeekingRef = useRef(false);
  const seekTargetRef = useRef(null);
  const seekTimeoutRef = useRef(null);
  // Track whether user is dragging the progress bar
  const isDraggingRef = useRef(false);

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
      isSeekingRef.current = false;
      seekTargetRef.current = null;
    }
    
    // Safety: release seeking guard after timeout in case 'seeked' event doesn't fire
    seekTimeoutRef.current = setTimeout(() => {
      isSeekingRef.current = false;
      seekTargetRef.current = null;
    }, 2000);
  }, []);

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
      isSeekingRef.current = false;
      seekTargetRef.current = null;
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
    
    seekTimeoutRef.current = setTimeout(() => {
      isSeekingRef.current = false;
      seekTargetRef.current = null;
    }, 2000);
  }, [isPlaying, safePlay]);

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
        isSeekingRef.current = false;
        seekTargetRef.current = null;
      }
    }, 100);
  }, []);

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
    setCurrentTime(audioRef.current.currentTime);
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
          isSeekingRef.current = false;
          seekTargetRef.current = null;
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
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setIsLoading(false);
  };

  const handlePlay = () => {
    setIsPlaying(true);
    setIsLoading(false);
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
  };

  const handleLoadStart = () => {
    setIsLoading(true);
  };

  const handleError = (e) => {
    console.error('[PlayerContext] Audio error:', e.target.error);
    console.error('Audio error code:', e.target.error?.code);
    console.error('Audio error message:', e.target.error?.message);
    console.error('Audio source:', e.target.src);
    
    // Stop playback on error
    setIsPlaying(false);
    setIsLoading(false);
    isSeekingRef.current = false;
    
    // Attempt to recover from network/decode errors
    if (e.target.error?.code === e.target.error?.MEDIA_ERR_NETWORK || 
        e.target.error?.code === e.target.error?.MEDIA_ERR_DECODE ||
        e.target.error?.code === e.target.error?.MEDIA_ERR_SRC_NOT_SUPPORTED) {
      
      console.log('[PlayerContext] Attempting to recover from audio error...');
      
      // 1. Try to refresh cache if SW is active
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'REFRESH_AUDIO_CACHE',
          url: e.target.src
        });
      }

      // 2. Save current time to restore after reload
      const savedTime = currentTime;
      const savedSrc = audioRef.current?.src;
      const wasPlaying = isPlaying;

      // 3. Retry loading after a short delay
      setTimeout(() => {
        if (audioRef.current && savedSrc) {
          console.log('[PlayerContext] Reloading audio source...');
          
          // Clear and reload
          audioRef.current.src = '';
          audioRef.current.load();
          
          // Set source again after a brief pause
          setTimeout(() => {
            if (audioRef.current) {
              audioRef.current.src = savedSrc;
              audioRef.current.load();
              audioRef.current.currentTime = savedTime;
              
              if (wasPlaying) {
                audioRef.current.play().catch(err => {
                  console.error('[PlayerContext] Retry play failed:', err);
                  setIsPlaying(false);
                });
              }
            }
          }, 100);
        }
      }, 1000);
    }
  };

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
      isLoading
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
        onStalled={handleWaiting}
        onCanPlay={handleCanPlay}
        onLoadStart={handleLoadStart}
        style={{ display: 'none' }}
      />
    </PlayerContext.Provider>
  );
};
