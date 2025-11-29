/**
 * Deepgram transcription service
 * Based on AssemblyAI service structure
 */

import { supabase } from './supabaseClient';

let DEEPGRAM_API_KEY = null;
const DEEPGRAM_BASE_URL = 'https://api.deepgram.com/v1';

/**
 * Initialize Deepgram API key from Supabase environment variables
 */
const initializeDeepgram = async () => {
  if (DEEPGRAM_API_KEY) {
    return DEEPGRAM_API_KEY;
  }

  try {
    console.debug("🔑 Fetching Deepgram API key from server...");

    const { data, error } = await supabase.functions.invoke('get-env-variables', {
      body: { variable_names: ['DEEPGRAM_API_KEY'] }
    });

    if (error) {
      console.error('❌ Error invoking get-env-variables Edge Function for Deepgram:', error);
      throw new Error(`Deepgram API ключ недоступен: ${error.message}`);
    }

    if (!data || !data.DEEPGRAM_API_KEY) {
      console.error('❌ Deepgram API key not found in Edge Function response:', data);
      throw new Error('Deepgram API ключ не настроен на сервере. Обратитесь к администратору.');
    }

    DEEPGRAM_API_KEY = data.DEEPGRAM_API_KEY;
    console.debug("✅ Deepgram API key received successfully");

    return DEEPGRAM_API_KEY;
  } catch (error) {
    console.error('❌ Error initializing Deepgram:', error);
    throw error;
  }
};

/**
 * Submit audio file for transcription using Deepgram
 */
export const submitTranscription = async (audioUrl, language, episodeSlug, currentLanguage, lang) => {
  try {
    // Initialize API key first
    await initializeDeepgram();

    const response = await fetch(`${DEEPGRAM_BASE_URL}/listen`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${DEEPGRAM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: audioUrl,
        language: language === 'ru' ? 'ru' : language === 'es' ? 'es' : 'en',
        punctuate: true,
        smart_format: true,
        utterances: true,
        diarize: true, // Speaker identification
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Deepgram API error: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();

    // Store transcription metadata in database
    await supabase
      .from('transcripts')
      .upsert({
        episode_slug: episodeSlug,
        lang: lang,
        status: 'processing',
        provider: 'deepgram',
        provider_id: data.metadata?.request_id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'episode_slug,lang' });

    return {
      id: data.metadata?.request_id,
      status: 'processing',
      provider: 'deepgram'
    };

  } catch (error) {
    console.error('Deepgram transcription submission error:', error);
    throw error;
  }
};

/**
 * Check transcription status and get results
 */
export const getTranscriptionStatus = async (requestId) => {
  try {
    // Initialize API key first
    await initializeDeepgram();

    const response = await fetch(`${DEEPGRAM_BASE_URL}/projects/${requestId}`, {
      headers: {
        'Authorization': `Token ${DEEPGRAM_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Deepgram status check failed: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      status: data.status,
      result: data.results
    };

  } catch (error) {
    console.error('Deepgram status check error:', error);
    throw error;
  }
};

/**
 * Process completed transcription and save to database
 */
export const saveTranscriptionResult = async (episodeSlug, lang, transcriptionData) => {
  try {
    // Transform Deepgram response to our format
    const utterances = transcriptionData.utterances || [];
    const words = transcriptionData.words || [];

    const transcriptPayload = {
      episode_slug: episodeSlug,
      lang: lang,
      edited_transcript_data: {
        text: transcriptionData.transcript || '',
        utterances: utterances.map(u => ({
          id: u.id || u.start.toString(),
          start: u.start,
          end: u.end,
          text: u.transcript,
          speaker: u.speaker,
          words: u.words || []
        })),
        words: words.map(w => ({
          text: w.word || w.text,
          start: w.start,
          end: w.end,
          confidence: w.confidence,
          speaker: w.speaker
        }))
      },
      status: 'completed',
      provider: 'deepgram',
      updated_at: new Date().toISOString()
    };

    // Upload raw transcription data to storage
    const fileName = `${episodeSlug}-${lang}-deepgram-raw.json`;
    const rawJson = JSON.stringify(transcriptionData);
    const { error: uploadError } = await supabase.storage
      .from('transcript')
      .upload(fileName, rawJson, {
        contentType: 'application/json',
        upsert: true
      });

    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage
        .from('transcript')
        .getPublicUrl(fileName);
      transcriptPayload.storage_url = publicUrl;
    } else {
      console.warn(`Raw data upload failed for ${episodeSlug}-${lang}:`, uploadError.message);
    }

    const { error } = await supabase
      .from('transcripts')
      .upsert(transcriptPayload, { onConflict: 'episode_slug,lang' });

    if (error) {
      console.error('Error saving Deepgram transcription:', error);
      throw error;
    }

    // Generate AI summary using OpenAI
    try {
      // TODO: Integrate real OpenAI summary generation
      // const summary = await openAIService.generateSummary(transcriptPayload.edited_transcript_data.text);
      // if (summary) {
      //   await supabase
      //     .from('transcripts')
      //     .update({ short_description: summary })
      //     .eq('episode_slug', episodeSlug)
      //     .eq('lang', lang);
      // }
      console.log('Summary generation TODO: implement with openAIService');
    } catch (summaryError) {
      console.warn('Summary generation failed:', summaryError);
    }

    return { success: true };

  } catch (error) {
    console.error('Deepgram result saving error:', error);
    throw error;
  }
};

/**
 * Generate AI summary for transcript
 */
const generateSummary = async (transcriptText) => {
  // This could use OpenAI or another AI service
  try {
    // For now, return a simple summary
    const words = transcriptText.split(' ');
    if (words.length > 100) {
      return transcriptText.substring(0, 500) + '...';
    }
    return null;
  } catch (error) {
    console.warn('Summary generation failed:', error);
    return null;
  }
};

/**
 * Check if transcription is complete and process it
 */
export const checkAndProcessTranscription = async (episodeSlug, lang, requestId) => {
  try {
    const status = await getTranscriptionStatus(requestId);

    if (status.status === 'completed') {
      await saveTranscriptionResult(episodeSlug, lang, status.result);
      return { status: 'completed' };
    } else if (status.status === 'failed') {
      // Update database with error status
      await supabase
        .from('transcripts')
        .update({
          status: 'error',
          updated_at: new Date().toISOString()
        })
        .eq('episode_slug', episodeSlug)
        .eq('lang', lang);

      return { status: 'error', error: 'Transcription failed' };
    }

    return { status: status.status };

  } catch (error) {
    console.error('Transcription checking error:', error);
    throw error;
  }
};

export default {
  submitTranscription,
  getTranscriptionStatus,
  saveTranscriptionResult,
  checkAndProcessTranscription,
  generateSummary
};
