
import { supabase } from '@/lib/supabaseClient';
import { getLocaleString } from '@/lib/locales';
import storageRouter from '@/lib/storageRouter';
import assemblyAIService from '@/lib/assemblyAIService';
import { parseQuestionsFromDescriptionString } from '@/lib/podcastService';
import { translateTextOpenAI } from '@/lib/openAIService';
import { startPollingForItem } from './transcriptPoller';

/**
 * Start transcription manually (called from UI button)
 */
export const startManualTranscription = async ({
  audioUrl,
  episodeSlug,
  lang,
  currentLanguage,
  toast
}) => {
  try {
    const assemblyLangCode = lang === 'es' ? 'es' : lang === 'ru' ? 'ru' : 'en';
    
    const transcriptJob = await assemblyAIService.submitTranscription(
      audioUrl,
      assemblyLangCode,
      episodeSlug,
      currentLanguage,
      lang
    );

    // Save to database
    const transcriptPayload = {
      episode_slug: episodeSlug,
      lang: lang,
      assemblyai_transcript_id: transcriptJob.id,
      status: transcriptJob.status,
      updated_at: new Date().toISOString(),
      edited_transcript_data: null 
    };
    
    const { error: transcriptDbError } = await supabase
      .from('transcripts')
      .upsert(transcriptPayload, { onConflict: 'episode_slug, lang' })
      .select()
      .maybeSingle();

    if (transcriptDbError) {
      throw new Error(`Database error: ${transcriptDbError.message}`);
    }

    return {
      success: true,
      transcriptJob
    };
  } catch (error) {
    console.error('Manual transcription start error:', error);
    throw error;
  }
};

