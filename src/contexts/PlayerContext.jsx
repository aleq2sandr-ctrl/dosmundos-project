import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';

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

  // Play a specific episode
  const playEpisode = useCallback((episode, startTime = 0) => {
    const isSameEpisode = currentEpisode?.slug === episode.slug;
    
    if (!isSameEpisode) {
      setCurrentEpisode(episode);
      setCurrentTime(startTime);
      setIsPlaying(true);
      setIsGlobalPlayerVisible(true);
      
      if (audioRef.current) {
        audioRef.current.src = episode.audioUrl || episode.audio_url;
        audioRef.current.currentTime = startTime;
        audioRef.current.playbackRate = playbackRate;
        audioRef.current.play().catch(e => console.error("Play error:", e));
      }
    } else {
      // If same episode, just ensure it's playing
      if (!isPlaying) {
        togglePlay();
      }
    }
  }, [currentEpisode, isPlaying]);

  const togglePlay = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(e => console.error("Play error:", e));
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const seek = useCallback((time) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
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
  };

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);

  const handleError = (e) => {
    console.error('[PlayerContext] Audio error:', e.target.error);
    console.error('Audio error code:', e.target.error?.code);
    console.error('Audio error message:', e.target.error?.message);
    
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
      const wasPlaying = isPlaying;

      // 3. Retry loading after a short delay
      setTimeout(() => {
        if (audioRef.current) {
          console.log('[PlayerContext] Reloading audio source...');
          audioRef.current.load();
          audioRef.current.currentTime = savedTime;
          if (wasPlaying) {
            audioRef.current.play().catch(err => console.error("Retry play failed:", err));
          }
        }
      }, 1000);
    }
    
    setIsPlaying(false);
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
      closeGlobalPlayer
    }}>
      {children}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onPlay={handlePlay}
        onPause={handlePause}
        onError={handleError}
        style={{ display: 'none' }}
      />
    </PlayerContext.Provider>
  );
};
