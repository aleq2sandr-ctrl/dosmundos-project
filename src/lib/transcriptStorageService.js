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

  if (!supabaseServiceKey) {
    logger.warn('No Supabase service key found, skipping database operations');
    return null;
  }

  try {
    return createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  } catch (error) {
    logger.error('Failed to create Supabase client:', error);
    return null;
  }
};

// VPS Configuration
const VPS_CONFIG = {
  host: process.env.VPS_IP || '72.61.186.175',
  user: process.env.VPS_USER || 'root',
  password: process.env.VPS_PASSWORD || 'Qazsxdc@1234',
  remotePath: '/var/storage/transcript/',
  publicBase: 'https://dosmundos.pe/files/transcript/'
};

const saveToVPS = async (fileName, content) => {
  if (typeof window !== 'undefined') {
    throw new Error('VPS upload not supported in browser');
  }

  const { Client } = await import('ssh2');
  
  return new Promise((resolve, reject) => {
    const conn = new Client();
    
    conn.on('ready', () => {
      logger.info('SSH Connection ready');
      
      conn.sftp((err, sftp) => {
        if (err) {
          conn.end();
          return reject(err);
        }

        const remoteFilePath = `${VPS_CONFIG.remotePath}${fileName}`;
        const writeStream = sftp.createWriteStream(remoteFilePath);
        
        writeStream.on('close', () => {
          logger.info(`✅ VPS upload successful: ${fileName}`);
          conn.end();
          const publicUrl = `${VPS_CONFIG.publicBase}${fileName}`;
          resolve({ success: true, url: publicUrl });
        });
        
        writeStream.on('error', (uploadErr) => {
          logger.error('SFTP upload error:', uploadErr);
          conn.end();
          reject(uploadErr);
        });
        
        writeStream.write(content);
        writeStream.end();
      });
    }).on('error', (connErr) => {
      logger.error('SSH Connection error:', connErr);
      reject(connErr);
    }).connect({
      host: VPS_CONFIG.host,
      port: 22,
      username: VPS_CONFIG.user,
      password: VPS_CONFIG.password,
      readyTimeout: 20000
    });
  });
};

export const saveFullTranscriptToStorage = async (episodeSlug, lang, transcriptData, provider = 'unknown') => {
  const fileName = `${episodeSlug}-${lang.toUpperCase()}-full.json`;
  const content = JSON.stringify(transcriptData, null, 2);
  const fileSizeMB = Buffer.byteLength(content, 'utf8') / (1024 * 1024);

  logger.info(`Saving transcript: ${fileName} (${fileSizeMB.toFixed(2)}MB)`);

  // Always use VPS (Hybrid strategy disabled)
  try {
    logger.info('Attempting VPS upload...');
    const vpsResult = await saveToVPS(fileName, content);
    logger.info('VPS upload successful, updating database...');
    
    // Update database with VPS URL (optional)
    try {
      const supabase = getSupabaseServerClient();
      if (!supabase) {
        logger.warn('No Supabase client available, skipping database update');
        return { success: true, url: vpsResult.url, storage: 'vps', warning: 'Database update skipped - no Supabase client' };
      }

      const { error: dbError } = await supabase
        .from('transcripts')
        .update({
          storage_url: vpsResult.url,
          updated_at: new Date().toISOString()
        })
        .eq('episode_slug', episodeSlug)
        .eq('lang', lang);

      if (dbError) {
        logger.warn('VPS upload OK but DB update failed:', dbError.message);
        // Don't fail the whole request if just DB update fails, return success with warning
        return { success: true, url: vpsResult.url, storage: 'vps', warning: 'DB update failed: ' + dbError.message };
      }

      logger.info('✅ VPS + DB update complete');
      return { success: true, url: vpsResult.url, storage: 'vps' };

    } catch (dbException) {
      logger.error('CRITICAL DB ERROR:', dbException);
      // Return success for the file upload even if DB update crashes
      return { success: true, url: vpsResult.url, storage: 'vps', warning: 'DB update crashed: ' + (dbException.message || 'Unknown error') };
    }

  } catch (vpsError) {
    logger.error('VPS upload failed:', vpsError.message);
    return { success: false, error: `Storage failed: ${vpsError.message}` };
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
