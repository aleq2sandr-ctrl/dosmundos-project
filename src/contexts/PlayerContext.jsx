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

  // Helper for safe playback
  const safePlay = useCallback(async () => {
    if (!audioRef.current) return;
    try {
      await audioRef.current.play();
      setIsPlaying(true);
      setAutoplayBlocked(false);
    } catch (error) {
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
        console.error('[PlayerContext] Error loading/playing:', e);
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
    
    const duration = audioRef.current.duration;
    // If duration is not available yet, we can still try to set currentTime if we know it's valid
    // or just clamp to 0 if completely unknown. But usually metadata is loaded.
    const maxTime = Number.isFinite(duration) ? duration : time; 
    const clampedTime = Math.max(0, Math.min(time, maxTime));
    
    try {
      audioRef.current.currentTime = clampedTime;
      setCurrentTime(clampedTime);
    } catch (error) {
      console.error('[PlayerContext] Seek error:', error);
    }
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

  // Audio event handlers
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
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
    console.log('🎵 [PlayerContext] Audio waiting/buffering...');
    setIsLoading(true);
  };

  const handleCanPlay = () => {
    console.log('🎵 [PlayerContext] Audio can play');
    setIsLoading(false);
  };

  const handleLoadStart = () => {
    console.log('🎵 [PlayerContext] Audio load start');
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
