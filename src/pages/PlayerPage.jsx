import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import PodcastPlayer from '@/components/PodcastPlayer'; 
import QuestionsManager from '@/components/player/QuestionsManager';
import FloatingPlayerControls from '@/components/player/FloatingPlayerControls';
import { getLocaleString, getPluralizedLocaleString } from '@/lib/locales';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { formatShortDate } from '@/lib/utils';
import useOfflineEpisodeData from '@/hooks/useOfflineEpisodeData';
import usePlayerInteractions from '@/hooks/player_page/usePlayerInteractions';
import useSupabaseSubscriptions from '@/hooks/player_page/useSupabaseSubscriptions';
import useSpeakerAssignment from '@/hooks/player/useSpeakerAssignment'; 
import SpeakerAssignmentDialog from '@/components/transcript/SpeakerAssignmentDialog';
import useQuestionManagement from '@/hooks/useQuestionManagement';
import AddQuestionFromSegmentDialog from '@/components/player/questions_manager_parts/AddQuestionFromSegmentDialog';
import AddQuestionDialog from '@/components/transcript/AddQuestionDialog';
import { useEditorAuth } from '@/contexts/EditorAuthContext';
import { saveEditToHistory } from '@/services/editHistoryService';
import useAudioPrefetch from '@/hooks/player/useAudioPrefetch';
import { getAudioUrl, getAvailableAudioVariants, getCurrentAudioLang } from '@/lib/audioUrl';
import { usePlayer } from '@/contexts/PlayerContext';
import deepgramService from '@/lib/deepgramService';
import smartSegmentationService from '@/lib/smartSegmentationService';
import { generateQuestionsOpenAI } from '@/lib/openAIService';
import { updateEpisodeMetaTags, resetMetaTags } from '@/lib/updateMetaTags';


