import { useEffect } from 'react';

const usePlayerInitialization = ({
  episodeData,
  audioRef,
  setIsPlayingState,
  setCurrentTimeState,
  setActiveQuestionTitleState,
  setDurationState,
  setCurrentPlaybackRateIndex,
  playbackRateOptions,
  onPlayerStateChange,
  lastJumpIdProcessedRef,
  jumpToTime,
  shouldPreserveState = false,
}) => {
  useEffect(() => {
    // Инициализация выполняется только при смене эпизода
    console.log('usePlayerInitialization: Initializing episode', episodeData?.slug, 'preserveState:', shouldPreserveState);
    
    // Проверяем, есть ли активный переход к определенной временной метке
    const hasActiveJump = jumpToTime !== null && jumpToTime !== undefined;
    
    // Сбрасываем состояния UI (не влияет на аудио напрямую)
    setActiveQuestionTitleState('');
    setDurationState(episodeData?.duration || 0);
    
    if (!shouldPreserveState) {
      setCurrentPlaybackRateIndex(0);
    }
    
    // Сбрасываем время только если нет активного перехода и не нужно сохранять состояние
    if (!hasActiveJump && !shouldPreserveState) {
      setCurrentTimeState(0);
    }
    
    // НЕ трогаем isPlayingState - пусть usePlayerPlayback управляет автозапуском
    // НЕ устанавливаем src - это делает usePlayerPlayback для избежания конфликтов
    
    if (audioRef.current) {
      // Сбрасываем скорость воспроизведения
      if (!shouldPreserveState) {
        audioRef.current.playbackRate = playbackRateOptions[0].value;
      }
      
      // Сбрасываем время только если нет активного перехода и не нужно сохранять состояние
      if (!hasActiveJump && !shouldPreserveState) {
        audioRef.current.currentTime = 0;
      }
    }
    
    // Сбрасываем lastJumpIdProcessedRef для новых переходов
    if (lastJumpIdProcessedRef && !hasActiveJump && !shouldPreserveState) {
      lastJumpIdProcessedRef.current = null;
    }
    
    // Уведомляем родительский компонент об изменениях
    const currentTime = hasActiveJump ? jumpToTime : (shouldPreserveState && audioRef.current ? audioRef.current.currentTime : 0);
    onPlayerStateChange?.({
      currentTime, 
      duration: episodeData?.duration || 0, 
      activeQuestionTitle: '',
      playbackRate: shouldPreserveState && audioRef.current ? audioRef.current.playbackRate : playbackRateOptions[0].value
    });
  }, [
    episodeData?.slug,
    episodeData?.duration,
    jumpToTime,
    // shouldPreserveState intentionally omitted to avoid re-running if it changes dynamically (it should be stable for a mount)
  ]);
};

export default usePlayerInitialization;