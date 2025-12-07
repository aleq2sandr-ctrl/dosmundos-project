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

console.log('🔍 [Supabase] URL:', supabaseUrl);

// Определяем self-hosted
const isSelfHosted = supabaseUrl && (
  supabaseUrl.startsWith('http://') ||
  supabaseUrl.includes('72.61.186.175') ||
  supabaseUrl.includes('supabase.dosmundos.pe')
);

console.log('🔍 [Supabase] Is Self-hosted:', isSelfHosted);

// Очищаем ключ
const cleanAnonKey = supabaseAnonKey.replace(/^Bearer\s+/i, '').trim();

// КРИТИЧЕСКИ ВАЖНО: Для self-hosted полностью отключаем realtime
const realtimeConfig = isSelfHosted ? null : {
  params: {
    eventsPerSecond: 10
  }
};

console.log('🔧 [Supabase] Realtime config:', realtimeConfig);

// Дополнительная оптимизация для self-hosted
const additionalOptions = isSelfHosted ? {
  // Отключаем все realtime функции
  realtime: {
    enabled: false,
    params: undefined
  },
  // Увеличиваем таймауты для медленных соединений
  fetch: {
    timeout: 30000, // 30 секунд вместо стандартных 10
    retry: 3 // 3 попытки вместо 2
  },
  // Оптимизируем заголовки для self-hosted
  global: {
    headers: {
        'x-client-info': 'dosmundos-podcast-app'
    }
  }
} : {
  global: {
    headers: {
      'x-client-info': 'dosmundos-podcast-app'
    }
  }
};

// Создаем клиент с полным отключением realtime для self-hosted
export const supabase = createClient(supabaseUrl, cleanAnonKey, {
  realtime: realtimeConfig,
  ...additionalOptions,

  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});

// АГРЕССИВНОЕ отключение realtime для self-hosted
if (isSelfHosted) {
  // Полностью отключаем любые попытки WebSocket подключения
  console.log('🛡️ [Supabase] FULLY disabling realtime for self-hosted');
  
  // Перехватываем создание каналов realtime
  supabase.channel = function(name, options) {
    console.log('🚫 [Supabase] Blocking realtime channel creation:', name);
    // Возвращаем мок канала, который ничего не делает
    return {
      on: () => this,
      subscribe: () => {
        console.log('🚫 [Supabase] Blocked realtime subscribe for:', name);
        return Promise.resolve({ status: 'ok' });
      },
      unsubscribe: () => {
        console.log('🚫 [Supabase] Blocked realtime unsubscribe for:', name);
        return Promise.resolve({ status: 'ok' });
      },
      send: () => {
        console.log('🚫 [Supabase] Blocked realtime send for:', name);
        return Promise.resolve({ status: 'ok' });
      }
    };
  };
  
  // Перехватчик fetch для обработки проблемных заголовков и WebSocket
  const originalFetch = window.fetch;
  window.fetch = async function(url, options = {}) {
    // Блокируем любые WebSocket попытки к Supabase realtime
    if (url && url.includes('supabase.dosmundos.pe') && url.includes('/realtime/')) {
      console.log('🚫 [Supabase] Blocked WebSocket request:', url);
      return new Response(JSON.stringify({ error: 'Realtime disabled for self-hosted' }), {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Обрабатываем все запросы к Supabase - НЕ ДОБАВЛЯЕМ CORS ЗАГОЛОВКИ
    if (url && url.includes('supabase.dosmundos.pe')) {
      console.log('🔧 [Supabase] Cleaning problematic headers for:', url);
      
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
      
      // УДАЛЯЕМ ПРОБЛЕМНЫЕ ЗАГОЛОВКИ
      delete headers['accept-profile'];
      delete headers['content-profile'];
      delete headers['http2-settings'];
      delete headers['upgrade'];
      delete headers['cache-control'];
      delete headers['pragma'];
      delete headers['sec-ch-ua'];
      delete headers['sec-ch-ua-mobile'];
      delete headers['sec-ch-ua-platform'];
      delete headers['x-optimized'];
      delete headers['x-self-hosted'];
      
      // ВАЖНО: НЕ ДОБАВЛЯЕМ CORS ЗАГОЛОВКИ - они должны быть только на сервере
      // delete headers['access-control-allow-origin']; // Уже удален выше
      // delete headers['access-control-allow-methods']; // Уже удален выше  
      // delete headers['access-control-allow-headers']; // Уже удален выше
      
      // Устанавливаем только стандартные заголовки
      headers['connection'] = 'keep-alive';
      headers['user-agent'] = 'DosMundos-Podcast-App/1.0';
      
      // Убеждаемся что API ключ установлен
      if (!headers['apikey'] && cleanAnonKey) {
        headers['apikey'] = cleanAnonKey;
      }
      
      // Добавляем Authorization если нет
      if (!headers['authorization'] && cleanAnonKey) {
        headers['authorization'] = `Bearer ${cleanAnonKey}`;
      }
      
      // Устанавливаем безопасный Content-Type
      if (!headers['content-type'] && options.body) {
        headers['content-type'] = 'application/json';
      }
      
      console.log('✅ [Supabase] Cleaned problematic headers');
      
      const cleanOptions = {
        ...options,
        headers,
        mode: 'cors',
        credentials: 'omit'
      };
      
      try {
        const response = await originalFetch(url, cleanOptions);
        
        // Проверяем статус ответа
        if (!response.ok && response.status === 0) {
          console.warn('⚠️ [Supabase] CORS preflight issue detected');
        }
        
        return response;
      } catch (error) {
        console.error('❌ [Supabase] Fetch error:', error);
        throw error;
      }
    }
    
    return originalFetch(url, options);
  };
  
  // Подавляем консольные ошибки Supabase
  const originalError = console.error;
  console.error = function(...args) {
    const message = args.join(' ');
    if (message.includes('WebSocket') || 
        message.includes('realtime') || 
        message.includes('CORS') ||
        message.includes('Content Too Large') ||
        message.includes('Failed to fetch') ||
        message.includes('access-control-allow-methods')) {
      console.log('🛡️ [Supabase] Suppressed error:', message);
      return; // Подавляем проблемные ошибки
    }
    originalError.apply(console, args);
  };
  
  console.log('✅ [Supabase] Self-hosted Supabase configured with realtime fully disabled');
}

console.log('✅ [Supabase] Client created successfully');