const PlayerPage = ({ currentLanguage: appCurrentLanguage, user }) => {
  const { episodeSlug, lang } = useParams(); 
  const navigate = useNavigate();
  const { toast } = useToast();
  const location = useLocation();
  const langPrefix = lang || appCurrentLanguage || 'ru';
  const { editor, isAuthenticated, openAuthModal } = useEditorAuth();
  
  // Read language from URL parameter, fallback to app language
  const urlParams = new URLSearchParams(location.search);
  const urlLanguage = urlParams.get('lang');
  const currentLanguage = urlLanguage || appCurrentLanguage;

  // Update global app language if URL parameter is present and different
  useEffect(() => {
    if (urlLanguage && urlLanguage !== appCurrentLanguage) {
      // Update localStorage to persist the language change
      localStorage.setItem('podcastLang', urlLanguage);

      const pathMatch = location.pathname.match(/^\/(ru|es|en|de|fr|pl)(.*)$/);
      const pathSuffix = pathMatch ? pathMatch[2] : location.pathname;
      const targetPath = `/${urlLanguage}${pathSuffix || ''}`;

      const nextSearch = new URLSearchParams(location.search);
      nextSearch.delete('lang');
      const searchString = nextSearch.toString();
      const nextUrl = `${targetPath}${searchString ? `?${searchString}` : ''}${location.hash || ''}`;

      if (`${location.pathname}${location.search}${location.hash || ''}` !== nextUrl) {
        navigate(nextUrl, { replace: true });
      }
    }
  }, [urlLanguage, appCurrentLanguage, location.pathname, location.search, location.hash, navigate]);

  const [isRecognizingText, setIsRecognizingText] = useState(false);
  const [isRecognizingQuestions, setIsRecognizingQuestions] = useState(false);
  const [isSmartSegmenting, setIsSmartSegmenting] = useState(false);
  const { playEpisode, audioRef, currentEpisode, currentTime, duration, isPlaying } = usePlayer();
  const playerControlsContainerRef = useRef(null);
  const [allEpisodesForPrefetch, setAllEpisodesForPrefetch] = useState([]);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Reset edit mode when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      setIsEditMode(false);
    }
  }, [isAuthenticated]);
  
  // Removed automatic recognition flags — recognition must now be triggered manually

  // Загрузка списка эпизодов для prefetch
  useEffect(() => {
    const fetchEpisodesForPrefetch = async () => {
      try {
        const { data, error } = await supabase
          .from('episodes')
          .select(`
            slug,
            date,
            episode_audios (
              audio_url,
              lang
            )
          `)
          .order('date', { ascending: false })
          .limit(50); // Ограничиваем для производительности
        
        if (!error && data) {
          // Transform V2 data to flat structure for compatibility
          const flattenedData = data.map(ep => {
             // Try to find audio for current language, fallback to first available
             const audio = ep.episode_audios?.find(a => a.lang === appCurrentLanguage) || ep.episode_audios?.[0];
             return {
               slug: ep.slug,
               date: ep.date,
               audio_url: audio?.audio_url,
               lang: audio?.lang || 'mixed'
             };
          });
          setAllEpisodesForPrefetch(flattenedData);
        }
      } catch (error) {
        console.debug('Failed to fetch episodes for prefetch:', error);
      }
    };
    
    fetchEpisodesForPrefetch();
  }, []); // Загружаем один раз при монтировании

  const {
    episodeData,
    questions,
    transcript,
    loading,
    questionsLoading,
    transcriptLoading,
    error,
    questionsUpdatedId,
    isOfflineMode,
    saveEditedTranscript,
    saveQuestions,
    refreshAllData,
    preloadAudio,
    fetchTranscriptForEpisode,
    fetchQuestionsForEpisode,
    setTranscript,
  } = useOfflineEpisodeData(episodeSlug, langPrefix, toast);

  // SEO: Update meta tags when episode data or questions change
  useEffect(() => {
    if (episodeData && episodeData.slug) {
      updateEpisodeMetaTags(episodeData, questions, langPrefix);
    }
    return () => resetMetaTags();
  }, [episodeData?.slug, episodeData?.title, questions?.length, langPrefix]);

  // Sync with Global Player Context
  useEffect(() => {
    if (episodeData && episodeData.slug) {
      const currentAudioUrl = currentEpisode?.audioUrl || currentEpisode?.audio_url;
      const newAudioUrl = episodeData.audioUrl || episodeData.audio_url;
      
      // Play if:
      // 1. It's a different episode slug
      // 2. OR it's the same slug but different audio URL (language switch)
      if (currentEpisode?.slug !== episodeData.slug || (newAudioUrl && newAudioUrl !== currentAudioUrl)) {
         
         // Extra check: if the audio element is already playing this URL, don't restart
         if (audioRef.current && audioRef.current.src === newAudioUrl) {
            console.log(`🎵 [PlayerPage] Audio already playing correct URL: ${newAudioUrl}. Skipping playEpisode.`);
            return;
         }

         // If switching language for same episode, try to preserve current time
         // Use audioRef.current.currentTime for more precision if available and valid (duration > 0 means metadata loaded)
         const isAudioValid = audioRef && audioRef.current && audioRef.current.duration > 0 && !audioRef.current.ended;
         const preciseTime = isAudioValid ? audioRef.current.currentTime : currentTime;
         const startTime = (currentEpisode?.slug === episodeData.slug) ? preciseTime : 0;
         
         console.log(`🎵 [PlayerPage] Switching audio source. Slug: ${episodeData.slug}. Preserving time: ${startTime}s (Source: ${isAudioValid ? 'AudioElement' : 'State'})`);
         playEpisode(episodeData, startTime);
      }
    }
  }, [episodeData, playEpisode, currentEpisode, currentTime]);

  const {
    jumpDetails,
    showFloatingControls: playerShowFloatingControls,
    playerState,
    showTranscriptUI,
    handleSeekToTime,
    handlePlayerStateChange,
    handleToggleShowTranscript,
    handleFloatingPlayerSkip,
    handleFloatingPlayPause,
    setShowFloatingControls: setPlayerShowFloatingControls
  } = usePlayerInteractions(audioRef, playerControlsContainerRef, episodeSlug, questions, true); 

  // Отключаем Supabase subscriptions в офлайн режиме
  useSupabaseSubscriptions(
    episodeSlug,
    episodeData,
    currentLanguage,
    fetchQuestionsForEpisode,
    fetchTranscriptForEpisode,
    isOfflineMode // Передаем офлайн статус
  );

  const {
    isAddQuestionFromSegmentDialogOpen,
    segmentForQuestion,
    openAddQuestionFromSegmentDialog,
    closeAddQuestionFromSegmentDialog
  } = useQuestionManagement(
    playerState.currentTime,
    currentLanguage,
    audioRef,
    handleSeekToTime,
    playerState.duration,
    episodeData?.slug,
    episodeData?.date,
    episodeData?.lang
  );
  
  // Prefetch следующего эпизода для быстрого переключения
  useAudioPrefetch({
    currentEpisodeSlug: episodeData?.slug,
    allEpisodes: allEpisodesForPrefetch,
    currentLanguage,
    isOfflineMode
  });
  
  useEffect(() => {
    const handleScroll = () => {
      const ref = playerControlsContainerRef.current;
      if (ref) {
        const rect = ref.getBoundingClientRect();
        if (rect.bottom < 0) {
          setPlayerShowFloatingControls(true);
        } else {
          setPlayerShowFloatingControls(false);
        }
      } else {
        setPlayerShowFloatingControls(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleQuestionUpdate = useCallback(async (action, questionData) => {
    if (!episodeData || !episodeData.slug) return;
    
    // Special handling for virtual blocks
    if (questionData.id === 'intro-virtual') {
      // Create or update a real intro question (time locked to 0)
      const langForQuestions = (episodeData.lang === 'all' || episodeData.lang === 'mixed') ? currentLanguage : episodeData.lang;
      const { data: existingIntro, error: fetchErr } = await supabase
        .from('timecodes')
        .select('*')
        .eq('episode_slug', episodeData.slug)
        .eq('lang', langForQuestions)
        .eq('is_intro', true)
        .eq('time', 0)
        .maybeSingle();

      if (fetchErr && fetchErr.code !== 'PGRST116') {
        toast({ title: getLocaleString('errorGeneric', currentLanguage), description: fetchErr.message, variant: 'destructive' });
        return;
      }

      const payload = {
        episode_slug: episodeData.slug,
        time: 0,
        title: questionData.title,
        lang: langForQuestions,
        is_intro: true,
        is_full_transcript: false
      };

      let dbError;
      if (existingIntro && existingIntro.id) {
        const { error } = await supabase.from('timecodes').update({ title: payload.title }).eq('id', existingIntro.id);
        dbError = error;
      } else {
        const { error } = await supabase.from('timecodes').insert(payload).select().single();
        dbError = error;
      }

      if (dbError) {
        toast({ title: getLocaleString('errorGeneric', currentLanguage), description: dbError.message, variant: 'destructive' });
      } else {
        fetchQuestionsForEpisode(episodeData.slug, langForQuestions);
      }
      return;
    }

    if (questionData.id === 'full-transcript-virtual') {
      console.warn('Attempted to modify virtual question:', questionData.id);
      return;
    }
    
    let dbError;
    const langForQuestions = (episodeData.lang === 'all' || episodeData.lang === 'mixed') ? currentLanguage : episodeData.lang;

    if (action === 'add') {
      const questionPayload = { 
        episode_slug: episodeData.slug, 
        time: Math.round(questionData.time), 
        title: questionData.title, 
        lang: questionData.lang || langForQuestions
        // is_intro and is_full_transcript are not in the DB schema yet
        // is_intro: questionData.isIntro || false,
        // is_full_transcript: questionData.isFullTranscript || false
      };
      const { error } = await supabase.from('timecodes').insert(questionPayload).select().single();
      dbError = error;
    } else if (action === 'update') {
      const questionPayload = { 
        title: questionData.title, 
        time: Math.round(questionData.time), 
        lang: questionData.lang || langForQuestions
        // is_intro and is_full_transcript are not in the DB schema yet
        // is_intro: questionData.isIntro || false,
        // is_full_transcript: questionData.isFullTranscript || false
      };
      const { error } = await supabase.from('timecodes').update(questionPayload).eq('id', questionData.id).select().single();
      dbError = error;
    } else if (action === 'delete') {
      const { error } = await supabase.from('timecodes').delete().eq('id', questionData.id);
      dbError = error;
    }

    if (dbError) {
      toast({ title: getLocaleString('errorGeneric', currentLanguage), description: dbError.message, variant: 'destructive' });
    } else {
      // Save to edit history if authenticated
      if (isAuthenticated && editor) {
        try {
          let contentBefore = '';
          let contentAfter = '';
          let targetId = '';
          
          if (action === 'add') {
            contentBefore = '';
            contentAfter = `Title: ${questionData.title}, Time: ${questionData.time}s`;
            targetId = `${episodeData.slug}_question_new_${Date.now()}`;
          } else if (action === 'update') {
            const originalQuestion = questions.find(q => q.id === questionData.id);
            if (originalQuestion) {
              contentBefore = `Title: ${originalQuestion.title}, Time: ${originalQuestion.time}s`;
              contentAfter = `Title: ${questionData.title}, Time: ${questionData.time}s`;
            }
            targetId = `${episodeData.slug}_question_${questionData.id}`;
          } else if (action === 'delete') {
            const originalQuestion = questions.find(q => q.id === questionData.id);
            if (originalQuestion) {
              contentBefore = `Title: ${originalQuestion.title}, Time: ${originalQuestion.time}s`;
              contentAfter = '';
            }
            targetId = `${episodeData.slug}_question_${questionData.id}`;
          }
          
          await saveEditToHistory({
            editorId: editor.id,
            editorEmail: editor.email,
            editorName: editor.name,
            editType: 'question',
            targetType: 'question',
            targetId: targetId,
            contentBefore: contentBefore,
            contentAfter: contentAfter,
            filePath: null,
            metadata: {
              episodeSlug: episodeData.slug,
              questionId: questionData.id || 'new',
              action: action,
              questionData: questionData,
              timestamp: new Date().toISOString()
            }
          });
          console.log(`[PlayerPage] Question ${action} saved to history`);
        } catch (historyError) {
          console.error('[PlayerPage] Failed to save edit history:', historyError);
          // Don't fail the whole operation if history save fails
        }
      }
      
      fetchQuestionsForEpisode(episodeData.slug, langForQuestions);
    }
  }, [episodeData, currentLanguage, toast, fetchQuestionsForEpisode, isAuthenticated, editor, questions]);

  const handleEditQuestion = useCallback((question) => {
    // Check authentication before opening edit dialog
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }

    if (question.id === 'full-transcript-virtual') {
      console.warn('Attempted to edit virtual question:', question.id);
      return;
    }
    setEditingQuestion(question);
  }, [isAuthenticated, openAuthModal]);

  const handleTranscriptUpdate = useCallback(async (newTranscriptData) => {
    if (!episodeData || !episodeData.slug) return;
    const langForContent = (episodeData.lang === 'all' || episodeData.lang === 'mixed') ? currentLanguage : episodeData.lang;

    console.log('🔊 [Transcript] Updating transcript with', newTranscriptData.utterances?.length || 0, 'utterances');
    
    // Save chunks to transcript_chunks table
    const chunkSize = 50; // utterances per chunk
    const chunks = [];
    
    for (let i = 0; i < newTranscriptData.utterances.length; i += chunkSize) {
      const chunk = newTranscriptData.utterances.slice(i, i + chunkSize);
      chunks.push({
        episode_slug: episodeData.slug,
        lang: langForContent,
        chunk_type: 'edited_transcript',
        chunk_index: Math.floor(i / chunkSize),
        chunk_data: { utterances: chunk }
      });
    }
    
    console.log('🔊 [Transcript] Creating', chunks.length, 'edited chunks of', chunkSize, 'utterances each');
    
    // Update metadata first
    const { error: updateError } = await supabase
      .from('transcripts')
      .update({ 
        edited_transcript_data: { utterance_count: newTranscriptData.utterances.length },
        updated_at: new Date().toISOString()
      })
      .eq('episode_slug', episodeData.slug)
      .eq('lang', langForContent);

    if (updateError) {
      console.error("Error updating transcript metadata:", updateError);
      toast({ title: getLocaleString('errorGeneric', currentLanguage), description: `Failed to update transcript: ${updateError.message}`, variant: "destructive" });
      return;
    }
    
    // Clear existing edited chunks and save new ones
    const { error: deleteError } = await supabase
      .from('transcript_chunks')
      .delete()
      .eq('episode_slug', episodeData.slug)
      .eq('lang', langForContent)
      .eq('chunk_type', 'edited_transcript');
      
    if (deleteError) {
      console.error("Error clearing old edited chunks:", deleteError);
    }
    
    // Save new chunks in batches
    const batchSize = 5; // chunks per batch
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      console.log(`🔊 [Transcript] Saving edited batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(chunks.length/batchSize)}`);
      
      const { error: chunkError } = await supabase
        .from('transcript_chunks')
        .upsert(batch, { onConflict: 'episode_slug,lang,chunk_type,chunk_index' });
        
      if (chunkError) {
        console.error("Error saving edited transcript chunks:", chunkError);
        toast({ title: getLocaleString('errorGeneric', currentLanguage), description: `Failed to save chunks: ${chunkError.message}`, variant: "destructive" });
        return;
      }
    }
    
    console.log('🔊 [Transcript] All edited chunks saved successfully!');
    setTranscript(newTranscriptData); 
    toast({ title: getLocaleString('success', currentLanguage), description: 'Транскрипт обновлен!' });
  }, [episodeData, currentLanguage, toast, setTranscript]);

  const handleSegmentEdit = useCallback(async (newUtterances, actionType, originalSegment, updatedSegment) => {
    if (!episodeData || !episodeData.slug || !transcript) return;
    
    try {
      // Используем оффлайн-совместимый метод сохранения
      await saveEditedTranscript(newUtterances);
    } catch (error) {
      console.error('Error saving segment edit:', error);
      toast({
        title: getLocaleString('saveError', currentLanguage),
        description: error.message,
        variant: "destructive"
      });
    }
  }, [episodeData, transcript, saveEditedTranscript, currentLanguage, toast]);

  const playerEpisodeDataMemo = useMemo(() => {
    if (!episodeData) return null;
    
    const langForDisplay = (episodeData.lang === 'all' || episodeData.lang === 'mixed') ? currentLanguage : episodeData.lang;
    
    // Determine display title
    let displayTitle = null;

    // Try to find translation for current language if available
    if (episodeData.translations && Array.isArray(episodeData.translations)) {
        const translation = episodeData.translations.find(t => t.lang === currentLanguage);
        if (translation && translation.title) {
            displayTitle = translation.title;
        }
    }

    // If no translation found, check if we should use the fallback title from episodeData
    if (!displayTitle && episodeData.title) {
        // Only use fallback if it's NOT a generic title in another language
        // This is a heuristic to avoid showing "Meditación ..." in Russian interface
        // Matches "Meditación DD.MM.YYYY" or "Meditation DD.MM.YYYY"
        const isGeneric = episodeData.title.match(/^(Meditación|Meditation|Медитация)\s+\d{2}\.\d{2}\.\d{4}/i);
        if (!isGeneric) {
            displayTitle = episodeData.title;
        }
    }

    // If no title found, generate one
    if (!displayTitle || displayTitle.trim() === '') {
      // Иначе генерируем название на основе префикса и даты
      const prefix = getLocaleString('meditationTitlePrefix', langForDisplay);
      let datePart = '';

      if (episodeData.date) {
          datePart = formatShortDate(episodeData.date, langForDisplay);
      } else if (episodeData.created_at) {
          datePart = formatShortDate(episodeData.created_at, langForDisplay);
      }
      displayTitle = datePart ? `${prefix} ${datePart}` : prefix;
    }

    const playerData = {
      ...episodeData,
      displayTitle: displayTitle,
      questions: questions,
      transcript: transcript,
      jumpToTime: jumpDetails.time,
      jumpId: jumpDetails.id,
      jumpToQuestionId: jumpDetails.questionId,
      playAfterJump: jumpDetails.playAfterJump,
      segmentToHighlight: jumpDetails.segmentToHighlight,
      questionsUpdatedId: questionsUpdatedId,
      lang: langForDisplay,
      onTranscriptUpdate: handleTranscriptUpdate 
    };



    return playerData;
  }, [episodeData, questions, transcript, jumpDetails, questionsUpdatedId, currentLanguage, handleTranscriptUpdate]);

  const activeQuestionTitle = useMemo(() => {
    if (!playerEpisodeDataMemo?.questions) return '';
    const sorted = [...playerEpisodeDataMemo.questions].sort((a, b) => a.time - b.time);
    let active = null;
    for (const q of sorted) {
      if (q.time <= currentTime) {
        active = q;
      } else {
        break;
      }
    }
    return active ? active.title : '';
  }, [playerEpisodeDataMemo, currentTime]);
  
  const {
    isSpeakerAssignmentDialogOpen,
    segmentForSpeakerAssignment,
    handleOpenSpeakerAssignmentDialog,
    handleSaveSpeakerAssignment,
    handleCloseSpeakerAssignmentDialog,
  } = useSpeakerAssignment(
    playerEpisodeDataMemo, 
    handleTranscriptUpdate, 
    toast, 
    currentLanguage, 
    fetchTranscriptForEpisode, 
    playerEpisodeDataMemo?.slug, 
    playerEpisodeDataMemo?.lang
  );

  // Recognition handlers
  const handleRecognizeText = useCallback(async () => {
    if (!episodeData?.slug) return;

    // Check if we have audio URL
    const audioUrl = getAudioUrl(episodeData);
    if (!audioUrl) {
      toast({
        title: getLocaleString('errorGeneric', currentLanguage),
        description: getLocaleString('audioFileNotAvailable', currentLanguage) || 'Аудио файл недоступен',
        variant: 'destructive',
      });
      return;
    }

    const langForTranscription = (episodeData.lang === 'all' || episodeData.lang === 'mixed') ? currentLanguage : episodeData.lang;

    // Helper to process and save transcript result
    const processAndSaveTranscript = async (result, transcriptDbId) => {
      // 1. Save RAW to VPS
      let storageUrl = null;
      
      try {
        const vpsResponse = await fetch('/api/save-transcript', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            episodeSlug: episodeData.slug,
            lang: langForTranscription,
            transcriptData: result, // RAW data
            provider: 'deepgram'
          })
        });
        
        if (vpsResponse.ok) {
          const vpsResult = await vpsResponse.json();
          if (vpsResult.success) {
             storageUrl = vpsResult.url;
             console.log('[PlayerPage] VPS save successful:', storageUrl);
          } else {
             console.error('[PlayerPage] VPS save returned error:', vpsResult.error);
             // Don't block flow, but log error
          }
        } else {
          console.warn('[PlayerPage] VPS API failed:', vpsResponse.status);
        }
      } catch (e) {
        console.error('[PlayerPage] VPS save failed:', e);
      }

      // 2. Process data
      const { processTranscriptData, buildEditedTranscriptData } = await import('@/hooks/transcript/transcriptProcessingUtils');
      const processed = processTranscriptData(result);
      const editedData = buildEditedTranscriptData(processed);

      // 3. Update DB
      const updatePayload = {
        status: 'completed',
        provider: 'deepgram',
        provider_id: result.id,
        edited_transcript_data: editedData,
        updated_at: new Date().toISOString()
      };
      if (storageUrl) {
        updatePayload.storage_url = storageUrl;
      }

      const { error } = await supabase
        .from('transcripts')
        .update(updatePayload)
        .eq('id', transcriptDbId);

      if (error) throw error;
      
      toast({
        title: getLocaleString('success', currentLanguage),
        description: getLocaleString('transcriptionCompleted', currentLanguage) || 'Распознавание завершено!',
      });
      refreshAllData();
    };

    // Check for existing transcript record
    const { data: existingTranscript } = await supabase
      .from('transcripts')
      .select('id, episode_slug, lang, edited_transcript_data')
      .eq('episode_slug', episodeData.slug)
      .eq('lang', langForTranscription)
      .maybeSingle();

    // Submit new job (Deepgram is synchronous-like for this implementation)
    setIsRecognizingText(true);
    try {
      // Create initial record if not exists
      let transcriptDbId = existingTranscript?.id;
      
      if (!transcriptDbId) {
         const { data: newTranscript, error: upsertError } = await supabase
          .from('transcripts')
          .upsert({
            episode_slug: episodeData.slug,
            lang: langForTranscription,
            status: 'processing',
            provider: 'deepgram'
          }, { onConflict: 'episode_slug,lang' })
          .select()
          .single();
          
         if (upsertError) throw upsertError;
         transcriptDbId = newTranscript.id;
      } else {
         // Update status to processing
         await supabase.from('transcripts').update({ status: 'processing', provider: 'deepgram' }).eq('id', transcriptDbId);
      }

      toast({
        title: getLocaleString('success', currentLanguage),
        description: getLocaleString('transcriptionStarted', currentLanguage) || 'Распознавание начато',
      });

      // Submit to Deepgram
      const result = await deepgramService.submitTranscription(
        audioUrl,
        langForTranscription,
        episodeData.slug,
        currentLanguage,
        langForTranscription
      );

      // Process and save immediately
      await processAndSaveTranscript(result, transcriptDbId);

    } catch (error) {
      console.error('Error starting transcription:', error);
      setIsRecognizingText(false);
      toast({
        title: getLocaleString('error', currentLanguage),
        description: error.message || getLocaleString('transcriptionError', currentLanguage),
        variant: 'destructive',
      });
    } finally {
      setIsRecognizingText(false);
    }


  }, [episodeData, currentLanguage, toast, refreshAllData]);

  const handleRecognizeQuestions = useCallback(async () => {
    if (!episodeData?.slug) return;

    setIsRecognizingQuestions(true);
    try {
      const langForQuestions = (episodeData.lang === 'all' || episodeData.lang === 'mixed') ? currentLanguage : episodeData.lang;

      // Get transcript data first
      const { data: transcriptData } = await supabase
        .from('transcripts')
        .select('edited_transcript_data')
        .eq('episode_slug', episodeData.slug)
        .eq('lang', langForQuestions)
        .single();

      if (!transcriptData || !transcriptData.edited_transcript_data) {
        throw new Error(getLocaleString('transcriptRequired', currentLanguage));
      }

      const questions = await generateQuestionsOpenAI(transcriptData.edited_transcript_data, langForQuestions, currentLanguage);

      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error(getLocaleString('questionsGenerationFailed', currentLanguage));
      }

      // Save questions to database
      await supabase.from('timecodes').delete().eq('episode_slug', episodeData.slug).eq('lang', langForQuestions);

      const questionsToInsert = questions.map((q, index) => ({
        episode_slug: episodeData.slug,
        lang: langForQuestions,
        title: q.title,
        time: Number(q.time ?? 0)
      }));

      await supabase.from('timecodes').insert(questionsToInsert);

      toast({
        title: getLocaleString('success', currentLanguage),
        description: getPluralizedLocaleString('questionsGeneratedForEpisode', currentLanguage, questions.length, { episodeSlug: episodeData.slug, lang: langForQuestions.toUpperCase() }),
      });
    } catch (error) {
      console.error('Error generating questions:', error);
      toast({
        title: getLocaleString('error', currentLanguage),
        description: error.message || getLocaleString('questionsGenerationError', currentLanguage),
        variant: 'destructive',
      });
    } finally {
      setIsRecognizingQuestions(false);
    }
  }, [episodeData, currentLanguage, toast]);

  const handleSmartSegmentation = useCallback(async () => {
    if (!episodeData?.slug || !transcript) return;

    setIsSmartSegmenting(true);
    try {
      // 1. Gather all words
      let originalWords = [];
      if (transcript.words && transcript.words.length > 0) {
          originalWords = transcript.words;
      } else if (transcript.utterances) {
          // Flatten utterances to words
          transcript.utterances.forEach(u => {
              if (u.words) {
                  originalWords = [...originalWords, ...u.words];
              }
          });
      }

      if (originalWords.length === 0) {
          throw new Error("No words found in transcript to segment.");
      }

      // 2. Construct full text (for logging/debugging if needed, but service handles it)
      // const fullText = originalWords.map(w => w.word).join(' ');

      toast({
        title: getLocaleString('processing', currentLanguage),
        description: getLocaleString('segmenting', currentLanguage), 
      });

      // 3. Call service
      // Wrap words in a single utterance structure as expected by the service
      const inputUtterances = [{ words: originalWords }];
      const newUtterances = await smartSegmentationService.processTranscript(inputUtterances);

      // 4. Save result
      await handleTranscriptUpdate({ 
          ...transcript,
          utterances: newUtterances 
      });

      toast({
        title: getLocaleString('success', currentLanguage),
        description: "Smart segmentation completed!",
      });

    } catch (error) {
      console.error('Error during smart segmentation:', error);
      toast({
        title: getLocaleString('error', currentLanguage),
        description: error.message || "Smart segmentation failed",
        variant: 'destructive',
      });
    } finally {
      setIsSmartSegmenting(false);
    }
  }, [episodeData, transcript, currentLanguage, toast, handleTranscriptUpdate]);

  // Automatic recognition removed — recognition is now manual (triggered from UI)

  // Пока не получили базовые данные эпизода — показываем простой лоадер
  if (loading && !episodeData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-purple-400" />
        <p className="mt-4 text-lg">{getLocaleString('loadingEpisode', currentLanguage)}</p>
      </div>
    );
  }

  // Не блокируем рендер плеера: если грузится только текст/вопросы — покажем их спиннеры ниже
  if (!episodeData && !loading) {
    return (
      <div className="text-center p-8 bg-red-700/30 rounded-lg shadow-xl">
        <h2 className="text-xl font-bold mb-2">{getLocaleString('errorLoadingData', currentLanguage)}</h2>
        <p className="max-w-md mx-auto">{getLocaleString('episodeNotFound', currentLanguage)}</p>
        <Button onClick={() => navigate(`/${langPrefix}/episodes`)} variant="outline" className="mt-4 bg-slate-700/50 hover:bg-slate-600/70 border-slate-600 text-slate-300 hover:text-white">
          <ArrowLeft className="mr-2 h-4 w-4" /> {getLocaleString('backToEpisodesShort', currentLanguage)}
        </Button>
      </div>
    );
  }

  if (error && !playerEpisodeDataMemo) {
    return (
      <div className="text-center p-8 bg-red-700/30 rounded-lg shadow-xl">
        <h2 className="text-xl font-bold mb-2">{getLocaleString('errorLoadingData', currentLanguage)}</h2>
        <p className="max-w-md mx-auto">{error}</p>
        <Button onClick={() => navigate(`/${langPrefix}/episodes`)} variant="outline" className="mt-4 bg-slate-700/50 hover:bg-slate-600/70 border-slate-600 text-slate-300 hover:text-white">
          <ArrowLeft className="mr-2 h-4 w-4" /> {getLocaleString('backToEpisodesShort', currentLanguage)}
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center">
      {playerShowFloatingControls && (
        <FloatingPlayerControls
          episodeTitle={playerEpisodeDataMemo?.displayTitle || ''}
          isPlaying={isPlaying}
          activeQuestionTitle={activeQuestionTitle}
          onPlayPause={handleFloatingPlayPause}
          onSkipSeconds={handleFloatingPlayerSkip}
          currentLanguage={currentLanguage}
        />
      )}
      <div className="w-full max-w-3xl">

        
        <div ref={playerControlsContainerRef} className="mb-4">
          {playerEpisodeDataMemo && (
            <PodcastPlayer
                key={playerEpisodeDataMemo.slug}
                episodeData={playerEpisodeDataMemo}
                onQuestionUpdate={handleQuestionUpdate}
                currentLanguage={currentLanguage}
                onQuestionSelectJump={handleSeekToTime}
                audioRef={audioRef}
                episodeSlug={playerEpisodeDataMemo.slug}
                episodeAudioUrl={getAudioUrl(playerEpisodeDataMemo)}
                episodeLang={playerEpisodeDataMemo.lang}
                episodeDate={playerEpisodeDataMemo.date}
                navigateBack={() => navigate(`/${langPrefix}/episodes`)}
                navigateHistory={() => navigate(-1)}
                onPlayerStateChange={handlePlayerStateChange}
                playerControlsContainerRef={playerControlsContainerRef}
                showTranscript={showTranscriptUI}
                onToggleShowTranscript={handleToggleShowTranscript}
                user={user}
                onTranscriptUpdate={handleTranscriptUpdate}
                isEditMode={isEditMode}
                setIsEditMode={setIsEditMode}
                fetchTranscriptForEpisode={fetchTranscriptForEpisode}
                isOfflineMode={isOfflineMode}
                onRecognizeText={handleRecognizeText}
                onRecognizeQuestions={handleRecognizeQuestions}
                onSmartSegmentation={handleSmartSegmentation}
                isRecognizingText={isRecognizingText}
                isRecognizingQuestions={isRecognizingQuestions}
                isSmartSegmenting={isSmartSegmenting}
                availableAudioVariants={getAvailableAudioVariants(playerEpisodeDataMemo)}
            />
          )}
        </div>
        <div className="w-full relative">
          {(questionsLoading || transcriptLoading) && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 px-2 py-1 rounded-md bg-slate-800/70 backdrop-blur border border-slate-700/70 text-slate-300 text-xs flex items-center gap-1.5 shadow-md">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-400" />
              <span>{getLocaleString('loadingTranscriptAndQuestions', currentLanguage) || 'Loading transcript and questions...'}</span>
            </div>
          )}
           <QuestionsManager
            questions={playerEpisodeDataMemo.questions || []}
            currentTime={currentTime}
            duration={duration}
            onQuestionsChange={handleQuestionUpdate}
            onQuestionJump={(time, id, playAfterJumpParam) => handleSeekToTime(time, id, playAfterJumpParam)}
            episodeSlug={playerEpisodeDataMemo.slug}
            episodeDate={playerEpisodeDataMemo.date}
            audioRef={audioRef}
            mainPlayerIsPlaying={isPlaying}
            mainPlayerTogglePlayPause={handleFloatingPlayPause} 
            mainPlayerSeekAudio={(time, play) => handleSeekToTime(time, null, play)}
            currentLanguage={currentLanguage}
            episodeLang={playerEpisodeDataMemo.lang || 'all'}
            episodeAudioUrl={getAudioUrl(playerEpisodeDataMemo)}
            jumpToQuestionId={playerEpisodeDataMemo.jumpToQuestionId}
            isBatchAddDisabled={true}
            showTranscript={showTranscriptUI}
            user={user}
            disableAutomaticCollapse={true}
            onOpenSpeakerAssignmentDialog={handleOpenSpeakerAssignmentDialog}
            transcriptUtterances={playerEpisodeDataMemo.transcript?.utterances || []}
            transcriptId={playerEpisodeDataMemo.transcript?.id || null}
            transcriptWords={playerEpisodeDataMemo.transcript?.words || []}
            segmentToHighlight={playerEpisodeDataMemo.segmentToHighlight}
            isLoading={Boolean(questionsLoading)}
            transcriptLoading={Boolean(transcriptLoading)}
            onTranscriptLocalUpdate={setTranscript}
            onSaveEditedSegment={handleSegmentEdit}
            onAddQuestionFromSegment={openAddQuestionFromSegmentDialog}
            onEditQuestion={handleEditQuestion}
            isEditMode={isEditMode}
          />
        </div>
      </div>
      {segmentForSpeakerAssignment && (
        <SpeakerAssignmentDialog
          isOpen={isSpeakerAssignmentDialogOpen}
          onClose={handleCloseSpeakerAssignmentDialog}
          segment={segmentForSpeakerAssignment}
          allUtterances={playerEpisodeDataMemo?.transcript?.utterances || []}
          onSave={handleSaveSpeakerAssignment}
          currentLanguage={currentLanguage}
        />
      )}
      {segmentForQuestion && (
        <AddQuestionFromSegmentDialog
          isOpen={isAddQuestionFromSegmentDialogOpen}
          onClose={closeAddQuestionFromSegmentDialog}
          segment={segmentForQuestion}
          onSave={(title, time) => {
            handleQuestionUpdate('add', { title, time, lang: currentLanguage });
            closeAddQuestionFromSegmentDialog();
          }}
          currentLanguage={currentLanguage}
          audioRef={audioRef}
          mainPlayerIsPlaying={isPlaying}
          mainPlayerTogglePlayPause={handleFloatingPlayPause}
          mainPlayerSeekAudio={handleSeekToTime}
          duration={duration}
        />
      )}
      {editingQuestion && (
        <AddQuestionDialog
          isOpen={!!editingQuestion}
          onClose={() => setEditingQuestion(null)}
          initialTime={editingQuestion.time}
          initialTitle={editingQuestion.title}
          onSave={(title, time) => {
            handleQuestionUpdate('update', { 
              id: editingQuestion.id, 
              title, 
              time, 
              lang: editingQuestion.lang || currentLanguage 
            });
            setEditingQuestion(null);
          }}
          onDelete={editingQuestion.id === 'intro-virtual' ? undefined : () => {
            handleQuestionUpdate('delete', { id: editingQuestion.id });
            setEditingQuestion(null);
          }}
          currentLanguage={currentLanguage}
          audioRef={audioRef}
          mainPlayerIsPlaying={isPlaying}
          mainPlayerTogglePlayPause={handleFloatingPlayPause}
          mainPlayerSeekAudio={handleSeekToTime}
          duration={duration}
          isEditing={true}
          disableTimeEditing={editingQuestion.id === 'intro-virtual'}
          hideDelete={editingQuestion.id === 'intro-virtual'}
        />
      )}
    </div>
  );
};

export default PlayerPage;
