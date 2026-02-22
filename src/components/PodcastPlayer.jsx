import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';
import PlayerHeader from '@/components/player/player_parts/PlayerHeader';
import PlayerUIControls from '@/components/player/player_parts/PlayerUIControls';
import SpeakerAssignmentDialog from '@/components/transcript/SpeakerAssignmentDialog';
import AddQuestionDialog from '@/components/transcript/AddQuestionDialog.jsx';
import DownloadTextDialog from '@/components/player/player_parts/DownloadTextDialog';
import usePlayerState from '@/hooks/player/usePlayerState.js';
import usePlayerInitialization from '@/hooks/player/usePlayerInitialization';
import usePlayerPlayback from '@/hooks/player/usePlayerPlayback';
import usePlayerNavigation from '@/hooks/player/usePlayerNavigation';
import usePlayerTimeUpdates from '@/hooks/player/usePlayerTimeUpdates';
import useSpeakerAssignment from '@/hooks/player/useSpeakerAssignment';
import { getLocaleString } from '@/lib/locales';
import textExportService from '@/lib/textExportService';
import { useEditorAuth } from '@/contexts/EditorAuthContext';
import { getAudioUrl, getAvailableAudioVariants, getCurrentAudioLang } from '@/lib/audioUrl';
import { usePlayer } from '@/contexts/PlayerContext';

const DEFAULT_PLAYBACK_RATE_OPTIONS = [
  { label: "1x", value: 1},
  { label: "1.5x", value: 1.5},
  { label: "2x", value: 2},
];

