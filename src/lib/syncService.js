import { supabase } from './supabaseClient';
import offlineDataService from './offlineDataService';
import logger from './logger';
import { getFullTextFromUtterances } from '@/hooks/transcript/transcriptProcessingUtils';
import { sanitizeTranscriptForSave, isCompatibleWithDatabase } from './transcriptValidator.js';

class SyncService {
  constructor() {
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;
    this.syncListeners = [];
    this.networkListeners = [];
    this.lastNetworkCheck = Date.now();
    
    // Инициализация слушателей сетевых событий
    this.initNetworkListeners();
    
    // Автоматическая синхронизация при восстановлении соединения
    this.setupAutoSync();
  }

  // Инициализация слушателей сетевых событий
  initNetworkListeners() {
    window.addEventListener('online', () => {
      logger.info('[Sync] Network connection restored');
      this.isOnline = true;
      this.lastNetworkCheck = Date.now();
      this.notifyNetworkListeners(true);
      this.syncOfflineChanges();
    });

    window.addEventListener('offline', () => {
      logger.warn('[Sync] Network connection lost');
      this.isOnline = false;
      this.lastNetworkCheck = Date.now();
      this.notifyNetworkListeners(false);
    });

    // Проверка соединения каждые 30 секунд
    setInterval(() => {
      this.checkConnection();
    }, 30000);
  }

