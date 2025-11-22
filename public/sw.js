// Версия кеша - обновляется при каждом деплое для принудительного обновления
// IMPORTANT: Измените эту версию при каждом деплое, чтобы очистить старые кеши
const CACHE_VERSION = 'v20251113-012920';
const STATIC_CACHE = 'static-' + CACHE_VERSION;
const DYNAMIC_CACHE = 'dynamic-' + CACHE_VERSION;
const AUDIO_CACHE = 'audio-' + CACHE_VERSION;

// Ресурсы для кеширования при установке
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/vite.svg'
];

// Максимальный размер кеша аудио (100MB)
const MAX_AUDIO_CACHE_SIZE = 100 * 1024 * 1024;

self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })));
      }),
      self.skipWaiting()
    ])
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating with new cache version:', CACHE_VERSION);
  event.waitUntil(
    Promise.all([
      // Агрессивная очистка ВСЕХ старых кешей при обновлении версии
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            // Удаляем все кеши, которые не соответствуют текущей версии
            if (!cacheName.includes(CACHE_VERSION)) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Принудительно активируем новый SW сразу
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Исключаем API endpoints - они должны проходить напрямую без перехвата
  // Это предотвращает ошибки при сетевых сбоях и позволяет fallback механизму работать
  if (isApiRequest(request)) {
    // Пропускаем обработку - запрос пройдет напрямую к серверу
    return;
  }

  // Обработка аудиофайлов
  if (isAudioRequest(request)) {
    event.respondWith(handleAudioRequest(request));
    return;
  }

  // Обработка API запросов к Supabase
  if (isSupabaseRequest(request)) {
    event.respondWith(handleSupabaseRequest(request));
    return;
  }

  // Обработка статических ресурсов
  if (isStaticAsset(request)) {
    event.respondWith(handleStaticRequest(request));
    return;
  }

  // Обработка навигационных запросов
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Стратегия "сеть сначала" для остального
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request);
    })
  );
});

// Проверка, является ли запрос к API (должен проходить напрямую без перехвата)
function isApiRequest(request) {
  const url = new URL(request.url);
  
  // Проверяем по пути
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/upload')) {
    return true;
  }
  
  // Проверяем по домену API
  if (url.hostname.includes('api.dosmundos.pe')) {
    return true;
  }
  
  // Проверяем по полному URL (для backup endpoints)
  const apiPatterns = [
    '/api/upload',
    '/api/upload/info/',
    '/api/upload/files',
    '/api/assemblyai',
    '/api/proxy-audio'
  ];
  
  return apiPatterns.some(pattern => url.pathname.includes(pattern));
}

// Проверка, является ли запрос аудиофайлом
function isAudioRequest(request) {
  const url = new URL(request.url);
  
  // Исключаем API эндпоинты информации о файлах (могут заканчиваться на .mp3, но это не аудио)
  if (url.pathname.includes('/upload/info/')) {
    return false;
  }
  
  // Исключаем все API запросы
  if (isApiRequest(request)) {
    return false;
  }
  
  // Проверяем по расширению файла
  const audioExtensions = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.webm'];
  const hasAudioExtension = audioExtensions.some(ext => url.pathname.toLowerCase().includes(ext));
  
  // Проверяем по destination
  const isAudioDestination = request.destination === 'audio';
  
  // Проверяем по Accept заголовку
  const acceptHeader = request.headers.get('accept') || '';
  const acceptsAudio = acceptHeader.includes('audio/');
  
  // Проверяем по параметрам URL
  const hasAudioParam = url.searchParams.has('audio');
  
  // Проверяем по домену (для наших аудиофайлов)
  const isAudioDomain = url.hostname.includes('srvstatic.kz') || 
                       url.hostname.includes('archive.org') ||
                       url.hostname.includes('r2.dev') ||
                       url.hostname.includes('silver-lemur-512881.hostingersite.com') ||
                       url.hostname.includes('darkviolet-caterpillar-781686.hostingersite.com');
  
  return isAudioDestination || hasAudioExtension || acceptsAudio || hasAudioParam || isAudioDomain;
}

// Проверка, является ли запрос к Supabase
function isSupabaseRequest(request) {
  return request.url.includes('supabase.co');
}

// Проверка, является ли запрос статическим ресурсом
function isStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.includes('/assets/') || 
         url.pathname.endsWith('.js') || 
         url.pathname.endsWith('.css') || 
         url.pathname.endsWith('.svg') ||
         url.pathname.endsWith('.png') ||
         url.pathname.endsWith('.jpg') ||
         url.pathname.endsWith('.jpeg');
}

