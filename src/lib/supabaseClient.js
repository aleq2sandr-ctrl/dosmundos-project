import { createClient } from '@supabase/supabase-js';

// Получаем переменные из .env файла
// В Vite переменные должны начинаться с VITE_ чтобы быть доступными в браузере
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('🔧 [Supabase] Инициализация клиента...');
console.log('🔧 [Supabase] URL:', supabaseUrl ? '✅ Установлен' : '❌ Не установлен');
console.log('🔧 [Supabase] Anon Key:', supabaseAnonKey ? '✅ Установлен' : '❌ Не установлен');

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
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    headers: {
      'x-client-info': 'dosmundos-podcast-app',
      // Для self-hosted Supabase всегда добавляем apikey в заголовках
      ...(isSelfHosted && {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
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
    }
  })
});

console.log('🔧 [Supabase] Клиент создан:', {
  url: supabaseUrl,
  isSelfHosted,
  urlType: isSelfHosted ? 'Self-hosted VPS' : 'Supabase Cloud'
});
