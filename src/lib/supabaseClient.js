import { createClient } from '@supabase/supabase-js';

// Helper to safely get env vars in both Vite and Node environments
const getEnv = (key) => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return import.meta.env[key];
    }
  } catch (e) {
    // Ignore error if import.meta is not available
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL') || 'https://supabase.dosmundos.pe';
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlLWRlbW8iLCJpYXQiOjE2NDE3NjkyMDAsImV4cCI6MTk5OTk5OTk5OX0.A4_N08ZorXYT17zhZReBXPlY6L5-9d8thMbm7TcDWl8';

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
console.log('🔍 [DEBUG] About to create client with URL:', supabaseUrl);
console.log('🔍 [DEBUG] URL type:', typeof supabaseUrl);
console.log('🔍 [DEBUG] URL length:', supabaseUrl ? supabaseUrl.length : 'undefined');

// Force correct URL
const finalUrl = 'https://supabase.dosmundos.pe';
const finalKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlLWRlbW8iLCJpYXQiOjE2NDE3NjkyMDAsImV4cCI6MTk5OTk5OTk5OX0.A4_N08ZorXYT17zhZReBXPlY6L5-9d8thMbm7TcDWl8';

console.log('🔍 [DEBUG] Using final URL:', finalUrl);

export const supabase = createClient(finalUrl, finalKey, {
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
      delete headers['http2-settings'];
      delete headers['upgrade'];
      delete headers['cache-control'];
      delete headers['x-client-info'];
      delete headers['x-upsert'];
      
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
      console.log('🔧 [Supabase] Fetch method:', options.method);
      console.log('🔧 [Supabase] Request body size:', options.body ? options.body.length : 'no body');
      console.log('🔧 [Supabase] Final Headers:', headers); // Uncomment for debugging
      
      // Log specific info for large requests
      if (options.body && options.body.length > 100000) {
        console.warn('🔧 [Supabase] LARGE REQUEST DETECTED!');
        console.warn('🔧 [Supabase] Body preview:', options.body.substring(0, 200) + '...');
      }
      
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
      delete headers['http2-settings'];
      delete headers['upgrade'];
      delete headers['cache-control'];
      delete headers['x-client-info'];
      delete headers['x-upsert'];
      
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
      const fetchWithRetry = async (attempt = 1, forceHttp1 = false) => {
        // Add timeout and abort controller for better error handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

        // Force HTTP/1.1 if requested or if this is a timecodes request (known to have issues)
        const isTimecodesRequest = url.includes('/timecodes');
        const useHttp1 = forceHttp1 || isTimecodesRequest || attempt > 1;

        const requestHeaders = { ...headers };
        if (useHttp1) {
          // Force HTTP/1.1 by removing HTTP/2 headers and adding HTTP/1.1 hints
          delete requestHeaders['Upgrade'];
          delete requestHeaders['HTTP2-Settings'];
          delete requestHeaders['http2-settings'];
          delete requestHeaders['upgrade'];
          // Add header that might help force HTTP/1.1
          requestHeaders['Connection'] = 'close';
        }

        try {
          const response = await originalFetch(url, {
            ...options,
            headers: requestHeaders,
            mode: 'cors',
            credentials: 'omit',
            signal: controller.signal
          });

          // If this was an HTTP/2 error attempt and it succeeded with HTTP/1.1, log it
          if (useHttp1 && attempt > 1) {
            console.log('✅ [Supabase] Request succeeded with HTTP/1.1 fallback');
          }

          return response;
        } catch (error) {
          clearTimeout(timeoutId);

          // Если это HTTP/2 ошибка и у нас есть еще попытки
          const isHttp2Error = error.message.includes('HTTP2') ||
                              error.message.includes('ERR_HTTP2_PROTOCOL_ERROR') ||
                              error.message.includes('Failed to fetch');

          if (isHttp2Error && attempt < 3) {
            console.warn(`🔄 [Supabase] HTTP/2 ошибка, попытка ${attempt + 1} из 3 (force HTTP/1.1: ${!forceHttp1}):`, error.message);
            // Небольшая задержка перед повторной попыткой с HTTP/1.1
            await new Promise(resolve => setTimeout(resolve, 500 * attempt));
            return fetchWithRetry(attempt + 1, true); // Force HTTP/1.1 on retry
          }
          throw error;
        }
      };
      
      return fetchWithRetry();
    }
    
    return originalFetch(url, options);
  };
  
  }