const PodcastPlayer = ({ 
  episodeData, 
  onQuestionUpdate, 
  currentLanguage, 
  onQuestionSelectJump, 
  audioRef, 
  episodeSlug, 
  episodeAudioUrl, 
  episodeLang, 
  episodeDate, 
  navigateBack, 
  navigateHistory,
  onPlayerStateChange, 
  playerControlsContainerRef, 
  showTranscript, 
  onToggleShowTranscript, 
  skipEmptySegments, 
  onToggleSkipEmptySegments, 
  onDownloadAudio, 
  onDownloadText, 
  playbackRateOptions = DEFAULT_PLAYBACK_RATE_OPTIONS, 
  currentPlaybackRateValue, 
  onSetPlaybackRate, 
  onOpenAddQuestionDialog, 
  transcriptUtterances,
  transcriptId,
  transcriptWords,
  segmentToHighlight,
  user,
  isOfflineMode,
  onTranscriptUpdate,
  fetchTranscriptForEpisode,
  onRecognizeText,
  onRecognizeQuestions,
  onSmartSegmentation,
  isRecognizingText,
  isRecognizingQuestions,
  isSmartSegmenting,
  shouldPreserveState = false,
  isEditMode,
  setIsEditMode,
  availableAudioVariants = []
}) => {
  
  const { toast } = useToast();
  const { isAuthenticated, openAuthModal } = useEditorAuth();
  const internalQuestions = episodeData?.questions || [];
  const internalTranscriptUtterances = episodeData?.transcript?.utterances || [];
  
  // Use PlayerContext instead of local state for better synchronization
  const { 
    currentTime, 
    setCurrentTime,
    duration, 
    setDuration,
    isPlaying, 
    setIsPlaying,
    togglePlay, 
    seek,
    seekAndPlay,
    playbackRate, 
    setPlaybackRate,
    currentEpisode: contextEpisode,
    audioRef: contextAudioRef,
    playEpisode,
    autoplayBlocked,
    setAutoplayBlocked,
    isLoading
  } = usePlayer();

  // Sync autoplay blocked state
  useEffect(() => {
    if (autoplayBlocked) {
      setShowAutoplayOverlay(true);
    }
  }, [autoplayBlocked]);

  // Use context audio ref as the primary source
  const primaryAudioRef = contextAudioRef || audioRef;

  // Audio Track State
  const [selectedAudioLang, setSelectedAudioLang] = useState(() => {
    // Initialize with episode lang or default based on requirements
    const initialLang = episodeLang || 'mixed';
    return String(initialLang).toLowerCase();
  });
  
  // Keep selected audio selection in sync with incoming episode data
  useEffect(() => {
    if (episodeData?.lang) {
      setSelectedAudioLang(String(episodeData.lang).toLowerCase());
    }
    
    // Debug: Log available audio variants
    if (episodeData) {
      console.log('🎵 [PodcastPlayer] Available audio variants:', getAvailableAudioVariants(episodeData));
    }
  }, [episodeData?.lang, episodeData?.slug]);

  const handleAudioTrackChange = useCallback((inputLang) => {
    const lang = String(inputLang || '').toLowerCase();
    console.log('🎵 [PodcastPlayer] Audio track changed to:', lang);
    setSelectedAudioLang(lang);

    // Get all available audio variants using utility function
    const variants = getAvailableAudioVariants(episodeData);
    const selectedVariant = variants.find(v => v.lang === lang);

    const selectedUrl = selectedVariant?.audio_url || null;
    if (!selectedUrl) {
      console.warn('🎵 [PodcastPlayer] Selected variant missing audio_url, cannot switch', { lang, variants });
      return;
    }

    console.log('🎵 [PodcastPlayer] Switching audio source to:', selectedUrl);

    // Get localized track name for notification
    let trackName;
    if (lang === 'ru') {
      trackName = getLocaleString('audioTrackRussian', currentLanguage) || 'Мария';
    } else if (lang === 'es') {
      trackName = getLocaleString('audioTrackSpanish', currentLanguage) || 'Пепе';
    } else if (lang === 'mixed') {
      trackName = getLocaleString('audioTrackMixed', currentLanguage) || 'Вместе';
    } else {
      trackName = lang.toUpperCase();
    }

    // Get current playback state - use PlayerContext directly
    const wasPlaying = isPlaying;
    const currentPlaybackTime = currentTime;

    // Stop current playback
    if (primaryAudioRef.current) {
      primaryAudioRef.current.pause();
    }

    // Update PlayerContext with new episode data
    if (episodeData) {
      const updatedEpisodeData = {
        ...episodeData,
        lang,
        audio_url: selectedUrl,
        audioUrl: selectedUrl
      };

      playEpisode(updatedEpisodeData, currentPlaybackTime);

      // Show notification
      toast({
        title: getLocaleString('audioTrackSwitched', currentLanguage) || 'Audio track switched',
        description: getLocaleString('audioTrackSwitchedDesc', currentLanguage, { track: trackName }) || `Audio track changed to ${trackName}`,
      });

    }
  }, [episodeData, isPlaying, currentTime, primaryAudioRef, playEpisode, togglePlay, currentLanguage, toast]);
  
  const lastJumpIdRef = useRef(null);

  // Sync episode with PlayerContext — only handles loading a NEW episode.
  // Same-episode seeks are handled directly by handleSeekToTime in usePlayerInteractions
  // which calls seek()/seekAndPlay() on PlayerContext immediately.
  useEffect(() => {
    if (episodeData && episodeData.slug !== contextEpisode?.slug) {
      const audioUrl = episodeAudioUrl || getAudioUrl(episodeData);
      console.log('🎵 [PodcastPlayer] Playing new episode:', {
        slug: episodeData.slug,
        audioUrl,
        jumpToTime: episodeData?.jumpToTime
      });
      
      if (audioUrl) {
        playEpisode({
          ...episodeData,
          audioUrl
        }, episodeData.jumpToTime || 0);
        lastJumpIdRef.current = episodeData.jumpId;
      } else {
        console.error('🎵 [PodcastPlayer] No audio URL available for episode:', episodeData.slug);
      }
    }
  }, [episodeData?.slug, episodeAudioUrl, contextEpisode?.slug, playEpisode]);

  // Состояние для диалога скачивания текста
  const [isDownloadTextDialogOpen, setIsDownloadTextDialogOpen] = useState(false);

  const {
    currentPlaybackRateIndex, setCurrentPlaybackRateIndex,
    activeQuestionTitleState, setActiveQuestionTitleState,
    isAddQuestionPlayerDialogOpen, setIsAddQuestionPlayerDialogOpen,
    addQuestionDialogInitialTime, setAddQuestionDialogInitialTime
  } = usePlayerState(episodeData?.duration);

  // Use global state as the source of truth
  const isPlayingState = isPlaying;
  const setIsPlayingState = setIsPlaying;
  const currentTimeState = currentTime;
  const setCurrentTimeState = setCurrentTime;
  const durationState = duration;
  const setDurationState = setDuration;

  // Sync context to local state - REMOVED as we use global state directly
  /*
  useEffect(() => {
    if (contextEpisode?.slug === episodeData?.slug) {
      setCurrentTimeState(currentTime);
      setDurationState(duration);
      setIsPlayingState(isPlaying);
    }
  }, [currentTime, duration, isPlaying, contextEpisode, episodeData, setCurrentTimeState, setDurationState, setIsPlayingState]);
  */

  const playPromiseRef = useRef(null);
  const isSeekingRef = useRef(false);
  const lastJumpIdProcessedRef = useRef(null);
  const [showAutoplayOverlay, setShowAutoplayOverlay] = useState(false);

  const langForContent = episodeData?.lang === 'all' ? currentLanguage : episodeData?.lang;

  const {
    isSpeakerAssignmentDialogOpen,
    segmentForSpeakerAssignment,
    handleSaveSpeakerAssignment,
    handleCloseSpeakerAssignmentDialog
  } = useSpeakerAssignment(episodeData, onTranscriptUpdate, toast, currentLanguage, fetchTranscriptForEpisode, episodeSlug, langForContent);

  // Skip usePlayerInitialization - PlayerContext handles initialization
  // usePlayerInitialization({
  //   episodeData, audioRef: primaryAudioRef, setIsPlayingState, setCurrentTimeState,
  //   setActiveQuestionTitleState, setDurationState, setCurrentPlaybackRateIndex,
  //   playbackRateOptions, onPlayerStateChange, lastJumpIdProcessedRef,
  //   jumpToTime: episodeData?.jumpToTime,
  // });

  // Only use usePlayerPlayback if we are the active episode
  const isCurrentEpisode = contextEpisode?.slug === episodeData?.slug;

  // Skip usePlayerPlayback - PlayerContext handles playback
  // usePlayerPlayback({
  //   episodeData, audioRef: primaryAudioRef, isPlayingState, setIsPlayingState,
  //   playPromiseRef, isSeekingRef, toast, currentLanguage,
  //   onPlayerStateChange, lastJumpIdProcessedRef, 
  //   jumpToTime: episodeData?.jumpToTime, jumpId: episodeData?.jumpId,
  //   playAfterJump: episodeData?.playAfterJump, setCurrentTimeState,
  //   setShowPlayOverlay: setShowAutoplayOverlay,
  // });

  // Skip usePlayerTimeUpdates - PlayerContext handles time updates
  // const { handleTimeUpdate, handleLoadedMetadata } = usePlayerTimeUpdates({
  //   audioRef: primaryAudioRef, isSeekingRef, internalQuestions, currentLanguage,
  //   setCurrentTimeState, setActiveQuestionTitleState, setDurationState,
  //   onPlayerStateChange, skipEmptySegments, transcript: episodeData?.transcript, 
  // });
  
  const handleTimeUpdate = () => {};
  const handleLoadedMetadata = () => {};

  // Skip usePlayerNavigation - PlayerContext handles navigation
  // const { 
  //   handleProgressChange, handleSkip, navigateQuestion,
  //   seekAudio, togglePlayPause
  // } = usePlayerNavigation({
  //   audioRef: primaryAudioRef, durationState, isPlayingState, setIsPlayingState,
  //   onQuestionSelectJump, internalQuestions, currentTimeState,
  //   toast, currentLanguage, currentPlaybackRateIndex,
  //   setCurrentPlaybackRateIndex, playbackRateOptions, episodeData, onPlayerStateChange,
  // });
  
  // Use PlayerContext methods instead
  const handleProgressChange = (time) => {
    seek(time);
  };
  
  const handleSkip = (seconds) => {
    const newTime = Math.max(0, currentTime + seconds);
    seek(newTime);
  };
  
  const navigateQuestion = (direction) => {
    // Simple question navigation logic
    if (!internalQuestions || internalQuestions.length === 0) return;
    
    // Ensure questions are sorted by time
    const sortedQuestions = [...internalQuestions].sort((a, b) => a.time - b.time);
    
    // Find the current active question index
    let currentIndex = -1;
    for (let i = 0; i < sortedQuestions.length; i++) {
      if (sortedQuestions[i].time <= currentTime + 0.5) {
        currentIndex = i;
      } else {
        break;
      }
    }
    
    let newIndex;
    if (direction === 1) {
        // Next question
        if (currentIndex >= sortedQuestions.length - 1) return;
        newIndex = currentIndex + 1;
    } else {
        // Previous question
        if (currentIndex <= 0) {
            newIndex = 0;
        } else {
            // If we are more than 3 seconds into the current question, restart it
            // Otherwise go to previous
            const currentQuestionTime = sortedQuestions[currentIndex].time;
            if (currentTime - currentQuestionTime > 3) {
                newIndex = currentIndex;
            } else {
                newIndex = currentIndex - 1;
            }
        }
    }
    
    if (newIndex >= 0 && newIndex < sortedQuestions.length) {
      // Use seekAndPlay so navigation always continues playback
      seekAndPlay(sortedQuestions[newIndex].time, isPlaying);
    }
  };
  
  const seekAudio = (time, playAfter = false) => {
    if (playAfter) {
      seekAndPlay(time, true);
    } else {
      seek(time);
    }
  };
  
  const togglePlayPause = () => {
    togglePlay();
  };
  
  const handleQuestionsChange = useCallback((action, questionDataOrArray) => {
    // Check authentication for add, update, and delete operations
    if ((action === 'add' || action === 'update' || action === 'delete') && !isAuthenticated) {
      openAuthModal();
      return;
    }
    
    onQuestionUpdate(action, questionDataOrArray);
  }, [onQuestionUpdate, isAuthenticated, openAuthModal]);

  const handleSetPlaybackRate = useCallback((rateValue) => {
    const index = playbackRateOptions.findIndex(opt => opt.value === rateValue);
    if (index !== -1) {
      setCurrentPlaybackRateIndex(index);
      if (primaryAudioRef.current) {
        primaryAudioRef.current.playbackRate = rateValue;
      }
      // Use PlayerContext setPlaybackRate
      setPlaybackRate(rateValue);
      onPlayerStateChange?.({ playbackRate: rateValue });
    }
  }, [setCurrentPlaybackRateIndex, primaryAudioRef, setPlaybackRate, onPlayerStateChange]);

  useEffect(() => {
    if(typeof window !== 'undefined'){
      window.__navigateQuestion = navigateQuestion;
      window.__skipPlayerTime = handleSkip;
      window.__togglePlayPause = togglePlayPause;
      window.__seekAudio = seekAudio;
    }
    return () => {
      if(typeof window !== 'undefined'){
        delete window.__navigateQuestion;
        delete window.__skipPlayerTime;
        delete window.__togglePlayPause;
        delete window.__seekAudio;
      }
    }
  }, [navigateQuestion, handleSkip, togglePlayPause, seekAudio]);

  const handleDownloadAudio = () => {
    // Используем episodeAudioUrl который уже передан в плеер (уже обработанный getAudioUrl)
    // Но если это локальный URL, то получаем оригинальный из episodeData
    
    let downloadUrl = episodeAudioUrl;
    
    // Если URL локальный (localhost), получаем оригинальный из episodeData
    if (episodeAudioUrl && episodeAudioUrl.includes('localhost')) {
      downloadUrl = getAudioUrl(episodeData);
    }
    
    if (downloadUrl) {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${episodeSlug || 'podcast_episode'}.mp3`; 
      link.setAttribute('target', '_blank'); // Открываем в новой вкладке для кросс-доменных ссылок
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: getLocaleString('downloadStartedTitle', currentLanguage), description: getLocaleString('downloadStartedDesc', currentLanguage) });
    } else {
      toast({ title: getLocaleString('errorGeneric', currentLanguage), description: getLocaleString('audioNotAvailableForDownload', currentLanguage), variant: 'destructive' });
    }
  };

  const handleDownloadText = useCallback(() => {
    setIsDownloadTextDialogOpen(true);
  }, []);

  const handleDownloadTextConfirm = useCallback((options) => {
    try {
      const episodeTitle = episodeData?.title || `Эпизод ${episodeSlug}`;
      textExportService.exportText(
        episodeData?.transcript,
        internalQuestions,
        options,
        episodeTitle
      );
      
      toast({
        title: getLocaleString('success', currentLanguage),
        description: getLocaleString('textDownloadStarted', currentLanguage),
      });
    } catch (error) {
      console.error('Error downloading text:', error);
      toast({
        title: getLocaleString('error', currentLanguage),
        description: getLocaleString('downloadError', currentLanguage),
        variant: "destructive",
      });
    }
  }, [episodeData, episodeSlug, internalTranscriptUtterances, internalQuestions, currentLanguage, toast]);

  const handleSaveNewQuestionFromPlayer = useCallback((title, time, isFullTranscript = false, isIntro = false) => {
    handleQuestionsChange('add', { title, time, lang: langForContent, isFullTranscript, isIntro });
    setIsAddQuestionPlayerDialogOpen(false);
  }, [handleQuestionsChange, langForContent, setIsAddQuestionPlayerDialogOpen]);

  const handleOpenAddQuestionDialogFromPlayer = useCallback(() => {
    // Check authentication before opening add question dialog
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }

    setAddQuestionDialogInitialTime(currentTimeState);
    setIsAddQuestionPlayerDialogOpen(true);
  }, [currentTimeState, setAddQuestionDialogInitialTime, setIsAddQuestionPlayerDialogOpen, isAuthenticated, openAuthModal]);

  // Determine if transcript and questions exist
  const hasTranscript = episodeData?.transcript?.status === 'completed' && episodeData?.transcript?.utterances?.length > 0;
  const hasQuestions = internalQuestions.length > 0;

  if (!episodeData) return <div className="p-4 text-center">{getLocaleString('selectAnEpisode', currentLanguage)}</div>;

  return (
    <>
    <div className="relative podcast-player bg-slate-800/50 p-2 sm:p-3 md:p-4 rounded-xl shadow-2xl border border-slate-700/40">
      <PlayerHeader 
        episodeTitle={episodeData.displayTitle}
        episodeDate={episodeData.date} 
        onNavigateBack={navigateBack} 
        onNavigateHistory={navigateHistory}
        currentLanguage={currentLanguage} 
      />
      <div>
        {/* AudioElement is managed by PlayerContext globally */}
        
        {showAutoplayOverlay && (
          <div
            className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-slate-900/70 backdrop-blur-sm cursor-pointer"
            onClick={() => {
              try {
                if (primaryAudioRef.current) {
                  primaryAudioRef.current.muted = false;
                  primaryAudioRef.current.play()?.then(() => {
                    setIsPlayingState(true);
                    onPlayerStateChange?.({ isPlaying: true });
                    setShowAutoplayOverlay(false);
                    if (setAutoplayBlocked) setAutoplayBlocked(false);
                  }).catch(() => {});
                }
              } catch {}
            }}
          >
            <div className="px-4 py-2 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-100 text-sm">
              {getLocaleString('tapToUnmuteAndPlay', currentLanguage) || 'Нажмите, чтобы включить звук и начать воспроизведение'}
            </div>
          </div>
        )}
        
        <PlayerUIControls
          activeQuestionTitle={activeQuestionTitleState}
          isPlaying={isPlayingState}
          isLoading={isLoading}
          currentLanguage={currentLanguage}
          currentTime={currentTimeState}
          duration={durationState}
          onProgressChange={handleProgressChange}
          questions={internalQuestions}
          onQuestionSelectJump={onQuestionSelectJump}
          onNavigateQuestion={navigateQuestion}
          onTogglePlayPause={togglePlayPause}
          onSkip={handleSkip}
          playerControlsContainerRef={playerControlsContainerRef}
          showTranscript={showTranscript}
          onToggleShowTranscript={onToggleShowTranscript}
          skipEmptySegments={skipEmptySegments}
          onToggleSkipEmptySegments={onToggleSkipEmptySegments}
          onDownloadAudio={handleDownloadAudio}
          onDownloadText={handleDownloadText}
          playbackRateOptions={playbackRateOptions}
          currentPlaybackRateValue={playbackRate}
          onSetPlaybackRate={handleSetPlaybackRate}
          onOpenAddQuestionDialog={handleOpenAddQuestionDialogFromPlayer}
          episodeDate={episodeDate}
          isOfflineMode={isOfflineMode}
          isEditMode={isEditMode}
          setIsEditMode={setIsEditMode}
          isAuthenticated={isAuthenticated}
          openAuthModal={openAuthModal}
          // Audio Track Props
          availableAudioVariants={episodeData?.available_variants || []}
          selectedAudioLang={selectedAudioLang}
          onAudioTrackChange={handleAudioTrackChange}
          // Recognition Props
          hasTranscript={hasTranscript}
          hasQuestions={hasQuestions}
          onRecognizeText={onRecognizeText}
          onRecognizeQuestions={onRecognizeQuestions}
          onSmartSegmentation={onSmartSegmentation}
          isRecognizingText={isRecognizingText}
          isRecognizingQuestions={isRecognizingQuestions}
          isSmartSegmenting={isSmartSegmenting}
        />
      </div>
    </div>
     {segmentForSpeakerAssignment && (
        <SpeakerAssignmentDialog
          isOpen={isSpeakerAssignmentDialogOpen}
          onClose={handleCloseSpeakerAssignmentDialog}
          segment={segmentForSpeakerAssignment}
          allUtterances={internalTranscriptUtterances}
          onSave={handleSaveSpeakerAssignment}
          currentLanguage={currentLanguage}
        />
      )}
      {isAddQuestionPlayerDialogOpen && (
        <AddQuestionDialog
          isOpen={isAddQuestionPlayerDialogOpen}
          onClose={() => setIsAddQuestionPlayerDialogOpen(false)}
          onSave={handleSaveNewQuestionFromPlayer}
          maxDuration={durationState}
          currentLanguage={currentLanguage}
          initialTime={addQuestionDialogInitialTime}
          episodeDate={episodeDate}
          segment={null}
          audioRef={primaryAudioRef}
          mainPlayerIsPlaying={isPlayingState}
          mainPlayerTogglePlayPause={togglePlayPause}
          mainPlayerSeekAudio={seekAudio}
        />
      )}
      
      <DownloadTextDialog
        isOpen={isDownloadTextDialogOpen}
        onClose={() => setIsDownloadTextDialogOpen(false)}
        currentLanguage={currentLanguage}
        questions={internalQuestions}
        transcript={internalTranscriptUtterances}
        episodeTitle={episodeData?.title}
        onDownload={handleDownloadTextConfirm}
      />
    </>
  );
};

export default React.memo(PodcastPlayer);
