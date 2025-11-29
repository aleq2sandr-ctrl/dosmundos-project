import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import assemblyAIService from '@/lib/assemblyAIService.js';
import { getLocaleString } from '@/lib/locales';
import { processTranscriptData, buildEditedTranscriptData, getFullTextFromUtterances } from '@/hooks/transcript/transcriptProcessingUtils';
import { saveFullTranscriptToStorage } from '@/lib/transcriptStorageService';
import logger from '@/lib/logger';


const useTranscriptAssemblyAI = (
  episodeSlug, 
  episodeAudioUrl, 
  episodeLang, 
  currentLanguage, 
  toast, 
  setTranscriptState, 
  setTranscriptDbIdState, 
  setIsLoadingTranscriptState, 
  setTranscriptErrorState,
  currentTranscriptState,
  currentTranscriptDbId
) => {
  const [isPollingTranscript, setIsPollingTranscript] = useState(false);
  const [transcriptionJobId, setTranscriptionJobId] = useState(null);
  const pollingTimeoutRef = useRef(null);

  const determineAssemblyLangForEpisode = useCallback(() => {
    if (episodeLang === 'ru') return 'ru';
    if (episodeLang === 'es') return 'es';
    return currentLanguage === 'ru' ? 'ru' : 'es';
  }, [episodeLang, currentLanguage]);

  const pollTranscriptStatus = useCallback(async (assemblyId, dbTranscriptId, assemblyLang) => {
    if (isPollingTranscript) return;
    setIsPollingTranscript(true);
    try {
      logger.debug('[useTranscriptAssemblyAI] Poll start', { assemblyId, dbTranscriptId, assemblyLang });
      const result = await assemblyAIService.getTranscriptionResult(assemblyId, currentLanguage);
      if (result.status === 'completed') {
        logger.info('[useTranscriptAssemblyAI] AssemblyAI status completed', { assemblyId, dbTranscriptId });
        setTranscriptState(result);
        toast({ title: getLocaleString('transcriptionCompletedTitle', currentLanguage), description: getLocaleString('transcriptionCompletedDescription', currentLanguage) });

        // 1) Mark status completed immediately with a tiny payload so UI does not look stuck
        try {
          const nowIso = new Date().toISOString();
          logger.debug('[useTranscriptAssemblyAI] Updating DB status to completed', { dbTranscriptId, updated_at: nowIso });
          const { error: statusUpdateError } = await supabase
            .from('transcripts')
            .update({ status: 'completed', updated_at: nowIso })
            .eq('id', dbTranscriptId);
          if (statusUpdateError) throw statusUpdateError;
          logger.info('[useTranscriptAssemblyAI] DB status updated to completed', { dbTranscriptId });

          // Доп. страховка: обновим по (episode_slug, lang), если строка не нашлась по id
          try {
            const { data: tInfo, error: tInfoErr } = await supabase
              .from('transcripts')
              .select('episode_slug, lang')
              .eq('id', dbTranscriptId)
              .single();
            if (!tInfoErr && tInfo) {
              logger.debug('[useTranscriptAssemblyAI] Also marking completed by slug/lang', tInfo);
              const { error: bySlugErr } = await supabase
                .from('transcripts')
                .update({ status: 'completed', updated_at: nowIso })
                .eq('episode_slug', tInfo.episode_slug)
                .eq('lang', tInfo.lang);
              if (bySlugErr) {
                logger.warn('[useTranscriptAssemblyAI] Failed to update by slug/lang (non-fatal)', { message: bySlugErr.message });
              }
            }
          } catch (inner) {
            logger.warn('[useTranscriptAssemblyAI] Supplementary update by slug/lang failed (non-fatal)', { message: inner?.message || String(inner || '') });
          }
        } catch (e) {
          console.warn('Non-fatal: could not set transcript status to completed promptly:', e);
        }

        // 2) In the background, try to save compact edited data (small) + raw to storage + summary
        ;(async () => {
          try {
            const processed = processTranscriptData(result);
            const compactEdited = buildEditedTranscriptData(processed);
            logger.debug('[useTranscriptAssemblyAI] Saving compact edited_transcript_data', { dbTranscriptId, utterances: compactEdited?.utterances?.length || 0, textLen: getFullTextFromUtterances(compactEdited?.utterances || []).length });

            // Get episode_slug and lang for storage filename
            const { data: transcriptInfo, error: infoError } = await supabase
              .from('transcripts')
              .select('episode_slug, lang')
              .eq('id', dbTranscriptId)
              .single();

            if (infoError || !transcriptInfo) {
              logger.warn('[useTranscriptAssemblyAI] Could not get transcript info:', infoError?.message);
            } else {
              // Upload raw result to storage
              const fileName = `${transcriptInfo.episode_slug}-${transcriptInfo.lang}-assemblyai-raw.json`;
              const rawJson = JSON.stringify(result);
              const { error: uploadError } = await supabase.storage
                .from('transcript')
                .upload(fileName, rawJson, {
                  contentType: 'application/json',
                  upsert: true
                });

              let storageUrl = null;
              if (!uploadError) {
                const { data: { publicUrl } } = supabase.storage
                  .from('transcript')
                  .getPublicUrl(fileName);
                storageUrl = publicUrl;
                logger.info('[useTranscriptAssemblyAI] Raw uploaded:', storageUrl);
              } else {
                logger.warn(`Raw upload failed:`, uploadError.message);
              }

              // Update with edited + storage_url
              const updatePayload = { edited_transcript_data: compactEdited };
              if (storageUrl) {
                updatePayload.storage_url = storageUrl;
              }
              const { error: editUpdateError } = await supabase
                .from('transcripts')
                .update(updatePayload)
                .eq('id', dbTranscriptId);
              
              if (editUpdateError) {
                console.warn('Warning: Could not update edited_transcript_data/storage_url:', editUpdateError);
              } else {
                logger.info('[useTranscriptAssemblyAI] edited_transcript_data and storage_url saved', { dbTranscriptId });
              }
            }
          } catch (e) {
            console.warn('Non-fatal: error building/saving compact edited transcript/storage:', e?.message || e);
          }
        })();

        // 3) Save full transcript to storage (replaces chunking)
        ;(async () => {
          try {
            // Получаем episode_slug и lang 
            const { data: transcriptInfo, error: infoError } = await supabase
              .from('transcripts')
              .select('episode_slug, lang')
              .eq('id', dbTranscriptId)
              .single();
            
            if (infoError || !transcriptInfo) {
              logger.warn('[useTranscriptAssemblyAI] Could not get transcript info for storage save:', infoError?.message);
              return;
            }
            
            await saveFullTranscriptToStorage(
              transcriptInfo.episode_slug, 
              transcriptInfo.lang, 
              result
            );
            
            logger.info('[useTranscriptAssemblyAI] Full transcript saved to storage successfully', { dbTranscriptId });
          } catch (e) {
            logger.warn('[useTranscriptAssemblyAI] Non-fatal error saving full transcript to storage:', e?.message || e);
          }
        })();
      } else if (result.status === 'error') {
        const errorMessage = result.error || getLocaleString('unknownAssemblyError', currentLanguage);
        logger.error('[useTranscriptAssemblyAI] AssemblyAI returned error', { assemblyId, errorMessage });
        setTranscriptErrorState(getLocaleString('transcriptionErrorAssembly', currentLanguage) + `: ${errorMessage}`);
        toast({ title: getLocaleString('transcriptionErrorTitle', currentLanguage), description: getLocaleString('transcriptionErrorAssembly', currentLanguage) + `: ${errorMessage}`, variant: 'destructive' });
        await supabase.from('transcripts').update({ status: 'error' }).eq('id', dbTranscriptId);
      } else {
        logger.debug('[useTranscriptAssemblyAI] AssemblyAI intermediate status', { status: result.status, assemblyId });
        pollingTimeoutRef.current = setTimeout(() => pollTranscriptStatus(assemblyId, dbTranscriptId, assemblyLang), 15000);
      }
    } catch (err) {
      logger.error('[useTranscriptAssemblyAI] Polling exception', { assemblyId, message: err?.message || String(err || '') });
      toast({ title: getLocaleString('errorGeneric', currentLanguage), description: getLocaleString('errorPollingTranscript', currentLanguage), variant: 'destructive' });
    } finally {
      setIsPollingTranscript(false);
    }
  }, [isPollingTranscript, toast, currentLanguage, setTranscriptState, setTranscriptErrorState]);

  const handleStartTranscription = useCallback(async (langCodeForAssembly = null, audioUrlForTranscription = null, existingDbTranscriptEntry = null) => {
    if (!episodeSlug || (!episodeAudioUrl && !audioUrlForTranscription)) {
      toast({ title: getLocaleString('errorGeneric', currentLanguage), description: getLocaleString('missingEpisodeOrUrl', currentLanguage), variant: 'destructive' });
      return;
    }
    
    if (transcriptionJobId && (existingDbTranscriptEntry?.status === 'processing' || existingDbTranscriptEntry?.status === 'queued')) {
        console.log("Transcription request already sent and in progress. Skipping new request.");
        return;
    }

    const finalAudioUrl = audioUrlForTranscription || episodeAudioUrl;
    setIsLoadingTranscriptState(true);
    setTranscriptErrorState(null);
    
    const assemblyLangToUse = langCodeForAssembly || determineAssemblyLangForEpisode();
    const transcriptLangForDb = episodeLang === 'all' ? currentLanguage : episodeLang;

    try {
      const job = await assemblyAIService.submitTranscription(finalAudioUrl, assemblyLangToUse, episodeSlug, currentLanguage, transcriptLangForDb);
      setTranscriptionJobId(job.id);

      let dbOp = existingDbTranscriptEntry?.id
        ? supabase.from('transcripts').update({ provider_id: job.id, status: job.status, lang: transcriptLangForDb, updated_at: new Date().toISOString() }).eq('id', existingDbTranscriptEntry.id)
        : supabase.from('transcripts').insert([{ episode_slug: episodeSlug, lang: transcriptLangForDb, provider_id: job.id, status: job.status }]);
      
      // Retry logic for large payloads
      let retryCount = 0;
      const maxRetries = 3;
      let newDbTranscriptId = existingDbTranscriptEntry?.id || null;
      
      while (retryCount < maxRetries) {
        try {
          const { error: dbError, data: transcriptEntries } = await dbOp.select('id, edited_transcript_data').single();
          if (dbError) throw dbError;
          if (!transcriptEntries) throw new Error("Failed to get transcript entry ID from DB operation.");
          newDbTranscriptId = transcriptEntries.id;
          setTranscriptDbIdState(newDbTranscriptId);
          break; // Success, exit retry loop
        } catch (err) {
          retryCount++;
          if (retryCount >= maxRetries) {
            throw err;
          } else {
            console.warn(`Retry ${retryCount}/${maxRetries} for transcript start:`, err.message);
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
          }
        }
      }

      if (job.status === 'queued' || job.status === 'processing') {
        toast({ title: getLocaleString('transcriptionSubmittedTitle', currentLanguage), description: getLocaleString('transcriptionSubmittedDescription', currentLanguage, { lang: assemblyLangToUse }) });
        if (pollingTimeoutRef.current) clearTimeout(pollingTimeoutRef.current);
        if (newDbTranscriptId) {
          pollTranscriptStatus(job.id, newDbTranscriptId, assemblyLangToUse);
        }
      } else if (job.status === 'error') {
        const errorMessage = job.error || getLocaleString('unknownAssemblyError', currentLanguage);
        setTranscriptErrorState(getLocaleString('transcriptionErrorAssembly', currentLanguage) + `: ${errorMessage}`);
        if (newDbTranscriptId) {
          await supabase.from('transcripts').update({ status: 'error' }).eq('id', newDbTranscriptId);
        }
      }
    } catch (err) {
      setTranscriptErrorState(getLocaleString('errorStartingTranscription', currentLanguage, { errorMessage: err.message }));
      toast({ title: getLocaleString('errorGeneric', currentLanguage), description: err.message, variant: 'destructive' });
    } finally {
      setIsLoadingTranscriptState(false);
    }
  }, [
      episodeSlug, 
      episodeAudioUrl, 
      toast, 
      currentLanguage, 
      determineAssemblyLangForEpisode, 
      pollTranscriptStatus, 
      episodeLang, 
      transcriptionJobId,
      setIsLoadingTranscriptState,
      setTranscriptErrorState,
      setTranscriptDbIdState
    ]);

  useEffect(() => {
    return () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
    };
  }, []);

  return {
    isPollingTranscript,
    setIsPollingTranscript,
    transcriptionJobId,
    setTranscriptionJobId,
    pollingTimeoutRef,
    determineAssemblyLangForEpisode,
    pollTranscriptStatus,
    handleStartTranscription,
  };
};

export default useTranscriptAssemblyAI;
