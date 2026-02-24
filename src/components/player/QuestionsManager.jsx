import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import QuestionBlock from '@/components/player/questions_manager_parts/QuestionBlock.jsx';
import useArticleStatus from '@/hooks/useArticleStatus';
import { createDraftFromQuestion } from '@/services/articleService';
import { useEditorAuth } from '@/contexts/EditorAuthContext';

const QuestionsManager = ({
  questions,
  currentTime,
  duration,
  onQuestionsChange,
  onQuestionJump,
  episodeSlug,
  episodeDate,
  audioRef,
  mainPlayerIsPlaying,
  mainPlayerTogglePlayPause,
  mainPlayerSeekAudio,
  currentLanguage,
  episodeLang,
  episodeAudioUrl,
  jumpToQuestionId,
  showTranscript,
  user,
  disableAutomaticCollapse = false,
  onOpenSpeakerAssignmentDialog,
  transcriptUtterances,
  transcriptId,
  transcriptWords,
  segmentToHighlight,
  isLoading,
  transcriptLoading,
  onTranscriptLocalUpdate,
  onSaveEditedSegment,
  onAddQuestionFromSegment,
  onEditQuestion,
  isEditMode
}) => {
  const [activeQuestionId, setActiveQuestionId] = useState(null);
  const [expandedById, setExpandedById] = useState({});
  const navigate = useNavigate();
  const location = useLocation();
  const { editor: editorAuth, isAuthenticated } = useEditorAuth();

  const langForContent = episodeLang === 'all' ? currentLanguage : episodeLang;
  const utterances = transcriptUtterances || [];

  // Batch-load article statuses for all questions in this episode
  const { articleStatuses, refreshStatuses } = useArticleStatus(episodeSlug, langForContent);

  const questionSegmentsMap = useMemo(() => {
    if (!showTranscript || utterances.length === 0) return {};
    const map = {};
    const sorted = [...questions].sort((a, b) => a.time - b.time);
    sorted.forEach((q, idx) => {
      const startMs = (q.time || 0) * 1000;
      const next = sorted[idx + 1];
      const endMs = next ? (next.time * 1000) : (duration ? duration * 1000 : Infinity);
      map[q.id] = utterances
        .filter(u => typeof u.start === 'number' && u.start >= startMs && u.start < endMs)
        .sort((a, b) => a.start - b.start);
    });
    return map;
  }, [questions, utterances, duration, showTranscript]);

  const questionEndTimeMsMap = useMemo(() => {
    const map = {};
    if (!Array.isArray(questions) || questions.length === 0) return map;
    const sorted = [...questions].sort((a, b) => a.time - b.time);
    sorted.forEach((q, idx) => {
      const next = sorted[idx + 1];
      const endSec = next ? next.time : (typeof duration === 'number' ? duration : Infinity);
      map[q.id] = (endSec === Infinity) ? Infinity : endSec * 1000;
    });
    return map;
  }, [questions, duration]);

  useEffect(() => {
    if (Array.isArray(questions) && questions.length > 0) {
      // Ensure questions are sorted by time to correctly identify the current one
      const sortedQuestions = [...questions].sort((a, b) => a.time - b.time);
      
      const playingQ = sortedQuestions.find((q, index) => {
        const nextQ = sortedQuestions[index + 1];
        return currentTime >= q.time && (!nextQ || currentTime < nextQ.time);
      });

      if (playingQ && playingQ.id !== activeQuestionId) {
        setActiveQuestionId(playingQ.id);
        if (!disableAutomaticCollapse) {
          setExpandedById(prev => ({ ...prev, [playingQ.id]: true }));
        }
      }
    }
  }, [currentTime, questions, activeQuestionId, disableAutomaticCollapse]);

  useEffect(() => {
    if (!jumpToQuestionId) return;
    const q = questions.find(x => String(x.id) === String(jumpToQuestionId));
    if (q) {
      setActiveQuestionId(q.id);
      setExpandedById(prev => ({ ...prev, [q.id]: true }));
      const el = document.getElementById(`question-block-${q.id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [jumpToQuestionId, questions]);

  const toggleQuestionExpansion = useCallback((id) => {
    setExpandedById(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleActivateQuestion = useCallback((q) => {
    onQuestionJump(q.time, `question-${q.id}`, true);
    setActiveQuestionId(q.id);
    if (!disableAutomaticCollapse) {
      setExpandedById({ [q.id]: true });
    } else {
      setExpandedById(prev => ({ ...prev, [q.id]: true }));
    }
  }, [onQuestionJump, disableAutomaticCollapse]);

  const handleSegmentClick = useCallback((timeInSeconds) => {
    if (mainPlayerSeekAudio) mainPlayerSeekAudio(timeInSeconds, true);
  }, [mainPlayerSeekAudio]);

  // Handle article actions from QuestionBlock icons
  const handleArticleAction = useCallback((question, action) => {
    const status = articleStatuses[question.id];
    const playerReturnTo = `${location.pathname}${location.search}${location.hash || ''}`;
    const playerNavState = { fromPlayer: true, returnTo: playerReturnTo };
    
    if (action === 'view' && status?.slug) {
      navigate(`/${currentLanguage}/articles/${status.slug}`, { state: playerNavState });
    } else if (action === 'edit' && status?.slug) {
      navigate(`/${currentLanguage}/articles/${status.slug}/edit`, { state: playerNavState });
    } else if (action === 'translate' && status?.slug) {
      // Article exists but no translation in current language — open editor to create translation
      navigate(`/${currentLanguage}/articles/${status.slug}/edit`, { state: playerNavState });
    } else if (action === 'create') {
      // Get time range for this question
      const sorted = [...questions].sort((a, b) => a.time - b.time);
      const qIdx = sorted.findIndex(q => q.id === question.id);
      const nextQ = sorted[qIdx + 1];
      const endTime = nextQ ? nextQ.time : (duration ? Math.floor(duration) : null);

      // Store question data in sessionStorage as reliable transport
      const questionData = {
        questionId: String(question.id),
        episode: episodeSlug,
        title: question.title || '',
        time: question.time,
        endTime: endTime ?? null,
        ts: Date.now()
      };
      try {
        sessionStorage.setItem('newArticleFromQuestion', JSON.stringify(questionData));
      } catch (e) {
        console.warn('[QuestionsManager] Failed to write sessionStorage:', e);
      }

      // Navigate with query params as well (belt + suspenders)
      const search = new URLSearchParams({
        questionId: String(question.id),
        episode: episodeSlug,
        title: question.title || '',
        time: String(question.time),
        ...(endTime != null ? { endTime: String(endTime) } : {})
      });
      console.log('[QuestionsManager] Navigating to new article editor:', `/${currentLanguage}/articles/new/edit?${search.toString()}`);
      navigate({
        pathname: `/${currentLanguage}/articles/new/edit`,
        search: search.toString()
      }, {
        state: playerNavState
      });
    }
  }, [articleStatuses, currentLanguage, navigate, questions, duration, transcriptUtterances, episodeSlug, location.pathname, location.search, location.hash]);

  const displayableQuestions = useMemo(() => {
    if (!Array.isArray(questions)) return [];
    const sorted = [...questions].sort((a, b) => a.time - b.time);
    
    // Фильтруем вопросы без заголовка, кроме специальных блоков
    const filteredQuestions = sorted.filter(q => {
      // Пропускаем специальные блоки (intro, full_transcript)
      if (q.is_intro || q.is_full_transcript || q.id === 'intro-virtual') {
        return true;
      }
      // Пропускаем вопросы с заголовком (не пустой и не только пробелы)
      return q.title && q.title.trim() !== '';
    });
    
    const fullTranscript = (!filteredQuestions.some(q => q.id !== 'intro-virtual') && utterances.length > 0 && showTranscript)
      ? [{ id: 'full-transcript-virtual', title: '', time: 0, is_full_transcript: true, is_intro: false, lang: langForContent }]
      : [];
    return [...fullTranscript, ...filteredQuestions];
  }, [questions, utterances, showTranscript, langForContent]);

  return (
    <div className="mt-1">
      {displayableQuestions.map((q) => (
        <QuestionBlock
          key={q.id}
          id={`question-block-${q.id}`}
          question={q}
          segments={questionSegmentsMap[q.id] || []}
          isActiveQuestion={activeQuestionId === q.id}
          isJumpTarget={segmentToHighlight && (questionSegmentsMap[q.id] || []).some(s => s.start === segmentToHighlight)}
          isExpanded={!!expandedById[q.id]}
          onToggleExpansion={() => toggleQuestionExpansion(q.id)}
          onActivate={() => handleActivateQuestion(q)}
          onEditQuestion={() => onEditQuestion(q)}
          currentLanguage={currentLanguage}
          onSegmentClick={handleSegmentClick}
          audioRef={audioRef}
          onSaveEditedSegment={onSaveEditedSegment}
          activeSegmentTime={currentTime * 1000}
          onAddQuestionFromSegment={onAddQuestionFromSegment}
          utterances={utterances}
          mainPlayerIsPlaying={mainPlayerIsPlaying}
          showTranscript={showTranscript}
          user={user}
          episodeSlug={episodeSlug}
          isReadingMode={false}
          readingModeEditingActive={false}
          setReadingModeEditingSegmentRef={null}
          onOpenSpeakerAssignmentDialog={onOpenSpeakerAssignmentDialog}
          segmentToHighlight={segmentToHighlight}
          transcriptLoading={transcriptLoading}
          questionRangeEndMs={questionEndTimeMsMap[q.id]}
          isEditMode={isEditMode}
          articleStatus={articleStatuses[q.id] || null}
          onArticleAction={(action) => handleArticleAction(q, action)}
        />
      ))}
    </div>
  );
};

export default QuestionsManager;


