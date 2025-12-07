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
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  // Play a specific episode
  const playEpisode = useCallback((episode, startTime = 0) => {
    console.log('🎵 [PlayerContext] playEpisode called:', {
      episodeSlug: episode.slug,
      startTime,
      audioUrl: episode.audioUrl || episode.audio_url
    });
    
    const isSameEpisode = currentEpisode?.slug === episode.slug;
    const audioUrl = episode.audioUrl || episode.audio_url;
    
    if (!audioUrl) {
      console.error('[PlayerContext] No audio URL available for episode:', episode.slug);
      return;
    }
    
    if (!isSameEpisode) {
      console.log('🎵 [PlayerContext] Loading new episode:', episode.slug);
      setCurrentEpisode(episode);
      setCurrentTime(startTime);
      setIsPlaying(true);
      setIsGlobalPlayerVisible(true);
      setAutoplayBlocked(false); // Reset blocked state on new episode
      
      if (audioRef.current) {
        console.log('🎵 [PlayerContext] Setting audio src:', audioUrl);
        // Force reload for new episode
        audioRef.current.src = audioUrl;
        audioRef.current.currentTime = startTime;
        audioRef.current.playbackRate = playbackRate;
        audioRef.current.load(); // Ensure proper loading
        
        // Attempt play after load
        const attemptPlay = () => {
          console.log('🎵 [PlayerContext] Attempting to play, readyState:', audioRef.current.readyState);
          if (audioRef.current && audioRef.current.readyState >= audioRef.current.HAVE_CURRENT_DATA) {
            audioRef.current.play().then(() => {
              console.log('🎵 [PlayerContext] Play successful');
              setAutoplayBlocked(false);
            }).catch(e => {
              console.error("[PlayerContext] Play error:", e);
              setIsPlaying(false);
              if (e.name === 'NotAllowedError') {
                console.log('🎵 [PlayerContext] Autoplay blocked by browser policy, waiting for user interaction');
                setAutoplayBlocked(true);
                // Don't retry autoplay if blocked by browser policy
                return;
              }
              // Only retry for other types of errors
              console.log('🎵 [PlayerContext] Retrying play after error');
              setTimeout(attemptPlay, 100);
            });
          } else {
            // Retry after a short delay
            console.log('🎵 [PlayerContext] Audio not ready, retrying in 100ms');
            setTimeout(attemptPlay, 100);
          }
        };
        
        // Start attempting to play
        setTimeout(attemptPlay, 50);
      } else {
        console.error('🎵 [PlayerContext] No audioRef.current available');
      }
    } else {
      // Same episode slug - but audio track may have changed
      const newAudioUrl = episode.audioUrl || episode.audio_url;
      const currentAudioUrl = currentEpisode?.audioUrl || currentEpisode?.audio_url;

      if (newAudioUrl && newAudioUrl !== currentAudioUrl) {
        console.log('🎵 [PlayerContext] Same episode, switching audio track');
        // Update current episode object to reflect new audio URL/lang
        setCurrentEpisode(prev => ({ ...prev, ...episode }));
        setCurrentTime(startTime);
        setIsPlaying(true);
        setIsGlobalPlayerVisible(true);
        setAutoplayBlocked(false);

        if (audioRef.current) {
          audioRef.current.src = newAudioUrl;
          audioRef.current.playbackRate = playbackRate;
          audioRef.current.load();

          const handleTrackSwitch = () => {
            if (audioRef.current) {
              audioRef.current.currentTime = startTime;
              audioRef.current.play().then(() => {
                console.log('🎵 [PlayerContext] Track switch play successful');
                setAutoplayBlocked(false);
              }).catch(e => {
                console.error('[PlayerContext] Play error after track switch:', e);
                setIsPlaying(false);
                if (e.name === 'NotAllowedError') {
                  setAutoplayBlocked(true);
                }
              });
            }
          };

          // Use one-time event listener to ensure currentTime is set after metadata loads
          audioRef.current.addEventListener('loadedmetadata', handleTrackSwitch, { once: true });
        }
      } else {
        console.log('🎵 [PlayerContext] Same episode, ensuring playback');
        // If same episode, just ensure it's playing
        if (!isPlaying) {
          togglePlay();
        } else {
          // If playing and seeking to different time
          if (Math.abs(audioRef.current.currentTime - startTime) > 0.5) {
            audioRef.current.currentTime = startTime;
            setCurrentTime(startTime);
          }
        }
      }
    }
  }, [currentEpisode, isPlaying, playbackRate]);

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
      // Ensure audio is ready before playing
      if (audioRef.current.readyState >= audioRef.current.HAVE_CURRENT_DATA) {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
          setAutoplayBlocked(false);
        }).catch(e => {
          console.error('[PlayerContext] Play error:', e);
          setIsPlaying(false);
          if (e.name === 'NotAllowedError') {
            setAutoplayBlocked(true);
          }
        });
      } else {
        // Wait for audio to be ready, then play
        const onCanPlay = () => {
          audioRef.current?.play().then(() => {
            setIsPlaying(true);
            setAutoplayBlocked(false);
          }).catch(e => {
            console.error('[PlayerContext] Play error after canplay:', e);
            setIsPlaying(false);
            if (e.name === 'NotAllowedError') {
              setAutoplayBlocked(true);
            }
          });
          audioRef.current?.removeEventListener('canplay', onCanPlay);
        };
        
        audioRef.current.addEventListener('canplay', onCanPlay, { once: true });
        
        // Fallback timeout
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.removeEventListener('canplay', onCanPlay);
          }
        }, 2000);
      }
    }
  }, [isPlaying]);

  const seek = useCallback((time) => {
    if (!audioRef.current) return;
    
    const clampedTime = Math.max(0, Math.min(time, duration || audioRef.current.duration || 0));
    
    try {
      audioRef.current.currentTime = clampedTime;
      setCurrentTime(clampedTime);
      
      // If seeking while playing, ensure playback continues
      if (isPlaying && audioRef.current.paused) {
        audioRef.current.play().catch(e => {
          console.error('[PlayerContext] Play error after seek:', e);
          setIsPlaying(false);
        });
      }
    } catch (error) {
      console.error('[PlayerContext] Seek error:', error);
    }
  }, [duration, isPlaying]);

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
    
    // Stop playback on error
    setIsPlaying(false);
    
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
      setAutoplayBlocked
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
