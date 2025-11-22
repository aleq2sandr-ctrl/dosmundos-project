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

  // Вместо проксирования — редиректим клиента на исходный URL.
  // Это позволяет работать со старым /api/proxy-audio?url=... без необходимости стримить через этот сервер.
  try {
    res.setHeader('Location', decodedUrl);
    res.status(302).end();
    return;
  } catch (error) {
    console.error('[ProxyAudio] Error redirecting to source URL:', error);
    if (!res.headersSent) {
      res.status(500).send('Failed to redirect to source audio: ' + (error && error.message));
    } else {
      res.end();
    }
  }
}