export const processSingleItem = async ({
  itemData,
  forceOverwrite = false,
  updateItemState,
  currentLanguage,
  toast,
  openOverwriteDialog, 
  pollingIntervalsRef,
  getAllItems,
  overwriteOptions = null,
}) => {
  updateItemState(itemData.id, { 
    isUploading: true, 
    uploadProgress: 0, 
    uploadError: null, 
    uploadComplete: false,
    transcriptionStatus: null,
    transcriptionError: null,
  });
  
  const { file, episodeSlug, episodeTitle, lang, parsedDate, timingsText, sourceLangForEn, originalFileId, fileGroupId, isSingleTrackFile } = itemData;

  // Check if another item in the same group already uploaded the file
  let sharedAudioUrl = null;
  let sharedR2Key = null;
  
  if (isSingleTrackFile && fileGroupId) {
    const allItems = getAllItems();
    const groupItems = allItems.filter(item => item.fileGroupId === fileGroupId && item.id !== itemData.id);
    const uploadedItem = groupItems.find(item => item.uploadedAudioUrl && item.r2FileKey);
    
    if (uploadedItem) {
      sharedAudioUrl = uploadedItem.uploadedAudioUrl;
      sharedR2Key = uploadedItem.r2FileKey;
      console.log(`Reusing uploaded audio from group ${fileGroupId}: ${sharedAudioUrl}`);
    }
  }

  if (!episodeSlug) {
    updateItemState(itemData.id, { isUploading: false, uploadError: "Не удалось определить SLUG." });
    return { success: false, requiresDialog: false };
  }

  let workerFileUrl = sharedAudioUrl;
  let r2FileKey = sharedR2Key;
  let bucketNameUsed;
  let userConfirmedOverwriteGlobal = forceOverwrite;
  let userOverwriteChoices = overwriteOptions || null;
  
  // Handle remote files
  if (itemData.isRemote && itemData.publicUrl) {
    workerFileUrl = itemData.publicUrl;
    r2FileKey = itemData.publicUrl.split('/').pop();
    bucketNameUsed = 'hostinger';
    console.log(`Using remote URL: ${workerFileUrl}`);
  }
  
  // Skip upload if we're reusing shared audio
  const skipUpload = !!(sharedAudioUrl && sharedR2Key);

  try {
    if (!skipUpload && !forceOverwrite) {
      // V3: Check episode_audios instead of episodes
      const { data: existingAudio, error: checkError } = await supabase
        .from('episode_audios')
        .select('audio_url')
        .eq('episode_slug', episodeSlug)
        .eq('lang', lang)
        .maybeSingle();

      if (checkError) {
         console.error("Supabase check audio error:", checkError);
         throw new Error(getLocaleString('errorCheckingEpisodeDB', currentLanguage, {errorMessage: checkError.message}));
      }

      if (existingAudio) {
        const userConfirmedDialog = await openOverwriteDialog(itemData);
        if (!userConfirmedDialog) {
          updateItemState(itemData.id, { isUploading: false, uploadError: getLocaleString('uploadCancelledEpisodeExists', currentLanguage) });
          return { success: false, requiresDialog: true };
        }
        // If dialog returned object with choices, capture
        if (typeof userConfirmedDialog === 'object' && userConfirmedDialog !== null) {
          userOverwriteChoices = userConfirmedDialog;
        } else {
          userOverwriteChoices = null;
        }
        userConfirmedOverwriteGlobal = true; 
        
        console.log("Found existing audio in DB:", {
          slug: episodeSlug,
          audio_url: existingAudio.audio_url
        });
        // Don't use old URLs from DB when overwriting - they might be outdated
        // We'll determine the correct URL based on overwrite choices
        if (userOverwriteChoices && userOverwriteChoices.overwriteServerFile) {
          // Will upload new file and get new URL
          workerFileUrl = null;
          r2FileKey = null;
          bucketNameUsed = null;
        } else {
          // Use existing file info
          workerFileUrl = existingAudio.audio_url;
          // r2FileKey and bucketNameUsed are no longer stored/needed from DB
          r2FileKey = null; 
          bucketNameUsed = null;
        }
      }
    }
    
    // Выбираем, загружать ли файл на сервер
    const overwriteChoices = userOverwriteChoices || null;
    const shouldUpload =
      !skipUpload &&
      (
        !workerFileUrl || // Нет готового URL (например, новая запись)
        (overwriteChoices && overwriteChoices.overwriteServerFile) // Пользователь выбрал пере-заливку файла
      );

    if (shouldUpload) {
      const { fileUrl: uploadedUrl, fileKey: uploadedKey, bucketName: uploadedBucket } = await storageRouter.uploadFile(
        file,
        (progress, details) => updateItemState(itemData.id, { 
          uploadProgress: progress,
          uploadProgressDetails: details
        }),
        currentLanguage,
        file.name 
      );
      workerFileUrl = uploadedUrl;
      r2FileKey = uploadedKey;
      bucketNameUsed = uploadedBucket;
    } else if (userConfirmedOverwriteGlobal && workerFileUrl) {
      // Пользователь решил не перезаписывать серверный файл — используем существующий URL
      updateItemState(itemData.id, { uploadProgress: 100 });
      toast({ title: getLocaleString('usingExistingR2FileTitle', currentLanguage), description: getLocaleString('usingExistingR2FileDesc', currentLanguage, { fileName: r2FileKey || 'existing' }), variant: "info" });
    }
    
    if (userConfirmedOverwriteGlobal) {
       updateItemState(itemData.id, { uploadError: null, transcriptionStatus: getLocaleString('overwritingDbData', currentLanguage) });
       const choices = userOverwriteChoices || { overwriteServerFile: true, overwriteEpisodeInfo: true, overwriteTranscript: true, overwriteQuestions: true };
       
       if (choices.overwriteQuestions) {
         // V3: Use timecodes table
         const { error: qDelError } = await supabase.from('timecodes').delete().eq('episode_slug', episodeSlug).eq('lang', lang);
         if (qDelError) console.warn(`Error deleting old timecodes for ${episodeSlug} (${lang}): ${qDelError.message}`);
       }
       if (choices.overwriteTranscript) {
         const { error: tDelError } = await supabase.from('transcripts').delete().eq('episode_slug', episodeSlug).eq('lang', lang);
         if (tDelError) console.warn(`Error deleting old transcripts for ${episodeSlug} (${lang}): ${tDelError.message}`);
       }
       
       toast({title: getLocaleString('overwritingEpisodeTitle', currentLanguage), description: getLocaleString('overwritingEpisodeDesc', currentLanguage, {slug: episodeSlug})});
    }
    
    let duration = 0;
    const audioForDuration = new Audio();
    let objectUrlToRevoke = null;

    if (itemData.isRemote && workerFileUrl) {
      audioForDuration.src = workerFileUrl;
      // Try to get duration for remote file. 
      // Note: This might fail if CORS headers are missing on the remote server.
      audioForDuration.crossOrigin = "anonymous"; 
    } else if (file && !itemData.isRemote) {
      try {
        objectUrlToRevoke = URL.createObjectURL(file);
        audioForDuration.src = objectUrlToRevoke;
      } catch (e) {
        console.error("Error creating object URL:", e);
      }
    }

    if (audioForDuration.src) {
      try {
        duration = await new Promise((resolve, reject) => {
          audioForDuration.onloadedmetadata = () => resolve(audioForDuration.duration);
          audioForDuration.onerror = (e) => {
            console.warn("Audio metadata load error:", e);
            // For remote files, failure to load metadata (e.g. CORS) shouldn't stop the process
            if (itemData.isRemote) resolve(0);
            else reject(new Error(getLocaleString('audioMetadataError', currentLanguage)));
          };
          // Longer timeout for remote files
          setTimeout(() => reject(new Error('Timeout getting audio duration')), itemData.isRemote ? 20000 : 7000);
        });
      } catch (e) { 
        console.error("Error getting duration", e); 
        duration = 0; 
        if (!itemData.isRemote) {
          toast({ title: getLocaleString('warning', currentLanguage), description: getLocaleString('audioMetadataError', currentLanguage) + " " + e.message, variant: "destructive" });
        }
      } finally {
        if (objectUrlToRevoke) {
          URL.revokeObjectURL(objectUrlToRevoke);
        }
      }
    }

    // Provide fallback date if parsedDate is null to avoid database constraint violation
    const episodeDate = parsedDate || new Date().toISOString().split('T')[0];

    // V3: Split payload into parts
    // 1. Main Episode
    const episodePayload = {
      slug: episodeSlug,
      date: episodeDate,
      updated_at: new Date().toISOString()
    };
    
    let upsertedEpisode = { slug: episodeSlug };

    if (userConfirmedOverwriteGlobal) {
      const choices = userOverwriteChoices || { overwriteEpisodeInfo: true };
      if (choices.overwriteEpisodeInfo) {
        // Upsert Episode
        const { error: epError } = await supabase
          .from('episodes')
          .upsert(episodePayload, { onConflict: 'slug' });
        
        if (epError) throw new Error(getLocaleString('supabaseEpisodeError', currentLanguage, {errorMessage: epError.message}));

        // Upsert Translation (Title)
        const { error: transError } = await supabase
          .from('episode_translations')
          .upsert({
            episode_slug: episodeSlug,
            lang: lang,
            title: episodeTitle,
            updated_at: new Date().toISOString()
          }, { onConflict: 'episode_slug,lang' });
          
        if (transError) console.warn('Error upserting translation:', transError);

        // Upsert Audio
        const { error: audioError } = await supabase
          .from('episode_audios')
          .upsert({
            episode_slug: episodeSlug,
            lang: lang,
            audio_url: workerFileUrl,
            duration: Math.round(duration)
          }, { onConflict: 'episode_slug,lang' });

        if (audioError) console.warn('Error upserting audio:', audioError);

      } else {
        // Just check existence
        const fetchRes = await supabase
          .from('episodes')
          .select('slug')
          .eq('slug', episodeSlug)
          .maybeSingle();
        if (fetchRes.error) throw new Error(getLocaleString('supabaseEpisodeError', currentLanguage, {errorMessage: fetchRes.error.message}));
        upsertedEpisode = fetchRes.data || { slug: episodeSlug };
      }
    } else {
      // New Episode Logic
      // Upsert Episode
      const { error: epError } = await supabase
        .from('episodes')
        .upsert(episodePayload, { onConflict: 'slug' });
      
      if (epError) throw new Error(getLocaleString('supabaseEpisodeError', currentLanguage, {errorMessage: epError.message}));

      // Upsert Translation
      await supabase.from('episode_translations').upsert({
        episode_slug: episodeSlug,
        lang: lang,
        title: episodeTitle,
        updated_at: new Date().toISOString()
      }, { onConflict: 'episode_slug,lang' });

      // Upsert Audio
      await supabase.from('episode_audios').upsert({
        episode_slug: episodeSlug,
        lang: lang,
        audio_url: workerFileUrl,
        duration: Math.round(duration)
      }, { onConflict: 'episode_slug,lang' });
    }
    
    if (timingsText.trim() && upsertedEpisode.slug) {
      const choices = userOverwriteChoices || { overwriteTranscript: true, overwriteQuestions: true };
      // Insert questions if opted-in
      if (choices.overwriteQuestions) {
      let questionsToInsert = parseQuestionsFromDescriptionString(timingsText, lang, upsertedEpisode.slug);
      
      const logTranslatedQuestions = async (questions, currentSlug, enSlug) => {
        try {
          console.log(`[logTranslatedQuestions] Starting translation for ${questions.length} questions from ${currentSlug} to ${enSlug}`);
          
          // Переводим только заголовки вопросов, сохраняя исходное время
          const translatedQuestionsForEn = await Promise.all(questions.map(async (q) => {
            const prompt = `Переведи следующий заголовок вопроса с испанского на английский язык. Верни только переведенный текст без кавычек и дополнительных символов: "${q.title}"`;
            const translatedTitle = await translateTextOpenAI(prompt, 'en');
            
            console.log(`[logTranslatedQuestions] Question translation:`, {
              original: { title: q.title, time: q.time },
              translated: { title: translatedTitle.trim(), time: q.time }
            });
            
            return {
              episode_slug: enSlug, // V3: Same slug, different lang
              lang: 'en',
              title: translatedTitle.trim(),
              time: q.time // Сохраняем исходное время без изменений
            };
          }));

          if (translatedQuestionsForEn.length > 0) {
            // V3: Use timecodes table
            const { error: enQDelError } = await supabase.from('timecodes').delete().eq('episode_slug', enSlug).eq('lang', 'en');
            if (enQDelError) console.warn(`Error deleting old EN questions for ${enSlug}: ${enQDelError.message}`);
            
            const { error: enQError } = await supabase.from('timecodes').insert(translatedQuestionsForEn).select();
            if (enQError) console.warn(`Error saving translated EN questions for ${enSlug}: ${enQError.message}`);
            else {
              toast({title: "English Questions Translated", description: `Questions for ${enSlug} translated to English.`, variant: "default"});
            }
          }
        } catch (translationError) {
          console.error("Error translating questions to English:", translationError);
          toast({title: "English Question Translation Error", description: translationError.message, variant: "destructive"});
        }
      };

      if (lang === 'es' && getAllItems) {
        const allCurrentItems = getAllItems();
        const correspondingEnItem = allCurrentItems.find(item => item.originalFileId === originalFileId && item.lang === 'en' && item.sourceLangForEn === 'es');
        if (correspondingEnItem) {
          // V3: Pass the same slug for EN, as slugs are now language-agnostic
          await logTranslatedQuestions(questionsToInsert, episodeSlug, episodeSlug);
        }
      }

      if (questionsToInsert.length > 0) {
        // V3: Use timecodes table
        const { error: questionsError } = await supabase.from('timecodes').insert(questionsToInsert).select();
        if (questionsError) console.warn(`Error saving questions for ${episodeSlug} (${lang}): ${questionsError.message}`);
      }
      }
    }

    if (upsertedEpisode.slug) {
      updateItemState(itemData.id, { transcriptionStatus: getLocaleString('startingTranscription', currentLanguage) });
      
      const { data: existingTranscript, error: transcriptCheckError } = await supabase
        .from('transcripts')
        .select('status, assemblyai_transcript_id')
        .eq('episode_slug', upsertedEpisode.slug)
        .eq('lang', lang)
        .maybeSingle();

      if (transcriptCheckError && transcriptCheckError.code !== 'PGRST116') {
        throw new Error(getLocaleString('supabaseTranscriptError', currentLanguage, { errorMessage: transcriptCheckError.message }));
      }

      let shouldSubmitTranscription = true;
      if (existingTranscript && !userConfirmedOverwriteGlobal) {
        if (existingTranscript.status === 'completed') {
          shouldSubmitTranscription = false;
          updateItemState(itemData.id, { transcriptionStatus: 'completed' });
          toast({ title: getLocaleString('transcriptionExistsTitle', currentLanguage), description: getLocaleString('transcriptionExistsDesc', currentLanguage, {episode: episodeTitle}), variant: 'info' });
        } else if (existingTranscript.status === 'processing' || existingTranscript.status === 'queued') {
          shouldSubmitTranscription = false;
          updateItemState(itemData.id, { transcriptionStatus: existingTranscript.status });
          startPollingForItem(itemData, updateItemState, currentLanguage, toast, pollingIntervalsRef, getAllItems);
        }
      }
      
      if (lang === 'en' && sourceLangForEn === 'es') {
        shouldSubmitTranscription = false;
        updateItemState(itemData.id, { transcriptionStatus: 'pending_translation_from_es' });
        const { error: transcriptDbError } = await supabase
          .from('transcripts')
          .upsert({
            episode_slug: episodeSlug,
            lang: 'en',
            status: 'pending_translation_from_es',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'episode_slug, lang' });

        if (transcriptDbError) {
           if(transcriptDbError.message.includes('constraint matching the ON CONFLICT specification')) {
            console.warn("ON CONFLICT failed for pending_translation_from_es, likely due to missing unique constraint on (episode_slug, lang). This may be okay if poller handles it.");
          } else {
            throw new Error(getLocaleString('supabaseTranscriptError', currentLanguage, { errorMessage: transcriptDbError.message }));
          }
        }
      }

      // AUTO-TRANSCRIPTION DISABLED: Now handled manually via TranscriptionButton
      // Store audio URL for manual transcription
      updateItemState(itemData.id, { 
        uploadedAudioUrl: workerFileUrl,
        r2FileKey: r2FileKey,
        transcriptionStatus: 'not_started' 
      });
      
      console.log(`Upload complete for ${episodeSlug}. Transcription can be started manually from UI.`);
    }
    updateItemState(itemData.id, { isUploading: false, uploadComplete: true, uploadProgress: 100 });
    return { success: true, requiresDialog: false };
  } catch (error) {
    console.error(`Upload process error for ${file.name} (${lang}):`, error);
    updateItemState(itemData.id, { isUploading: false, uploadError: error.message, transcriptionStatus: 'error' });
    return { success: false, requiresDialog: false };
  }
};
