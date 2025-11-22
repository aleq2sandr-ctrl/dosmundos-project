// Прокси-эндпоинт для аудиофайлов с Hostinger
// Обрабатывает Range requests для поддержки seeking в аудиоплеере
// Работает с Vercel/Netlify serverless functions

export default async function handler(req, res) {
  // Обрабатываем CORS preflight запросы
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
    res.status(200).end();
    return;
  }

  // Только GET запросы
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const audioUrl = req.query.url;

  if (!audioUrl) {
    console.error('[ProxyAudio] Missing url parameter');
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  // Декодируем URL
  let decodedUrl;
  try {
    decodedUrl = decodeURIComponent(audioUrl);
  } catch (error) {
    console.error('[ProxyAudio] Invalid URL encoding:', error);
    return res.status(400).json({ error: 'Invalid URL encoding' });
  }

  // Проверяем, что это Hostinger домен
  if (!decodedUrl.includes('silver-lemur-512881.hostingersite.com') && 
      !decodedUrl.includes('darkviolet-caterpillar-781686.hostingersite.com')) {
    console.error('[ProxyAudio] Invalid domain:', decodedUrl);
    return res.status(400).json({ error: 'Invalid proxy URL - only Hostinger audio allowed' });
  }

  try {
    console.log('[ProxyAudio] Fetching audio from:', decodedUrl);
    
    // Получаем Range заголовок из запроса клиента
    const rangeHeader = req.headers.range || req.headers['range'];
    
    // Заголовки для запроса к Hostinger
    const fetchHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept-Encoding': 'identity',
      'Accept': 'audio/*'
    };
    
    // Если клиент запрашивает Range, передаём его на Hostinger
    if (rangeHeader) {
      fetchHeaders['Range'] = rangeHeader;
      console.log('[ProxyAudio] Range request:', rangeHeader);
    }

    // Создаём AbortController с таймаутом 60 секунд
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const response = await fetch(decodedUrl, {
      headers: fetchHeaders,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`[ProxyAudio] Hostinger returned ${response.status}: ${response.statusText}`);
      return res.status(response.status).send('Failed to fetch audio from source');
    }

    // Получаем заголовки от Hostinger
    const contentType = response.headers.get('content-type') || 'audio/mpeg';
    const contentLength = response.headers.get('content-length');
    const contentRange = response.headers.get('content-range');
    const acceptRanges = response.headers.get('accept-ranges') || 'bytes';

    // Устанавливаем заголовки ответа
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Accept-Ranges', acceptRanges);
    
    // Если это частичный ответ (206), передаём соответствующие заголовки
    if (response.status === 206 && contentRange) {
      res.status(206);
      res.setHeader('Content-Range', contentRange);
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }
    } else {
      res.status(200);
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }
    }

    console.log('[ProxyAudio] Streaming audio to client, status:', response.status, 'content-type:', contentType);

    // Добавляем CORS заголовки
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
    res.setHeader('Cross-Origin-Resource-Sharing', 'true');

    // Простой способ: используем pipe вместо ReadableStream
    // response.body это Node.js ReadableStream, а не Fetch API
    if (response.body && typeof response.body.pipe === 'function') {
      response.body.pipe(res);
    } else {
      // Fallback для случаев когда body недоступен как stream
      const buffer = await response.arrayBuffer();
      res.end(Buffer.from(buffer));
    }
    
  } catch (error) {
    console.error('[ProxyAudio] Error proxying audio:', error.message, error.stack);
    
    // Если ошибка - отправляем text вместо JSON чтобы браузер не пытался парсить как JSON
    if (!res.headersSent) {
      res.status(500).send('Failed to proxy audio from Hostinger: ' + error.message);
    } else {
      res.end();
    }
  }
}

