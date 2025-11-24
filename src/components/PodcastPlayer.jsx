
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';
import AudioElement from '@/components/player/player_parts/AudioElement';
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
import { getAudioUrl } from '@/lib/audioUrl';

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
  fetchTranscriptForEpisode 
}) => {
  
  console.log('🔧 [PodcastPlayer] Props received:', {
    episodeSlug,
    episodeAudioUrl,
    episodeData: {
      slug: episodeData?.slug,
      r2_object_key: episodeData?.r2_object_key,
      audio_url: episodeData?.audio_url
    }
  });
  
  const { toast } = useToast();
  const { isAuthenticated, openAuthModal } = useEditorAuth();
  const internalQuestions = episodeData?.questions || [];
  const internalTranscriptUtterances = episodeData?.transcript?.utterances || [];
  
  // Состояние для диалога скачивания текста
  const [isDownloadTextDialogOpen, setIsDownloadTextDialogOpen] = useState(false);

  const {
    isPlayingState, setIsPlayingState,
    currentTimeState, setCurrentTimeState,
    durationState, setDurationState,
    currentPlaybackRateIndex, setCurrentPlaybackRateIndex,
    activeQuestionTitleState, setActiveQuestionTitleState,
    isAddQuestionPlayerDialogOpen, setIsAddQuestionPlayerDialogOpen,
    addQuestionDialogInitialTime, setAddQuestionDialogInitialTime
  } = usePlayerState(episodeData?.duration);

  const playbackRate = 1; // Временно упрощаем для отладки

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

  usePlayerInitialization({
    episodeData, audioRef, setIsPlayingState, setCurrentTimeState,
    setActiveQuestionTitleState, setDurationState, setCurrentPlaybackRateIndex,
    playbackRateOptions, onPlayerStateChange, lastJumpIdProcessedRef,
    jumpToTime: episodeData?.jumpToTime,
  });

  usePlayerPlayback({
    episodeData, audioRef, isPlayingState, setIsPlayingState,
    playPromiseRef, isSeekingRef, toast, currentLanguage,
    onPlayerStateChange, lastJumpIdProcessedRef, 
    jumpToTime: episodeData?.jumpToTime, jumpId: episodeData?.jumpId,
    playAfterJump: episodeData?.playAfterJump, setCurrentTimeState,
    setShowPlayOverlay: setShowAutoplayOverlay,
  });

  const { handleTimeUpdate, handleLoadedMetadata } = usePlayerTimeUpdates({
    audioRef, isSeekingRef, internalQuestions, currentLanguage,
    setCurrentTimeState, setActiveQuestionTitleState, setDurationState,
    onPlayerStateChange, skipEmptySegments, transcript: episodeData?.transcript, 
  });

  const { 
    handleProgressChange, handleSkip, navigateQuestion,
    seekAudio, togglePlayPause
  } = usePlayerNavigation({
    audioRef, durationState, isPlayingState, setIsPlayingState,
    onQuestionSelectJump, internalQuestions, currentTimeState,
    toast, currentLanguage, currentPlaybackRateIndex,
    setCurrentPlaybackRateIndex, playbackRateOptions, episodeData, onPlayerStateChange,
  });
  
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
      if (audioRef.current) {
        audioRef.current.playbackRate = rateValue;
      }
      onPlayerStateChange?.({ playbackRate: rateValue });
    }
  }, [setCurrentPlaybackRateIndex, audioRef, onPlayerStateChange]);

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
      console.log('🔧 [Download] Local URL detected, getting original from episodeData');
      downloadUrl = getAudioUrl(episodeData);
    }
    
    if (downloadUrl) {
      console.log('🔧 [Download] Using URL:', downloadUrl);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${episodeSlug || 'podcast_episode'}.mp3`; 
      link.setAttribute('target', '_blank'); // Открываем в новой вкладке для кросс-доменных ссылок
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: getLocaleString('downloadStartedTitle', currentLanguage), description: getLocaleString('downloadStartedDesc', currentLanguage) });
    } else {
      console.error('🔧 [Download] No valid audio URL found');
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

  if (!episodeData) return <div className="p-4 text-center">{getLocaleString('selectAnEpisode', currentLanguage)}</div>;

  return (
    <>
    <div className="relative podcast-player bg-slate-800/50 p-2 sm:p-3 md:p-4 rounded-xl shadow-2xl border border-slate-700/40">
      <PlayerHeader 
        episodeTitle={episodeData.displayTitle}
        episodeDate={episodeData.date} 
        onNavigateBack={navigateBack} 
        currentLanguage={currentLanguage} 
      />
      <div>
        <AudioElement 
          audioRef={audioRef}
          episodeAudioUrl={episodeAudioUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => { setIsPlayingState(false); onPlayerStateChange?.({isPlaying: false});}}
          onDurationChange={handleLoadedMetadata} 
          playbackRate={playbackRate}
          onError={(e) => {
             if (e.target.error && e.target.error.code !== e.target.error.MEDIA_ERR_ABORTED) {
                console.error('PodcastPlayer: Audio error occurred', e.target.error);
                toast({
                title: getLocaleString('audioErrorTitle', currentLanguage),
                description: getLocaleString('audioErrorDescriptionPlayer', currentLanguage, {episodeTitle: episodeData.title}),
                variant: "destructive",
                });
            }
          }}
        />

        {showAutoplayOverlay && (
          <div
            className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-slate-900/70 backdrop-blur-sm cursor-pointer"
            onClick={() => {
              try {
                if (audioRef.current) {
                  audioRef.current.muted = false;
                  audioRef.current.play()?.then(() => {
                    setIsPlayingState(true);
                    onPlayerStateChange?.({ isPlaying: true });
                    setShowAutoplayOverlay(false);
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
          audioRef={audioRef}
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
