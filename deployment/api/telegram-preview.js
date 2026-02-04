import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials for Telegram Preview');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default async function handleTelegramPreview(req, res) {
  const { lang, episodeSlug } = req.params;
  const userAgent = req.headers['user-agent'] || '';
  
  // Only serve this special HTML to TelegramBot (and maybe others like WhatsApp/Facebook if needed)
  // But for now, let's just serve it if the route is hit, assuming Nginx handles the routing based on UA.
  // OR, if we mount this on the main server, we should check UA here.
  // Since the user asked for "links sent to Telegram", checking UA is safer if this runs on the main domain.
  // However, if this is a separate "bot server", we can just serve it.
  
  // Let's assume we want to be helpful and serve it if it looks like a bot OR if explicitly requested via query param ?bot=true (for testing)
  const isBot = /TelegramBot|Twitterbot|facebookexternalhit|WhatsApp/i.test(userAgent) || req.query.bot === 'true';
  
  if (!isBot) {
    // If not a bot, we might want to redirect to the actual SPA or just return 404 if this is a dedicated bot route.
    // If this handler is mounted on the main server path, we should call next() to let the SPA handler take over.
    // But here we are in a specific handler function.
    // Let's assume this is mounted as a specific route.
    // If the user integrates this into server.js, they should probably put it before the static file serving.
    // But wait, server.js DOES NOT serve static files currently. It's just an API server.
    // So if the user points Nginx to this server for bots, we just serve the HTML.
    // If they point normal users here, they will get this HTML too, which is fine (it's readable), but not the App.
    // Ideally, Nginx splits the traffic.
  }

  try {
    // 1. Get Episode Basic Info
    const { data: episode, error: epError } = await supabase
      .from('episodes')
      .select('date')
      .eq('slug', episodeSlug)
      .single();

    if (epError || !episode) {
      return res.status(404).send('Episode not found');
    }

    // 2. Get Title (from transcripts)
    const { data: transcript, error: trError } = await supabase
      .from('transcripts')
      .select('title')
      .eq('episode_slug', episodeSlug)
      .eq('lang', lang)
      .single();
      
    const title = transcript?.title || `Episode ${episode.date}`;

    // 3. Get Audio URL
    const { data: audio, error: auError } = await supabase
      .from('episode_audios')
      .select('audio_url')
      .eq('episode_slug', episodeSlug)
      .or(`lang.eq.${lang},lang.eq.es,lang.eq.mixed`) // Fallback logic
      .limit(1);
      
    // Better fallback logic for audio: try specific lang, then ES, then mixed.
    // Since .or() with limit(1) is not guaranteed order, let's fetch all and sort in JS or use specific queries.
    // Let's just fetch all for this episode and pick best.
    const { data: audios } = await supabase
      .from('episode_audios')
      .select('lang, audio_url')
      .eq('episode_slug', episodeSlug);
      
    const bestAudio = audios?.find(a => a.lang === lang) || 
                      audios?.find(a => a.lang === 'es') || 
                      audios?.find(a => a.lang === 'mixed') || 
                      audios?.[0];
                      
    const audioUrl = bestAudio?.audio_url;

    // 4. Get Questions (Timecodes)
    const { data: questions, error: qError } = await supabase
      .from('timecodes')
      .select('time, title')
      .eq('episode_slug', episodeSlug)
      .eq('lang', lang)
      .order('time', { ascending: true });

    const description = questions && questions.length > 0 
      ? `Topics: ${questions.slice(0, 3).map(q => q.title).join(', ')}...`
      : 'Listen to this meditation on Dos Mundos Radio.';

    const html = `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="https://dosmundos.pe/${lang}/${episodeSlug}">
  <meta property="og:site_name" content="Dos Mundos Radio">
  ${audioUrl ? `<meta property="og:audio" content="${audioUrl}">` : ''}
  ${audioUrl ? `<meta property="og:audio:type" content="audio/mpeg">` : ''}
  <meta property="twitter:card" content="summary_large_image">
  <title>${title}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; color: #333; }
    h1 { color: #2c3e50; }
    ul { list-style-type: none; padding: 0; }
    li { margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
    a { text-decoration: none; color: #3498db; font-weight: bold; }
    .timestamp { color: #7f8c8d; font-family: monospace; margin-right: 10px; }
    audio { width: 100%; margin: 20px 0; }
  </style>
</head>
<body>
  <article>
    <h1>${title}</h1>
    ${audioUrl ? `<audio controls src="${audioUrl}"></audio>` : ''}
    <p>${description}</p>
    
    ${questions && questions.length > 0 ? `
      <h2>Questions & Timestamps</h2>
      <ul>
        ${questions.map(q => `
          <li>
            <span class="timestamp">[${formatTime(q.time)}]</span>
            <a href="https://dosmundos.pe/${lang}/${episodeSlug}#${Math.floor(q.time)}">${q.title}</a>
          </li>
        `).join('')}
      </ul>
    ` : ''}
    
    <footer>
      <p><a href="https://dosmundos.pe/${lang}/${episodeSlug}">Open in Dos Mundos App</a></p>
    </footer>
  </article>
</body>
</html>
    `;

    res.send(html);

  } catch (err) {
    console.error('Telegram Preview Error:', err);
    res.status(500).send('Internal Server Error');
  }
}
