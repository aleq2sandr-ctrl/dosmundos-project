
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import logger from '@/lib/logger';
import { getLocaleString } from '@/lib/locales';
import { getAudioUrl } from '@/lib/audioUrl';
import { getFullTextFromUtterances } from '@/hooks/transcript/transcriptProcessingUtils';
import { reconstructTranscriptFromChunks } from '@/lib/transcriptChunkingService';
import r2Service from '@/lib/r2Service';

// Utility function to check if a file exists on Archive.org
export const checkEpisodeFileExists = async (episode) => {
  if (!episode.r2_object_key || !episode.audio_url) {
    return { exists: false, error: 'No file key or URL' };
  }
  
  try {
    const fileExists = await r2Service.checkFileExists(episode.r2_object_key);
    return { exists: fileExists.exists, error: null };
  } catch (error) {
    console.warn('Error checking file existence for episode:', episode.slug, error);
    return { exists: false, error: error.message };
  }
};

const useEpisodeData = (episodeSlug, currentLanguage, toast) => {
  const [episodeData, setEpisodeData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [transcript, setTranscript] = useState(null);
  const [loading, setLoading] = useState(true); // загрузка только базовых данных эпизода (аудио URL, метаданные)
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [error, setError] = useState(null);
  const [questionsUpdatedId, setQuestionsUpdatedId] = useState(Date.now());

  // --- Transcript cache helpers (localStorage, stale-while-revalidate) ---
  const TRANSCRIPT_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  const getTranscriptCacheKey = useCallback((epSlug, lang) => `transcript:${epSlug}:${lang}`, []);

  const computeTranscriptVersionKey = useCallback((payload) => {
    if (!payload) return 'none';
    const { id, status, data } = payload;
    const utterances = Array.isArray(data?.utterances) ? data.utterances : [];
    const utterancesLen = utterances.length;
    const wordsLen = data?.words?.length || 0;
    const textLen = (data?.text || '').length || 0;

    // Include a lightweight checksum of speakers so renaming speakers invalidates cache
    let speakersHash = 0;
    for (let i = 0; i < utterances.length; i++) {
      const u = utterances[i];
      const idPart = String(u?.id ?? u?.start ?? i);
      const speakerPart = String(u?.speaker ?? '');
      const composite = idPart + ':' + speakerPart + '|';
      for (let j = 0; j < composite.length; j++) {
        speakersHash = ((speakersHash << 5) - speakersHash) + composite.charCodeAt(j);
        speakersHash |= 0; // force 32-bit
      }
    }

    return `${id || 'noid'}:${status || 'nostatus'}:${utterancesLen}:${wordsLen}:${textLen}:spk:${speakersHash}`;
  }, []);

  const readTranscriptCache = useCallback((epSlug, lang) => {
    try {
      if (typeof window === 'undefined') return null;
      const raw = window.localStorage.getItem(getTranscriptCacheKey(epSlug, lang));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed?.meta?.versionKey || !parsed?.data) return null;
      const isFresh = Date.now() - (parsed.cachedAt || 0) < TRANSCRIPT_CACHE_TTL_MS;
      return { value: parsed, isFresh };
    } catch {
      return null;
    }
  }, [getTranscriptCacheKey]);

  const writeTranscriptCache = useCallback((epSlug, lang, cacheValue) => {
    try {
      if (typeof window === 'undefined') return;
      const toStore = { ...cacheValue, cachedAt: Date.now() };
      window.localStorage.setItem(getTranscriptCacheKey(epSlug, lang), JSON.stringify(toStore));
    } catch {}
  }, [getTranscriptCacheKey]);

  // Fallback: generate simple utterances from words when API did not return utterances
  const generateUtterancesFromWords = useCallback((wordsArray) => {
    if (!Array.isArray(wordsArray) || wordsArray.length === 0) return [];
    const MAX_UTTERANCE_MS = 8000; // up to 8s per chunk
    const MAX_WORDS_PER_UTTERANCE = 60;
    const punctuationRegex = /[.!?]\s*$/;

    const utterances = [];
    let current = null;
    for (let i = 0; i < wordsArray.length; i++) {
      const w = wordsArray[i];
      if (typeof w?.start !== 'number' || typeof w?.end !== 'number' || typeof w?.text !== 'string') {
        continue;
      }
      if (!current) {
        current = { id: `u-${utterances.length}`, start: w.start, end: w.end, text: w.text };
        continue;
      }
      // Decide whether to continue current utterance or start a new one
      const wouldBeText = current.text ? current.text + (w.text.match(/^['",.?!:;)]/) ? '' : ' ') + w.text : w.text;
      const spanMs = Math.max(w.end, current.end) - current.start;
      const wordCount = wouldBeText.split(/\s+/).filter(Boolean).length;
      const shouldBreak = spanMs >= MAX_UTTERANCE_MS || wordCount >= MAX_WORDS_PER_UTTERANCE || punctuationRegex.test(current.text);
      if (shouldBreak) {
        utterances.push(current);
        current = { id: `u-${utterances.length}`, start: w.start, end: w.end, text: w.text };
      } else {
        current.text = wouldBeText;
        current.end = Math.max(current.end, w.end);
      }
    }
    if (current) utterances.push(current);
    return utterances;
  }, []);

  const fetchTranscriptForEpisode = useCallback(async (epSlug, langForTranscript) => {
    try {
      logger.debug('🔍 Fetching transcript for:', { epSlug, langForTranscript });
      
      // Prefill from cache if available and fresh
      const cached = readTranscriptCache(epSlug, langForTranscript);
      if (cached?.isFresh && cached.value?.data) {
        logger.debug('📦 Using cached transcript data');
        setTranscript({
          id: cached.value.meta?.id || null,
          utterances: cached.value.data.utterances || [],
          words: cached.value.data.words || [],
          text: cached.value.data.text || '',
          status: cached.value.meta?.status || null
        });
      }

      // First try to get transcript from chunks
      logger.debug('🧩 Trying to reconstruct transcript from chunks');
      const chunkedTranscript = await reconstructTranscriptFromChunks(epSlug, langForTranscript);
      
      logger.debug('🧩 Chunk reconstruction result:', { 
        hasResult: !!chunkedTranscript,
        utterancesCount: chunkedTranscript?.utterances?.length || 0,
        hasEditedVersion: chunkedTranscript?.hasEditedVersion || false
      });
      
      if (chunkedTranscript && chunkedTranscript.utterances && chunkedTranscript.utterances.length > 0) {
        logger.debug('✅ Successfully reconstructed transcript from chunks', { 
          utterancesCount: chunkedTranscript.utterances.length 
        });
        
        const freshPayload = {
          id: chunkedTranscript.id || null,
          status: 'completed',
          data: {
            utterances: chunkedTranscript.utterances,
            words: chunkedTranscript.words || [],
            text: chunkedTranscript.text || getFullTextFromUtterances(chunkedTranscript.utterances)
          }
        };
        
        const freshVersion = computeTranscriptVersionKey(freshPayload);
        const cachedVersion = cached?.value?.meta?.versionKey || 'none';

        if (freshVersion !== cachedVersion) {
          logger.debug('✅ Updating transcript state and cache from chunks');
          setTranscript({ 
            id: freshPayload.id,
            utterances: freshPayload.data.utterances,
            words: freshPayload.data.words,
            text: freshPayload.data.text,
            status: freshPayload.status 
          });
          writeTranscriptCache(epSlug, langForTranscript, {
            meta: { id: freshPayload.id, status: freshPayload.status, versionKey: freshVersion },
            data: freshPayload.data
          });
        } else {
          logger.debug('⏭️ Skipping update - transcript unchanged');
        }
        return;
      }

      // Fallback to old method if no chunks found
      logger.debug('📦 No chunks found, trying legacy transcript data');
      
      const { data, error: transcriptError } = await supabase
        .from('transcripts')
        .select('id, edited_transcript_data')
        .eq('episode_slug', epSlug)
        .eq('lang', langForTranscript)
        .maybeSingle();

      logger.debug('📊 Transcript query result:', { data, error: transcriptError, langForTranscript });

      if (transcriptError) throw transcriptError;
      
      // Check if we have actual utterances in edited_transcript_data (not just count)
      if (data && data.edited_transcript_data && data.edited_transcript_data.utterances && Array.isArray(data.edited_transcript_data.utterances)) {
        const finalTranscriptData = data.edited_transcript_data;
        logger.debug('📝 Raw transcript data received');
        
        // Ensure utterances exist for player rendering
        let ensuredUtterances = Array.isArray(finalTranscriptData?.utterances) ? finalTranscriptData.utterances : [];
        if (ensuredUtterances.length === 0 && Array.isArray(finalTranscriptData?.words) && finalTranscriptData.words.length > 0) {
          logger.debug('🧩 Generating utterances from words as fallback');
          ensuredUtterances = generateUtterancesFromWords(finalTranscriptData.words);
        }

        const freshPayload = {
          id: data.id,
          // Assume completed if we have utterances
          status: data.edited_transcript_data?.utterances?.length > 0 ? 'completed' : null,
          data: {
            utterances: ensuredUtterances,
            // Используем только edited_transcript_data
            words: finalTranscriptData?.words || [],
            text: finalTranscriptData?.text || getFullTextFromUtterances(finalTranscriptData?.utterances || [])
          }
        };
        
        logger.debug('🔄 Processed transcript payload');
        
        const freshVersion = computeTranscriptVersionKey(freshPayload);
        const cachedVersion = cached?.value?.meta?.versionKey || 'none';

        if (freshVersion !== cachedVersion) {
          logger.debug('✅ Updating transcript state and cache from legacy data');
          // Update state and cache only if changed
          setTranscript({ 
            id: freshPayload.id,
            utterances: freshPayload.data.utterances,
            words: freshPayload.data.words,
            text: freshPayload.data.text,
            status: freshPayload.status 
          });
          writeTranscriptCache(epSlug, langForTranscript, {
            meta: { id: freshPayload.id, status: freshPayload.status, versionKey: freshVersion },
            data: freshPayload.data
          });
        } else {
          logger.debug('⏭️ Skipping update - transcript unchanged');
        }
      } else {
        logger.debug('❌ No transcript data found in DB (only metadata, no utterances)');
        setTranscript(null);
      }
    } catch (err) {
      toast({ title: getLocaleString('errorGeneric', currentLanguage), description: `Error fetching transcript: ${err.message}`, variant: 'destructive' });
      setTranscript(null);
    }
  }, [currentLanguage, toast, readTranscriptCache, writeTranscriptCache, computeTranscriptVersionKey]);

  const fetchQuestionsForEpisode = useCallback(async (epSlug, langForQuestions) => {
    try {
      const { data, error: questionsError } = await supabase
        .from('timecodes')
        .select('id, time, title, lang, created_at, episode_slug') // Removed is_intro, is_full_transcript as they don't exist in DB
        .eq('episode_slug', epSlug)
        .eq('lang', langForQuestions)
        .order('time', { ascending: true });

      if (questionsError) throw questionsError;
      
      let fetchedQuestions = data || [];
      
      // Дедупликация вопросов: сначала по содержимому (title+time), затем по id
      const normalize = (s) => (s || '').trim().toLowerCase();
      const seenByContent = new Set();
      const byContent = [];
      for (const q of fetchedQuestions) {
        const key = `${normalize(q.title)}|${Math.round(Number(q.time || 0))}`;
        if (!seenByContent.has(key)) {
          seenByContent.add(key);
          byContent.push(q);
        }
      }

      const byId = new Map();
      for (const q of byContent) {
        if (!byId.has(q.id)) byId.set(q.id, q);
      }
      fetchedQuestions = Array.from(byId.values());
      
      const hasIntro = fetchedQuestions.some(q => q.is_intro && q.time === 0);

      if (!hasIntro) {
        const introQuestion = {
          id: 'intro-virtual', 
          time: 0,
          title: getLocaleString('introduction', langForQuestions),
          lang: langForQuestions,
          is_intro: true,
          is_full_transcript: false,
          episode_slug: epSlug,
          created_at: new Date().toISOString()
        };
        fetchedQuestions = [introQuestion, ...fetchedQuestions];
      }
      
      setQuestions(fetchedQuestions);
      setQuestionsUpdatedId(Date.now());
    } catch (err) {
      toast({ title: getLocaleString('errorGeneric', currentLanguage), description: getLocaleString('errorFetchingQuestions', currentLanguage, {errorMessage: err.message}), variant: 'destructive' });
      setQuestions([]);
    }
  }, [currentLanguage, toast]);

  const fetchEpisodeDetails = useCallback(async () => {
    if (!episodeSlug) return;

    setLoading(true);
    setError(null);
    try {
      // Fetch episode with all its variants (audio tracks)
      const { data: episode, error: episodeError } = await supabase
        .from('episodes')
        .select(`
          slug,
          date,
          created_at,
          episode_audios (
            lang,
            audio_url
          ),
          transcripts (
            lang,
            title,
            short_description,
            status,
            edited_transcript_data
          )
        `)
        .eq('slug', episodeSlug)
        .maybeSingle();

      if (episodeError) throw episodeError;
      if (!episode) {
        console.warn('Episode not found:', episodeSlug);
        setError(getLocaleString('episodeNotFound', currentLanguage));
        setLoading(false);
        return;
      }

      // Process variants to find the best match for current language
      const audios = episode.episode_audios || [];
      const transcripts = episode.transcripts || [];
      
      // According to requirements: default to ru for Russian, es for Spanish, mixed for other languages
      let activeAudio;
      
      // First, try to find audio for current language
      if (currentLanguage === 'ru') {
        activeAudio = audios.find(v => v.lang === 'ru');
      } else if (currentLanguage === 'es') {
        activeAudio = audios.find(v => v.lang === 'es');
      } else {
        // For other languages, default to mixed
        activeAudio = audios.find(v => v.lang === 'mixed');
      }
      
      // If not found, fallback logic
      if (!activeAudio) {
        // Try mixed as fallback
        activeAudio = audios.find(v => v.lang === 'mixed');
      }
      // If still no mixed, try any available
      if (!activeAudio && audios.length > 0) {
        activeAudio = audios[0];
      }

      // Find title from transcripts
      const activeTranscript = transcripts.find(t => t.lang === currentLanguage)
                             || transcripts.find(t => t.lang === 'es')
                             || transcripts[0];

      // Construct the episode object compatible with the player
      const episodeData = {
        ...episode,
        // Flatten active variant properties for backward compatibility
        title: activeTranscript?.title || episode.slug,
        lang: activeAudio?.lang || 'mixed',
        audio_url: activeAudio?.audio_url,
        duration: 0, // Duration removed from V3 for now
        // Store all variants for the player to allow switching
        available_variants: audios.filter(v => String(v.lang || '').toLowerCase() !== 'en'),
        audio_variants: audios.filter(v => String(v.lang || '').toLowerCase() !== 'en'), // Alias for compatibility
        episode_audios: audios.filter(v => String(v.lang || '').toLowerCase() !== 'en') // Full episode_audios structure
      };
      
      // Сразу устанавливаем данные эпизода и снимаем основной лоадер
      setEpisodeData(episodeData);
      setLoading(false);

      // Подгружаем вопросы/транскрипт неблокирующе, с отдельными флагами загрузки
      // For content (transcript/questions), we use the requested currentLanguage
      // even if the audio is different.
      setQuestionsLoading(true);
      setTranscriptLoading(true);
      
      (async () => {
        try {
          await fetchQuestionsForEpisode(episode.slug, currentLanguage);
        } finally {
          setQuestionsLoading(false);
        }
      })();

      (async () => {
        try {
          await fetchTranscriptForEpisode(episode.slug, currentLanguage);
        } finally {
          setTranscriptLoading(false);
        }
      })();

    } catch (err) {
      console.error('useEpisodeData: Error fetching episode', err);
      setError(err.message);
      toast({ title: getLocaleString('errorGeneric', currentLanguage), description: err.message, variant: 'destructive' });
      setLoading(false);
    }
  }, [episodeSlug, currentLanguage, toast, fetchQuestionsForEpisode, fetchTranscriptForEpisode]);

  useEffect(() => {
    fetchEpisodeDetails();
  }, [fetchEpisodeDetails]);
  
  useEffect(() => {
    if (episodeData && episodeData.lang === 'all') {
      setQuestionsLoading(true);
      setTranscriptLoading(true);
      (async () => {
        try {
          await fetchQuestionsForEpisode(episodeData.slug, currentLanguage);
        } finally {
          setQuestionsLoading(false);
        }
      })();
      (async () => {
        try {
          await fetchTranscriptForEpisode(episodeData.slug, currentLanguage);
        } finally {
          setTranscriptLoading(false);
        }
      })();
    }
  }, [currentLanguage, episodeData, fetchQuestionsForEpisode, fetchTranscriptForEpisode]);

  // Keep cache in sync when transcript changes via editing or local updates
  useEffect(() => {
    if (!episodeData || !transcript) return;
    const langForContent = episodeData.lang === 'all' ? currentLanguage : episodeData.lang;
    const payload = {
      id: transcript.id || episodeData.slug,
      status: transcript.status || null,
      data: {
        utterances: transcript.utterances || [],
        words: transcript.words || [],
        text: transcript.text || ''
      }
    };
    const version = computeTranscriptVersionKey(payload);
    writeTranscriptCache(episodeData.slug, langForContent, {
      meta: { id: payload.id, status: payload.status, versionKey: version },
      data: payload.data
    });
  }, [transcript, episodeData, currentLanguage, computeTranscriptVersionKey, writeTranscriptCache]);

  return {
    episodeData,
    questions,
    transcript,
    loading,
    questionsLoading,
    transcriptLoading,
    error,
    questionsUpdatedId,
    fetchEpisodeDetails,
    fetchQuestionsForEpisode,
    fetchTranscriptForEpisode,
    setTranscript,
    setQuestions,
    setQuestionsUpdatedId
  };
};

export default useEpisodeData;
