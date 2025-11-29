import { createClient } from '@supabase/supabase-js';
import logger from './logger.js';

const getSupabaseServerClient = () => {
  // Server-side only - check Node.js environment
  if (typeof window !== 'undefined') {
    logger.warn('supabaseServerClient called in browser - using fallback');
    return createClient(
      'https://supabase.dosmundos.pe',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlLWRlbW8iLCJpYXQiOjE2NDE3NjkyMDAsImV4cCI6MTk5OTk5OTk5OX0.A4_N08ZorXYT17zhZReBXPlY6L5-9d8thMbm7TcDWl8'
    );
  }

  const supabaseUrl = process.env.SUPABASE_URL || 'https://supabase.dosmundos.pe';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

const supabase = getSupabaseServerClient();

export const saveFullTranscriptToStorage = async (episodeSlug, lang, transcriptData, provider = 'unknown') => {
  const fileName = `${episodeSlug}_${lang.toUpperCase()}_${provider}.json`;
  const content = JSON.stringify(transcriptData, null, 2);

  logger.info(`Uploading transcript to Supabase Storage: ${fileName}`);

  try {
    // Upload to Supabase Storage 'transcript' bucket (Node.js Buffer for server-side)
    const fileBuffer = Buffer.from(content, 'utf8');
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('transcript')
      .upload(fileName, fileBuffer, {
        contentType: 'application/json',
        upsert: true
      });

    if (uploadError) {
      logger.error('Supabase upload error:', uploadError);
      return { success: false, error: uploadError.message };
    }

    logger.info('Upload successful:', uploadData);

    // Generate public URL
    const { data: urlData } = supabase.storage
      .from('transcript')
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;
    logger.info('Public URL:', publicUrl);

    // Update database
    const { error: dbError } = await supabase
      .from('transcripts')
      .update({
        storage_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('episode_slug', episodeSlug)
      .eq('lang', lang);

    if (dbError) {
      logger.error('Database update error:', dbError);
      return { success: true, url: publicUrl, warning: 'DB update failed' };
    }

    logger.info('✅ Transcript saved to Supabase Storage and DB updated');
    return { success: true, url: publicUrl };

  } catch (error) {
    logger.error('Supabase storage error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Clean up old temp files (older than specified hours)
 * @param {number} maxAgeHours - Maximum age in hours for temp files (default: 1 hour)
 */
export const cleanupTempFiles = async (maxAgeHours = 1) => {
  // Browser safety check
  if (typeof window !== 'undefined') {
    logger.warn('cleanupTempFiles: Not supported in browser environment');
    return { success: false, error: 'Browser environment' };
  }

  try {
    const fs = await import('fs');
    const path = await import('path');

    const tempDir = path.default.join(process.cwd(), 'temp');

    if (!(await fs.promises.access(tempDir).then(() => true).catch(() => false))) {
      logger.debug('Temp directory does not exist, nothing to clean up');
      return { success: true, cleaned: 0 };
    }

    const files = await fs.promises.readdir(tempDir);
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
    const now = Date.now();
    let cleanedCount = 0;

    for (const file of files) {
      const filePath = path.default.join(tempDir, file);
      const stats = await fs.promises.stat(filePath);
      const fileAge = now - stats.mtime.getTime();

      if (fileAge > maxAgeMs) {
        try {
          await fs.promises.unlink(filePath);
          cleanedCount++;
          logger.debug('Cleaned up old temp file:', file);
        } catch (error) {
          logger.warn('Failed to clean up temp file:', file, error.message);
        }
      }
    }

    logger.info(`Temp file cleanup completed: ${cleanedCount} files removed`);
    return { success: true, cleaned: cleanedCount };
  } catch (error) {
    logger.error('Error during temp file cleanup:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Schedule regular temp file cleanup (call this on app startup)
 * @param {number} intervalHours - How often to run cleanup (default: 1 hour)
 */
export const scheduleTempCleanup = (intervalHours = 1) => {
  // Browser safety check
  if (typeof window !== 'undefined') {
    logger.warn('scheduleTempCleanup: Not supported in browser');
    return;
  }

  const intervalMs = intervalHours * 60 * 60 * 1000;

  logger.info(`Scheduling temp file cleanup every ${intervalHours} hour(s)`);

  // Run initial cleanup
  cleanupTempFiles();

  // Schedule regular cleanup
  setInterval(() => {
    cleanupTempFiles();
  }, intervalMs);
};
