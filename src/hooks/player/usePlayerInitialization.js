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
}) => {
  useEffect(() => {
    // Инициализация выполняется только при смене эпизода
    console.log('usePlayerInitialization: Initializing episode', episodeData?.slug);
    
    // Проверяем, есть ли активный переход к определенной временной метке
    const hasActiveJump = jumpToTime !== null && jumpToTime !== undefined;
    
    // Сбрасываем состояния UI (не влияет на аудио напрямую)
    setActiveQuestionTitleState('');
    setDurationState(episodeData?.duration || 0);
    setCurrentPlaybackRateIndex(0);
    
    // Сбрасываем время только если нет активного перехода
    if (!hasActiveJump) {
      setCurrentTimeState(0);
    }
    
    // НЕ трогаем isPlayingState - пусть usePlayerPlayback управляет автозапуском
    // НЕ устанавливаем src - это делает usePlayerPlayback для избежания конфликтов
    
    if (audioRef.current) {
      // Сбрасываем скорость воспроизведения
      audioRef.current.playbackRate = playbackRateOptions[0].value;
      
      // Сбрасываем время только если нет активного перехода
      if (!hasActiveJump) {
        audioRef.current.currentTime = 0;
      }
    }
    
    // Сбрасываем lastJumpIdProcessedRef для новых переходов
    if (lastJumpIdProcessedRef && !hasActiveJump) {
      lastJumpIdProcessedRef.current = null;
    }
    
    // Уведомляем родительский компонент об изменениях
    const currentTime = hasActiveJump ? jumpToTime : 0;
    onPlayerStateChange?.({
      currentTime, 
      duration: episodeData?.duration || 0, 
      activeQuestionTitle: '',
      playbackRate: playbackRateOptions[0].value
    });
  }, [
    episodeData?.slug,
    episodeData?.duration,
    jumpToTime
  ]);
};

export default usePlayerInitialization;