// Обработка аудио запросов с кешированием и поддержкой Range requests
async function handleAudioRequest(request) {
  const url = new URL(request.url);
  
  // Ранее мы перенаправляли Hostinger аудио на /api/proxy-audio.
  // Прямое воспроизведение Hostinger аудио теперь поддерживается, поэтому
  // не выполняем редирект на прокси — используем оригинальный URL.
  
  const cache = await caches.open(AUDIO_CACHE);
  const cachedResponse = await cache.match(request);

  // Проверяем, является ли это Range request
  const rangeHeader = request.headers.get('range');

  if (cachedResponse) {
    console.log('[SW] Serving audio from cache:', request.url);
    
    // Если это Range request, обрабатываем его специально
    if (rangeHeader) {
      return handleRangeRequest(cachedResponse, rangeHeader);
    }
    
    // Обычный запрос - возвращаем полный ответ
    const headers = new Headers(cachedResponse.headers);
    headers.set('Content-Type', 'audio/mpeg');
    headers.set('Cache-Control', 'public, max-age=31536000');
    headers.set('Accept-Ranges', 'bytes');
    
    return new Response(cachedResponse.body, {
      status: cachedResponse.status,
      statusText: cachedResponse.statusText,
      headers: headers
    });
  }

  try {
    console.log('[SW] Fetching audio from network:', request.url);
    const response = await fetch(request);
    
    if (response.ok && response.status === 200) {
      // Проверяем размер кеша перед добавлением
      await manageCacheSize(cache, response.clone());
      
      // Кешируем только полный ответ (не Range responses)
      if (!rangeHeader) {
        await cache.put(request, response.clone());
        console.log('[SW] Audio cached:', request.url);
      }
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Audio fetch failed, checking cache:', error);
    
    // Если есть кеш, пытаемся обработать Range request из кеша
    if (cachedResponse && rangeHeader) {
      return handleRangeRequest(cachedResponse, rangeHeader);
    }
    
    return cachedResponse || new Response('Audio not available offline', { 
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Обработка Range requests для поддержки перемотки в кешированном аудио
async function handleRangeRequest(response, rangeHeader) {
  try {
    // Получаем полное содержимое из кеша
    const arrayBuffer = await response.clone().arrayBuffer();
    const fullSize = arrayBuffer.byteLength;
    
    // Парсим Range заголовок (формат: "bytes=start-end")
    const rangeMatch = rangeHeader.match(/bytes=(\d+)-(\d*)/);
    if (!rangeMatch) {
      console.warn('[SW] Invalid range header:', rangeHeader);
      return response;
    }
    
    const start = parseInt(rangeMatch[1], 10);
    const end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : fullSize - 1;
    
    // Проверяем валидность диапазона
    if (start >= fullSize || end >= fullSize || start > end) {
      return new Response(null, {
        status: 416,
        headers: {
          'Content-Range': `bytes */${fullSize}`,
          'Content-Type': 'audio/mpeg'
        }
      });
    }
    
    // Вырезаем нужный диапазон
    const slice = arrayBuffer.slice(start, end + 1);
    const sliceSize = slice.byteLength;
    
    console.log(`[SW] Serving range ${start}-${end}/${fullSize} from cache`);
    
    // Возвращаем partial content с правильными заголовками
    return new Response(slice, {
      status: 206, // Partial Content
      statusText: 'Partial Content',
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': sliceSize.toString(),
        'Content-Range': `bytes ${start}-${end}/${fullSize}`,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000'
      }
    });
  } catch (error) {
    console.error('[SW] Error handling range request:', error);
    // Возвращаем полный ответ в случае ошибки
    return response;
  }
}

// Обработка запросов к Supabase с офлайн поддержкой
async function handleSupabaseRequest(request) {
  const url = new URL(request.url);
  
  try {
    const response = await fetch(request);
    
    // Кешируем только GET запросы с успешными ответами
    if (request.method === 'GET' && response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      await cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Supabase request failed, trying cache:', error);
    
    if (request.method === 'GET') {
      const cache = await caches.open(DYNAMIC_CACHE);
      const cachedResponse = await cache.match(request);
      
      if (cachedResponse) {
        console.log('[SW] Serving Supabase data from cache:', request.url);
        return cachedResponse;
      }
    }
    
    // Для POST/PUT/DELETE запросов в офлайне сохраняем в IndexedDB
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      await queueOfflineRequest(request);
      return new Response(JSON.stringify({ 
        success: true, 
        offline: true, 
        message: 'Request queued for sync when online' 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response('Data not available offline', { status: 503 });
  }
}

// Обработка статических ресурсов - сеть сначала для обновленных файлов
async function handleStaticRequest(request) {
  const cache = await caches.open(STATIC_CACHE);
  
  try {
    // Пытаемся загрузить из сети сначала (для получения обновленных файлов)
    const networkResponse = await fetch(request, { cache: 'no-cache' });
    
    if (networkResponse.ok) {
      // Кешируем обновленный ответ
      await cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    // Если сеть недоступна, используем кеш
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return networkResponse;
  } catch (error) {
    // Если сеть недоступна, используем кеш
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response('Resource not available offline', { status: 503 });
  }
}

// Обработка навигационных запросов - сеть сначала
async function handleNavigationRequest(request) {
  const cache = await caches.open(STATIC_CACHE);
  
  try {
    // Всегда пытаемся загрузить свежую версию HTML
    const networkResponse = await fetch(request, { cache: 'no-cache' });
    
    if (networkResponse.ok) {
      // Обновляем кеш
      await cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    // Fallback на кеш если сеть недоступна
    const cachedIndex = await cache.match('/index.html');
    return cachedIndex || networkResponse;
  } catch (error) {
    // Fallback на кеш при ошибке сети
    const cachedIndex = await cache.match('/index.html');
    return cachedIndex || new Response('App not available offline', { status: 503 });
  }
}

// Управление размером кеша
async function manageCacheSize(cache, response) {
  const contentLength = response.headers.get('content-length');
  if (!contentLength) return;

  const size = parseInt(contentLength);
  let totalSize = size;

  // Подсчитываем текущий размер кеша
  const keys = await cache.keys();
  for (const key of keys) {
    const cachedResponse = await cache.match(key);
    if (cachedResponse) {
      const cachedSize = cachedResponse.headers.get('content-length');
      if (cachedSize) {
        totalSize += parseInt(cachedSize);
      }
    }
  }

  // Если превышаем лимит, удаляем старые записи
  if (totalSize > MAX_AUDIO_CACHE_SIZE) {
    console.log('[SW] Cache size exceeded, cleaning up...');
    const keysToDelete = keys.slice(0, Math.ceil(keys.length * 0.3)); // Удаляем 30% старых записей
    for (const key of keysToDelete) {
      await cache.delete(key);
    }
  }
}

// Сохранение офлайн запросов в IndexedDB
async function queueOfflineRequest(request) {
  return new Promise((resolve, reject) => {
    const dbRequest = indexedDB.open('OfflineRequests', 1);
    
    dbRequest.onerror = () => reject(dbRequest.error);
    
    dbRequest.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('requests')) {
        db.createObjectStore('requests', { keyPath: 'id', autoIncrement: true });
      }
    };
    
    dbRequest.onsuccess = async (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['requests'], 'readwrite');
      const store = transaction.objectStore('requests');
      
      const requestData = {
        url: request.url,
        method: request.method,
        headers: Object.fromEntries(request.headers.entries()),
        body: request.method !== 'GET' ? await request.text() : null,
        timestamp: Date.now()
      };
      
      store.add(requestData);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    };
  });
}

// Обработка сообщений от основного потока
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'CACHE_AUDIO':
      cacheAudioFile(data.url);
      break;
    case 'CLEAR_CACHE':
      clearAllCaches();
      break;
    case 'SYNC_OFFLINE_REQUESTS':
      syncOfflineRequests();
      break;
    case 'REFRESH_AUDIO_CACHE':
      refreshAudioCache(data.url);
      break;
  }
});

// Кеширование аудиофайла по запросу
async function cacheAudioFile(url) {
  try {
    const cache = await caches.open(AUDIO_CACHE);
    const response = await fetch(url);
    if (response.ok) {
      await manageCacheSize(cache, response.clone());
      await cache.put(url, response);
      console.log('[SW] Audio file cached:', url);
    }
  } catch (error) {
    console.error('[SW] Failed to cache audio file:', error);
  }
}

// Обновление кеша аудиофайла
async function refreshAudioCache(url) {
  try {
    const cache = await caches.open(AUDIO_CACHE);
    
    // Удаляем старую версию из кеша
    await cache.delete(url);
    console.log('[SW] Removed old audio cache entry:', url);
    
    // Пытаемся перекешировать если онлайн
    if (navigator.onLine) {
      const response = await fetch(url, { cache: 'no-cache' });
      if (response.ok) {
        await manageCacheSize(cache, response.clone());
        await cache.put(url, response);
        console.log('[SW] Audio file refreshed in cache:', url);
      }
    }
  } catch (error) {
    console.error('[SW] Failed to refresh audio cache:', error);
  }
}

// Очистка всех кешей
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(name => caches.delete(name)));
  console.log('[SW] All caches cleared');
}

// Синхронизация офлайн запросов
async function syncOfflineRequests() {
  return new Promise((resolve, reject) => {
    const dbRequest = indexedDB.open('OfflineRequests', 1);
    
    dbRequest.onsuccess = async (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['requests'], 'readonly');
      const store = transaction.objectStore('requests');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = async () => {
        const requests = getAllRequest.result;
        console.log('[SW] Syncing', requests.length, 'offline requests');
        
        for (const requestData of requests) {
          try {
            const response = await fetch(requestData.url, {
              method: requestData.method,
              headers: requestData.headers,
              body: requestData.body
            });
            
            if (response.ok) {
              // Удаляем успешно синхронизированный запрос
              const deleteTransaction = db.transaction(['requests'], 'readwrite');
              const deleteStore = deleteTransaction.objectStore('requests');
              deleteStore.delete(requestData.id);
            }
          } catch (error) {
            console.error('[SW] Failed to sync request:', error);
          }
        }
        resolve();
      };
    };
  });
}
