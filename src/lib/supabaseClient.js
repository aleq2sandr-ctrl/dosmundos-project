import { createClient } from '@supabase/supabase-js';

// Получаем переменные из .env файла
// В Vite переменные должны начинаться с VITE_ чтобы быть доступными в браузере
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;


// Проверка наличия переменных окружения
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Ошибка: Supabase переменные окружения не настроены!');
  console.error('Проверьте файл .env и убедитесь что:');
  console.error('- VITE_SUPABASE_URL установлен');
  console.error('- VITE_SUPABASE_ANON_KEY установлен');
  throw new Error('Supabase environment variables are not configured');
}

// Определяем, используем ли мы self-hosted Supabase (HTTP без SSL)
const isSelfHosted = supabaseUrl && (supabaseUrl.startsWith('http://') || supabaseUrl.includes('72.61.186.175') || supabaseUrl.includes('supabase.dosmundos.pe'));


// Создаем клиент с настройками для оптимизации и обработки ошибок
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  // Для self-hosted временно отключаем realtime чтобы избежать WebSocket ошибок
  ...(isSelfHosted && {
    realtime: {
      enabled: false
    }
  }),
  ...(isSelfHosted === false && {
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }),
  global: {
    headers: {
      'x-client-info': 'dosmundos-podcast-app',
      // Для self-hosted Supabase всегда добавляем apikey в заголовках
      ...(isSelfHosted && {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        // Add connection headers to prevent HTTP/2 issues
        'Connection': 'keep-alive',
        'User-Agent': 'DosMundos-Podcast-App/1.0'
      })
    }
  },
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  },
  // Для self-hosted Supabase отключаем некоторые проверки
  ...(isSelfHosted && {
    db: {
      schema: 'public'
    },
    // Дополнительные опции для self-hosted
    fetch: (url, options = {}) => {
      // Удаляем проблемные заголовки для CORS
      const headers = { ...options.headers };
      
      // Удаляем заголовки которые могут вызывать CORS проблемы
      delete headers['accept-profile'];
      delete headers['Accept-Profile'];
      delete headers['content-profile'];
      delete headers['Content-Profile'];
      
      // Add HTTP/2 compatibility headers
      headers['Connection'] = 'keep-alive';
      headers['User-Agent'] = 'DosMundos-Podcast-App/1.0';
      
      console.log('🔧 [Supabase] Fetch URL:', url);
      console.log('🔧 [Supabase] Headers after cleanup:', headers);
      
      // Add timeout and abort controller for better error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      return fetch(url, {
        ...options,
        headers,
        mode: 'cors',
        credentials: 'omit',
        signal: controller.signal
      }).finally(() => {
        clearTimeout(timeoutId);
      });
    }
  })
});


// Если это self-hosted, добавляем глобальный перехватчик fetch для CORS
if (isSelfHosted) {
  const originalFetch = window.fetch;
  window.fetch = async function(url, options = {}) {
    // Если это запрос к нашему Supabase, очищаем заголовки и добавляем обработку ошибок
    if (url && url.includes('supabase.dosmundos.pe')) {
      const headers = { ...options.headers };
      
      // Удаляем только проблемные CORS заголовки, но сохраняем важные
      delete headers['accept-profile'];
      delete headers['Accept-Profile'];
      delete headers['content-profile'];
      delete headers['Content-Profile'];
      
      // Убеждаемся что API ключ и авторизация сохранены
      if (!headers['apikey'] && supabaseAnonKey) {
        headers['apikey'] = supabaseAnonKey;
      }
      if (!headers['Authorization'] && supabaseAnonKey) {
        headers['Authorization'] = `Bearer ${supabaseAnonKey}`;
      }
      
      // Add HTTP/2 compatibility headers
      headers['Connection'] = 'keep-alive';
      headers['User-Agent'] = 'DosMundos-Podcast-App/1.0';
      
      // Функция для выполнения запроса с повторными попытками
      const fetchWithRetry = async (attempt = 1) => {
        // Add timeout and abort controller for better error handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
        
        try {
          return await originalFetch(url, {
            ...options,
            headers,
            mode: 'cors',
            credentials: 'omit',
            signal: controller.signal
          });
        } catch (error) {
          clearTimeout(timeoutId);
          
          // Если это HTTP/2 ошибка и у нас есть еще попытки
          const isHttp2Error = error.message.includes('HTTP2') || 
                              error.message.includes('ERR_HTTP2_PROTOCOL_ERROR') ||
                              error.message.includes('Failed to fetch');
          
          if (isHttp2Error && attempt < 3) {
            console.warn(`🔄 [Supabase] HTTP/2 ошибка, попытка ${attempt + 1} из 3:`, error.message);
            // Небольшая задержка перед повторной попыткой
            await new Promise(resolve => setTimeout(resolve, 500 * attempt));
            return fetchWithRetry(attempt + 1);
          }
          throw error;
        }
      };
      
      return fetchWithRetry();
    }
    
    return originalFetch(url, options);
  };
  
  }
