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

// Clean up the key if it accidentally includes "Bearer "
const cleanAnonKey = supabaseAnonKey.replace(/^Bearer\s+/i, '').trim();

// Check for common key issues
if (cleanAnonKey.split('.').length !== 3) {
  console.warn('⚠️ WARNING: VITE_SUPABASE_ANON_KEY does not look like a valid JWT (expected 3 parts). Check your .env file.');
}

// Создаем клиент с настройками для оптимизации и обработки ошибок
export const supabase = createClient(supabaseUrl, cleanAnonKey, {
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
        'apikey': cleanAnonKey,
        // Let supabase-js handle Authorization header to avoid duplication
        // 'Authorization': `Bearer ${cleanAnonKey}`,
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
      // Handle headers whether they are a plain object or Headers object
      // We normalize keys to lowercase to avoid duplication and case-sensitivity issues
      let headers = {};
      if (options.headers instanceof Headers) {
        options.headers.forEach((value, key) => {
          headers[key.toLowerCase()] = value;
        });
      } else if (options.headers) {
        Object.keys(options.headers).forEach(key => {
          headers[key.toLowerCase()] = options.headers[key];
        });
      }
      
      // Удаляем заголовки которые могут вызывать CORS проблемы
      delete headers['accept-profile'];
      delete headers['content-profile'];
      
      // Add HTTP/2 compatibility headers
      headers['connection'] = 'keep-alive';
      headers['user-agent'] = 'DosMundos-Podcast-App/1.0';
      
      // Ensure Content-Type is set for mutations
      if (options.method && ['POST', 'PUT', 'PATCH'].includes(options.method.toUpperCase())) {
        if (!headers['content-type']) {
          headers['content-type'] = 'application/json';
        }
      }

      // Убеждаемся что API ключ сохранен
      if (!headers['apikey'] && cleanAnonKey) {
        headers['apikey'] = cleanAnonKey;
      }
      
      // Only add Authorization if it's completely missing.
      if (!headers['authorization'] && cleanAnonKey) {
         headers['authorization'] = `Bearer ${cleanAnonKey}`;
      } else if (headers['authorization']) {
         // Check if we have a double bearer issue or other malformed headers
         if (headers['authorization'].match(/Bearer\s+Bearer/i)) {
             console.warn('⚠️ [Supabase] Detected double Bearer in Authorization header, fixing...');
             headers['authorization'] = headers['authorization'].replace(/Bearer\s+Bearer/i, 'Bearer');
         }
      }
      
      console.log('🔧 [Supabase] Fetch URL:', url);
      // console.log('🔧 [Supabase] Final Headers:', headers); // Uncomment for debugging
      
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
      // Handle headers whether they are a plain object or Headers object
      // We normalize keys to lowercase to avoid duplication
      let headers = {};
      if (options.headers instanceof Headers) {
        options.headers.forEach((value, key) => {
          headers[key.toLowerCase()] = value;
        });
      } else if (options.headers) {
        Object.keys(options.headers).forEach(key => {
          headers[key.toLowerCase()] = options.headers[key];
        });
      }
      
      // Удаляем только проблемные CORS заголовки
      delete headers['accept-profile'];
      delete headers['content-profile'];
      
      // Убеждаемся что API ключ сохранен
      if (!headers['apikey'] && cleanAnonKey) {
        headers['apikey'] = cleanAnonKey;
      }
      
      // Only add Authorization if it's completely missing.
      if (!headers['authorization'] && cleanAnonKey) {
         headers['authorization'] = `Bearer ${cleanAnonKey}`;
      } else if (headers['authorization']) {
         // Check if we have a double bearer issue
         if (headers['authorization'].match(/Bearer\s+Bearer/i)) {
             console.warn('⚠️ [Supabase] Detected double Bearer in Authorization header, fixing...');
             headers['authorization'] = headers['authorization'].replace(/Bearer\s+Bearer/i, 'Bearer');
         }
      }
      
      // Add HTTP/2 compatibility headers
      headers['connection'] = 'keep-alive';
      headers['user-agent'] = 'DosMundos-Podcast-App/1.0';

      // Ensure Content-Type is set for mutations
      if (options.method && ['POST', 'PUT', 'PATCH'].includes(options.method.toUpperCase())) {
        if (!headers['content-type']) {
          headers['content-type'] = 'application/json';
        }
      }
      
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
