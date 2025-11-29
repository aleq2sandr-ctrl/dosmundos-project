import { supabase } from './supabaseClient';
import logger from './logger';

const STORAGE_BUCKET = 'transcript';

export const saveFullTranscriptToStorage = async (episodeSlug, lang, transcriptData) => {
  try {
    const fileName = `${episodeSlug}-${lang}-full.json`;
    const content = JSON.stringify(transcriptData);
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, content, {
        upsert: true,
        contentType: 'application/json'
      });
    if (error) {
      logger.error('Upload error', error);
      throw error;
    }
    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(fileName);
    await supabase
      .from('transcripts')
      .update({ 
        storage_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('episode_slug', episodeSlug)
      .eq('lang', lang);
    logger.info('Full transcript saved to storage:', publicUrl);
    return { success: true, url: publicUrl };
  } catch (e) {
    logger.error('Storage save error:', e);
    return { success: false, error: e.message };
  }
};