  // Настройка автоматической синхронизации
  setupAutoSync() {
    // Синхронизация при загрузке страницы, если онлайн
    if (this.isOnline) {
      setTimeout(() => this.syncOfflineChanges(), 1000);
    }

    // Периодическая синхронизация каждые 5 минут
    setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.syncOfflineChanges();
      }
    }, 5 * 60 * 1000);
  }

  // Проверка соединения
  async checkConnection() {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 5000);
      const response = await fetch('/ping', { 
        method: 'HEAD', 
        cache: 'no-cache',
        signal: controller.signal
      });
      clearTimeout(id);
      
      const wasOnline = this.isOnline;
      this.isOnline = response.ok;
      this.lastNetworkCheck = Date.now();
      
      if (!wasOnline && this.isOnline) {
        logger.info('[Sync] Connection restored via ping');
        this.notifyNetworkListeners(true);
        this.syncOfflineChanges();
      } else if (wasOnline && !this.isOnline) {
        logger.warn('[Sync] Connection lost via ping');
        this.notifyNetworkListeners(false);
      }
    } catch (error) {
      if (this.isOnline) {
        logger.warn('[Sync] Connection lost via ping error');
        this.isOnline = false;
        this.notifyNetworkListeners(false);
      }
      this.lastNetworkCheck = Date.now();
    }
  }


  // Уведомление слушателей сетевых событий
  notifyNetworkListeners(isOnline) {
    this.networkListeners.forEach(callback => {
      try {
        callback(isOnline);
      } catch (error) {
        console.error('Error in network listener:', error);
      }
    });
  }

  // Уведомление слушателей синхронизации
  notifySyncListeners(event, data = null) {
    this.syncListeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Error in sync listener:', error);
      }
    });
  }


  // Сохранение данных с автоматической синхронизацией
  async saveData(type, data, operation = 'update') {
    try {
      await offlineDataService.init();
    } catch (error) {
      logger.error('[Sync] Failed to initialize offline service:', error);
      throw new Error(`Не удалось инициализировать оффлайн сервис: ${error.message}`);
    }

    try {
      // Сохраняем локально
      switch (type) {
        case 'episode':
          await offlineDataService.saveEpisode(data);
          break;
        case 'transcript':
          await offlineDataService.saveTranscript(data);
          break;
        case 'timecodes':
          await offlineDataService.saveQuestions(data.questions, data.episodeSlug, data.lang);
          break;
        default:
          throw new Error(`Неизвестный тип данных: ${type}`);
      }

      // Если онлайн, пытаемся синхронизировать сразу
      if (this.isOnline) {
        try {
          await this.syncDataToServer(type, data, operation);
        } catch (error) {
          logger.warn('[Sync] Immediate sync failed, adding to queue:', error);
          await offlineDataService.addToSyncQueue(type, data, operation);
        }
      } else {
        // Если офлайн, добавляем в очередь синхронизации
        await offlineDataService.addToSyncQueue(type, data, operation);
      }

      return { success: true, offline: !this.isOnline };
    } catch (error) {
      logger.error('[Sync] Failed to save data:', error);
      
      // Если не удалось сохранить локально, проверяем корректность данных перед добавлением в очередь
      if (type === 'transcript' && !isCompatibleWithDatabase(data)) {
        logger.error('[Sync] Cannot add invalid transcript to sync queue:', data.id);
        throw new Error(`Invalid transcript ID: ${data.id}. Cannot sync invalid data.`);
      }
      
      try {
        await offlineDataService.addToSyncQueue(type, data, operation);
        logger.info('[Sync] Data added to sync queue after local save failure');
      } catch (queueError) {
        logger.error('[Sync] Failed to add to sync queue:', queueError);
      }
      
      throw error;
    }
  }

  // Загрузка данных с поддержкой офлайн
  async loadData(type, params) {
    await offlineDataService.init();

    try {
      // Если онлайн, пытаемся загрузить с сервера
      if (this.isOnline) {
        try {
          const serverData = await this.loadDataFromServer(type, params);
          
          // Сохраняем в локальный кеш
          switch (type) {
            case 'episode':
              // Проверяем, что данные эпизода корректны
              if (serverData && typeof serverData === 'object' && serverData.slug) {
                await offlineDataService.saveEpisode(serverData);
              } else {
                console.warn('[Sync] Invalid episode data:', serverData);
              }
              break;
            case 'transcript': {
              // Проверяем и исправляем данные транскрипта перед сохранением
              if (serverData && typeof serverData === 'object') {
                // Убеждаемся, что у транскрипта есть необходимые поля
                const validTranscript = {
                  id: serverData.id,
                  episode_slug: serverData.episode_slug || params.episodeSlug,
                  lang: serverData.lang || params.lang,
                  utterances: Array.isArray(serverData.utterances) ? serverData.utterances : (serverData.edited_transcript_data?.utterances || []),
                  words: Array.isArray(serverData.words) ? serverData.words : (serverData.edited_transcript_data?.words || []),
                  text: serverData.text || serverData.edited_transcript_data?.text || '',
                  status: serverData.status || 'completed',
                  created_at: serverData.created_at || new Date().toISOString(),
                  updated_at: serverData.updated_at || new Date().toISOString(),
                  edited_transcript_data: serverData.edited_transcript_data || null
                };
                await offlineDataService.saveTranscript(validTranscript);
              }
              break;
            }
            case 'timecodes':
              // Проверяем, что вопросы - это массив
              if (Array.isArray(serverData)) {
                await offlineDataService.saveQuestions(
                  serverData, 
                  params.episodeSlug, 
                  params.lang
                );
              } else {
                console.warn('[Sync] Questions data is not an array:', serverData);
                await offlineDataService.saveQuestions(
                  [], 
                  params.episodeSlug, 
                  params.lang
                );
              }
              break;
          }
          
          return { data: serverData, source: 'server' };
        } catch (error) {
          // Check if this is an HTTP/2 protocol error
          const isHttp2Error = error.message.includes('HTTP2') || 
                              error.message.includes('ERR_HTTP2_PROTOCOL_ERROR') ||
                              error.message.includes('Failed to fetch');
          
          if (isHttp2Error) {
            logger.warn('[Sync] HTTP/2 protocol error detected, falling back to cache:', {
              error: error.message,
              type,
              params
            });
          } else {
            logger.warn('[Sync] Server load failed, trying cache:', error);
          }
        }
      }

      // Загружаем из локального кеша
      let cachedData;
      try {
        switch (type) {
          case 'episode':
            cachedData = await offlineDataService.getEpisode(params.slug);
            break;
          case 'transcript':
            cachedData = await offlineDataService.getTranscript(params.episodeSlug, params.lang);
            break;
          case 'timecodes':
            cachedData = await offlineDataService.getQuestions(params.episodeSlug, params.lang);
            break;
          case 'episodes':
            cachedData = await offlineDataService.getAllEpisodes();
            break;
        }
      } catch (cacheError) {
        logger.warn(`[Sync] Cache load failed for ${type}:`, cacheError);
        cachedData = null;
      }

      if (cachedData) {
        return { data: cachedData, source: 'cache' };
      }

      throw new Error(`No ${type} data available offline`);
    } catch (error) {
      logger.error(`[Sync] Failed to load ${type}:`, error);
      throw error;
    }
  }

  // Синхронизация данных с сервером
  async syncDataToServer(type, data, operation) {
    switch (type) {
      case 'transcript':
        return await this.syncTranscriptToServer(data, operation);
      case 'timecodes':
        return await this.syncQuestionsToServer(data, operation);
      case 'episode':
        return await this.syncEpisodeToServer(data, operation);
      default:
        throw new Error(`Unknown sync type: ${type}`);
    }
  }

  // Загрузка данных с сервера
  async loadDataFromServer(type, params) {
    // Helper function to retry requests with HTTP/2 error handling
    const fetchWithRetry = async (fetchFn, maxRetries = 3) => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await fetchFn();
        } catch (error) {
          const isHttp2Error = error.message.includes('HTTP2') || 
                              error.message.includes('ERR_HTTP2_PROTOCOL_ERROR') ||
                              error.message.includes('Failed to fetch');
          
          if (isHttp2Error && attempt < maxRetries) {
            logger.warn(`[Sync] HTTP/2 error on attempt ${attempt}/${maxRetries}, retrying...:`, error.message);
            // Exponential backoff: 500ms, 1000ms, 2000ms
            await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt - 1)));
            continue;
          }
          throw error;
        }
      }
    };

    switch (type) {
      case 'episode': {
        // console.log('[Sync] Loading episode from server:', params.slug);
        const fetchEpisode = async () => {
          const { data: rawEpisode, error: episodeError } = await supabase
            .from('episodes')
            .select(`
              slug,
              date,
              created_at,
              transcripts (
                title,
                lang
              ),
              episode_audios (
                audio_url,
                lang,
                duration
              )
            `)
            .eq('slug', params.slug)
            .maybeSingle();
          
          if (episodeError) {
             console.error('[Sync] Supabase episode error:', episodeError);
             throw episodeError;
          }
          
          if (!rawEpisode) {
             // console.warn('[Sync] Episode not found on server:', params.slug);
             throw new Error('Episode not found on server');
          }

          // Transform V2 data to flat structure
          const translations = rawEpisode.transcripts || [];
          const audios = rawEpisode.episode_audios || [];
          
          // Use provided lang or fallback to 'es' or first available
          const targetLang = params.lang || 'es';
          
          // Debug logging for title selection
          if (params.slug === '2025-10-22') {
             console.log('[Sync] Selecting title for 2025-10-22:', {
                targetLang,
                availableTranslations: translations.map(t => t.lang),
                found: translations.find(t => t.lang === targetLang)
             });
          }

          const titleObj = translations.find(t => t.lang === targetLang) 
                        || translations.find(t => t.lang === 'es') 
                        || translations[0];
          
          const audioObj = audios.find(a => a.lang === targetLang)
                        || audios.find(a => a.lang === 'es')
                        || audios.find(a => a.lang === 'mixed')
                        || audios[0];

          const episodeData = {
            slug: rawEpisode.slug,
            date: rawEpisode.date,
            created_at: rawEpisode.created_at,
            title: titleObj?.title || rawEpisode.slug,
            translations: translations, // Include all translations for client-side flexibility
            lang: audioObj?.lang || 'mixed',
            audio_url: audioObj?.audio_url,
            duration: audioObj?.duration || 0,
            available_variants: audios.map(a => a.lang).filter(Boolean),
            audio_variants: audios // Include full audio objects for switching
          };
          
          // Проверяем, что данные эпизода корректны
          if (typeof episodeData === 'object' && episodeData.slug) {
            return episodeData;
          } else {
            console.error('[Sync] Invalid episode data received:', episodeData);
            throw new Error('Invalid episode data received from server');
          }
        };

        return await fetchWithRetry(fetchEpisode);
      }

      case 'transcript': {
        const fetchTranscript = async () => {
          const { data: transcriptData, error: transcriptError } = await supabase
            .from('transcripts')
            .select('id, episode_slug, lang, status, created_at, updated_at, edited_transcript_data')
            .eq('episode_slug', params.episodeSlug)
            .eq('lang', params.lang)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (transcriptError) throw transcriptError;
          
          // Проверяем, что данные транскрипта корректны
          if (transcriptData && typeof transcriptData === 'object') {
            // Извлекаем данные из edited_transcript_data
            const editedData = transcriptData.edited_transcript_data || {};
            
            return {
              id: transcriptData.id,
              episode_slug: transcriptData.episode_slug || params.episodeSlug,
              lang: transcriptData.lang || params.lang,
              utterances: Array.isArray(editedData.utterances) ? editedData.utterances : [],
              words: Array.isArray(editedData.words) ? editedData.words : [],
              text: editedData.text || '',
              status: transcriptData.status || 'completed',
              created_at: transcriptData.created_at || new Date().toISOString(),
              updated_at: transcriptData.updated_at || new Date().toISOString(),
              edited_transcript_data: transcriptData.edited_transcript_data
            };
          }
          
          return transcriptData;
        };

        return await fetchWithRetry(fetchTranscript);
      }

      case 'timecodes': {
        const fetchQuestions = async () => {
          const { data: questionsData, error: questionsError } = await supabase
            .from('timecodes')
            .select('*')
            .eq('episode_slug', params.episodeSlug)
            .eq('lang', params.lang)
            .order('time', { ascending: true });
          
          if (questionsError) throw questionsError;
          
          // Проверяем, что данные вопросов корректны
          if (Array.isArray(questionsData)) {
            return questionsData.filter(q => 
              q && typeof q === 'object' && 
              (q.id || q.time !== undefined) && 
              q.lang === params.lang
            );
          }
          
          return questionsData || [];
        };

        return await fetchWithRetry(fetchQuestions);
      }

      case 'episodes': {
        const fetchEpisodes = async () => {
          const { data: episodesData, error: episodesError } = await supabase
            .from('episodes')
            .select(`
              *,
              transcripts (
                lang,
                title
              ),
              episode_audios (
                lang,
                audio_url,
                duration
              )
            `)
            .order('date', { ascending: false });
          
          if (episodesError) throw episodesError;
          
          // Проверяем, что данные эпизодов корректны
          if (Array.isArray(episodesData)) {
            return episodesData.map(ep => ({
              ...ep,
              translations: ep.transcripts || [],
              audios: ep.episode_audios || []
            })).filter(ep =>
              ep && typeof ep === 'object' && ep.slug
            );
          }
          
          return episodesData || [];
        };

        return await fetchWithRetry(fetchEpisodes);
      }

      default:
        throw new Error(`Unknown load type: ${type}`);
    }
  }

  // Синхронизация транскрипта с сервером
  async syncTranscriptToServer(data, operation) {
    switch (operation) {
      case 'update': {
        // Проверяем корректность ID
        if (!isCompatibleWithDatabase(data)) {
          throw new Error(`Invalid transcript ID: ${data.id}. ID must be a valid integer.`);
        }
        
        // Split large payloads to avoid HTTP2 errors
        const compactEdited = {
          utterances: (data.utterances || []).map(u => {
            const out = { start: u.start, end: u.end, text: u.text };
            if (u.id !== undefined) out.id = u.id;
            if (u.speaker !== undefined && u.speaker !== null && String(u.speaker).trim() !== '') out.speaker = u.speaker;
            return out;
          })
        };
        
        // Retry logic for large payloads
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
          try {
            const { error: updateError } = await supabase
              .from('transcripts')
              .update({ edited_transcript_data: compactEdited })
              .eq('id', Number(data.id)); // Убеждаемся, что ID - число
            
            if (updateError) throw updateError;
            break; // Success, exit retry loop
          } catch (err) {
            retryCount++;
            if (retryCount >= maxRetries) {
              throw err;
            } else {
              console.warn(`Retry ${retryCount}/${maxRetries} for transcript sync:`, err.message);
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
            }
          }
        }
        break;
      }

      case 'create': {
        const { error: createError } = await supabase
          .from('transcripts')
          .insert(data);

        if (createError) throw createError;
        break;
      }

      default:
        throw new Error(`Unknown transcript operation: ${operation}`);
    }
  }

  // Синхронизация вопросов с сервером
  async syncQuestionsToServer(data, operation) {
    switch (operation) {
      case 'update':
      case 'create': {
        // Удаляем существующие вопросы и создаем новые
        const { error: deleteError } = await supabase
          .from('timecodes')
          .delete()
          .eq('episode_slug', data.episodeSlug)
          .eq('lang', data.lang);

        if (deleteError) throw deleteError;

        if (data.questions && data.questions.length > 0) {
          const { error: insertError } = await supabase
            .from('timecodes')
            .insert(data.questions);

          if (insertError) throw insertError;
        }
        break;
      }

      default:
        throw new Error(`Unknown questions operation: ${operation}`);
    }
  }

  // Синхронизация эпизода с сервером
  async syncEpisodeToServer(data, operation) {
    switch (operation) {
      case 'update': {
        const { error: updateError } = await supabase
          .from('episodes')
          .update(data)
          .eq('slug', data.slug);

        if (updateError) throw updateError;
        break;
      }

      case 'create': {
        const { error: createError } = await supabase
          .from('episodes')
          .insert(data);

        if (createError) throw createError;
        break;
      }

      default:
        throw new Error(`Unknown episode operation: ${operation}`);
    }
  }

  // Синхронизация всех офлайн изменений
  async syncOfflineChanges() {
    if (this.syncInProgress || !this.isOnline) {
      return;
    }

    this.syncInProgress = true;
    this.notifySyncListeners('sync_start');

    try {
      await offlineDataService.init();
      const syncQueue = await offlineDataService.getSyncQueue();
      
      logger.info(`[Sync] Processing ${syncQueue.length} offline changes`);

      let successCount = 0;
      let errorCount = 0;

      for (const item of syncQueue) {
        try {
          await this.syncDataToServer(item.type, item.data, item.operation);
          await offlineDataService.removeSyncItem(item.id);
          successCount++;
          
          this.notifySyncListeners('sync_item_success', {
            type: item.type,
            operation: item.operation
          });
        } catch (error) {
          logger.error(`[Sync] Failed to sync ${item.type}:`, error);
          
          const updatedItem = await offlineDataService.incrementSyncAttempts(item.id);
          
          if (updatedItem && updatedItem.attempts >= updatedItem.max_attempts) {
            logger.warn(`[Sync] Max attempts reached for ${item.type}, removing from queue`);
            await offlineDataService.removeSyncItem(item.id);
          }
          
          errorCount++;
          
          this.notifySyncListeners('sync_item_error', {
            type: item.type,
            operation: item.operation,
            error: error.message
          });
        }
      }

      logger.info(`[Sync] Completed: ${successCount} success, ${errorCount} errors`);
      
      this.notifySyncListeners('sync_complete', {
        successCount,
        errorCount,
        totalCount: syncQueue.length
      });
    } catch (error) {
      logger.error('[Sync] Sync process failed:', error);
      this.notifySyncListeners('sync_error', { error: error.message });
    } finally {
      this.syncInProgress = false;
    }
  }

  // Принудительная синхронизация
  async forcSync() {
    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }
    
    return this.syncOfflineChanges();
  }

  // Очистка старых данных
  async cleanupOldData(maxAge = 7 * 24 * 60 * 60 * 1000) {
    await offlineDataService.init();
    await offlineDataService.clearExpiredData(maxAge);
    
    // Уведомляем Service Worker об очистке кеша
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CLEAR_OLD_CACHE',
        maxAge
      });
    }
  }

  // Получение статистики использования хранилища
  async getStorageStats() {
    await offlineDataService.init();
    return await offlineDataService.getStorageUsage();
  }

  // Получение статуса сети
  getNetworkStatus() {
    return {
      isOnline: this.isOnline,
      lastCheck: this.lastNetworkCheck,
      connectionType: navigator.connection?.type || 'unknown'
    };
  }

  // Подписка на изменения сетевого состояния
  onNetworkChange(callback) {
    this.networkListeners.push(callback);
    
    // Возвращаем функцию для отписки
    return () => {
      const index = this.networkListeners.indexOf(callback);
      if (index > -1) {
        this.networkListeners.splice(index, 1);
      }
    };
  }

  // Подписка на изменения статуса синхронизации
  onSyncChange(callback) {
    this.syncListeners.push(callback);
    
    // Возвращаем функцию для отписки
    return () => {
      const index = this.syncListeners.indexOf(callback);
      if (index > -1) {
        this.syncListeners.splice(index, 1);
      }
    };
  }
}

// Создаем единственный экземпляр сервиса
const syncService = new SyncService();

export default syncService;
