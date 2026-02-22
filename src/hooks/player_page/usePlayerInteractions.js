import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePlayer } from '@/contexts/PlayerContext';
import logger from '@/lib/logger';

const usePlayerInteractions = (audioRef, playerControlsContainerRef, episodeSlug, questions, initialShowTranscript = false) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { seek, seekAndPlay, togglePlay, isPlaying, currentTime, duration } = usePlayer();
  
  const [jumpDetails, setJumpDetails] = useState({ time: null, id: null, questionId: null, playAfterJump: false, segmentToHighlight: null });
  const [showFloatingControls, setShowFloatingControls] = useState(false);
  const [playerState, setPlayerState] = useState({ isPlaying: false, currentTime: 0, duration: 0, activeQuestionTitle: '' });
  const [showTranscriptUI, setShowTranscriptUI] = useState(() => {
    const saved = localStorage.getItem('showTranscriptUI');
    return saved !== null ? saved === 'true' : initialShowTranscript;
  });

  const didDefaultAutoplayRef = useRef(false);
  // Track last hash we set ourselves to avoid re-processing our own navigation
  // Initialized to null so it doesn't match empty hash on first render
  const lastSetHashRef = useRef(null);
  // Debounce timer for hash changes
  const hashDebounceRef = useRef(null);

  // Sync playerState with PlayerContext
  useEffect(() => {
    setPlayerState(prev => ({ ...prev, isPlaying, currentTime, duration }));
  }, [isPlaying, currentTime, duration]);

  // Process URL hash for initial load and external hash changes only
  useEffect(() => {
    const hash = location.hash;
    logger.debug('usePlayerInteractions: Processing hash', hash);
    
    // Skip processing if this is a hash we set ourselves
    if (hash === lastSetHashRef.current) {
      return;
    }
    
    if (hash) {
      const segmentMatch = hash.match(/^#segment-(\d+(?:\.\d+)?)(?:&play=true)?$/);
      const questionMatch = hash.match(/^#question-([^&]+)(?:&play=true)?$/);
      const secondsMatch = hash.match(/^#(\d+(?:\.\d+)?)$/);
      const timeMatch = hash.match(/^#(\d+):(\d+)$/);

      logger.debug('usePlayerInteractions: matches', { segmentMatch, questionMatch, secondsMatch, timeMatch });

      if (segmentMatch) {
        const time = parseFloat(segmentMatch[1]) / 1000; 
        const play = hash.includes('&play=true');
        setJumpDetails({ time, id: `segment-${segmentMatch[1]}`, questionId: null, playAfterJump: play, segmentToHighlight: parseFloat(segmentMatch[1]) });
      } else if (questionMatch) {
        const questionId = questionMatch[1];
        const play = hash.includes('&play=true');
        let question = questions.find(q => String(q.id) === questionId || q.slug === questionId);
        if (question) {
          setJumpDetails({ time: question.time, id: `question-${questionId}`, questionId, playAfterJump: play, segmentToHighlight: null });
        } else {
          const retry = setTimeout(() => {
            const q2 = questions.find(q => String(q.id) === questionId || q.slug === questionId);
            if (q2) {
              setJumpDetails({ time: q2.time, id: `question-${questionId}`, questionId, playAfterJump: play, segmentToHighlight: null });
            }
          }, 600);
          return () => clearTimeout(retry);
        }
      } else if (secondsMatch) {
        const time = parseFloat(secondsMatch[1]);
        setJumpDetails({ time, id: `time-${time}`, questionId: null, playAfterJump: true, segmentToHighlight: time * 1000 });
      } else if (timeMatch) {
        const minutes = parseInt(timeMatch[1], 10);
        const seconds = parseInt(timeMatch[2], 10);
        const totalSeconds = minutes * 60 + seconds;
        setJumpDetails({ time: totalSeconds, id: `time-${totalSeconds}`, questionId: null, playAfterJump: true, segmentToHighlight: totalSeconds * 1000 });
      }
    } else {
      // No hash — trigger autoplay from start once
      if (!didDefaultAutoplayRef.current) {
        didDefaultAutoplayRef.current = true;
        const newHash = '#0';
        lastSetHashRef.current = newHash;
        if (location.hash !== newHash) {
          navigate(`${location.pathname}${newHash}`, { replace: true, state: location.state });
        }
        setJumpDetails({ time: 0, id: 'time-0', questionId: null, playAfterJump: true, segmentToHighlight: 0 });
      }
    }
  }, [location.hash, questions, episodeSlug]);

  // handleSeekToTime: The single entry point for all seek operations.
  // Sets jumpDetails for PodcastPlayer AND performs seek directly via PlayerContext.
  // Does NOT trigger URL hash change that would re-process in the hash effect.
  const handleSeekToTime = useCallback((time, id = null, playAfterJump = false, questionId = null) => {
    logger.debug('usePlayerInteractions: handleSeekToTime called', { time, id, playAfterJump, questionId });
    
    const segmentStartTimeMs = Math.round(time * 1000);
    const jumpId = id || `seek-${Date.now()}`;
    
    // Update jump details for highlighting and question tracking
    setJumpDetails({ time, id: jumpId, questionId, playAfterJump, segmentToHighlight: segmentStartTimeMs });
    
    // Perform the seek directly via PlayerContext — this is the authoritative path
    if (playAfterJump) {
      seekAndPlay(time, true);
    } else {
      seek(time);
    }
    
    // Update URL hash without re-triggering the hash effect
    const newHash = `#${Math.floor(time)}`;
    lastSetHashRef.current = newHash;
    
    if (location.hash !== newHash) {
      // Debounce hash updates during rapid seeks (e.g., skip button spam)
      if (hashDebounceRef.current) {
        clearTimeout(hashDebounceRef.current);
      }
      hashDebounceRef.current = setTimeout(() => {
        if (newHash) {
          navigate(`${location.pathname}${newHash}`, { replace: true, state: location.state });
        } else {
          navigate(location.pathname, { replace: true, state: location.state });
        }
      }, 150);
    }
  }, [navigate, location.pathname, location.hash, location.state, seek, seekAndPlay]);

  const handlePlayerStateChange = useCallback((newState) => {
    setPlayerState(prevState => ({ ...prevState, ...newState }));
  }, []);

  const handleToggleShowTranscript = useCallback(() => {
    setShowTranscriptUI(prev => {
      const newValue = !prev;
      localStorage.setItem('showTranscriptUI', String(newValue));
      return newValue;
    });
  }, []);

  // Floating player skip — uses PlayerContext directly for low-latency skip
  const handleFloatingPlayerSkip = useCallback((seconds) => {
    if (audioRef.current) {
      const newTime = Math.max(0, audioRef.current.currentTime + seconds);
      seek(newTime);
    }
  }, [audioRef, seek]);

  // Floating play/pause — uses PlayerContext for state consistency
  const handleFloatingPlayPause = useCallback(() => {
    togglePlay();
  }, [togglePlay]);

  return {
    jumpDetails,
    showFloatingControls,
    playerState,
    showTranscriptUI,
    handleSeekToTime,
    handlePlayerStateChange,
    handleToggleShowTranscript,
    handleFloatingPlayerSkip,
    handleFloatingPlayPause,
    setShowFloatingControls
  };
};

export default usePlayerInteractions;