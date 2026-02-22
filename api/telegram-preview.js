import { createClient } from '@supabase/supabase-js';

let supabase = null;

function getSupabase() {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase credentials for Telegram Preview');
      console.error('SUPABASE_URL:', supabaseUrl ? 'set' : 'not set');
      console.error('SERVICE_ROLE_KEY:', supabaseServiceKey ? 'set' : 'not set');
      return null;
    }
    
    supabase = createClient(supabaseUrl, supabaseServiceKey);
  }
  return supabase;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Build article body HTML from transcript utterances
 */
function buildArticleBody(utterances, questions) {
  if (!utterances || utterances.length === 0) return '';

  let html = '';
  let currentQuestionIdx = 0;

  for (const utt of utterances) {
    const text = (utt.text || '').trim();
    if (!text) continue;

    // Check if we should insert a question header (based on time)
    if (questions && questions.length > 0) {
      while (currentQuestionIdx < questions.length && 
             utt.start !== undefined && 
             questions[currentQuestionIdx].time * 1000 <= utt.start) {
        html += `<h2>${escapeHtml(questions[currentQuestionIdx].title)}</h2>\n`;
        currentQuestionIdx++;
      }
    }

    // Determine if this is a question (italic) or answer
    const isQuestion = utt.speaker === 1 || utt.speaker === 'B';
    if (isQuestion) {
      html += `<blockquote><p><em>${escapeHtml(text)}</em></p></blockquote>\n`;
    } else {
      html += `<p>${escapeHtml(text)}</p>\n`;
    }
  }

  return html;
}

export default async function handleTelegramPreview(req, res) {
  const { lang, episodeSlug } = req.params;
  
  const supabase = getSupabase();
  if (!supabase) {
    return res.status(500).send('Server configuration error: Supabase not configured');
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

    // 2. Get Transcript with full data
    const { data: transcript, error: trError } = await supabase
      .from('transcripts')
      .select('title, edited_transcript_data')
      .eq('episode_slug', episodeSlug)
      .eq('lang', lang)
      .single();
    
    console.log(`[IV] Transcript for ${episodeSlug}/${lang}: title="${transcript?.title}", error=${trError?.message || 'none'}, utterances=${transcript?.edited_transcript_data?.utterances?.length || 0}`);
      
    const title = transcript?.title || `Episode ${episode.date}`;

    // 3. Get Audio URL
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

    // 5. Build description from questions
    const description = questions && questions.length > 0 
      ? questions.slice(0, 3).map(q => q.title).join(' • ')
      : 'Dos Mundos Radio';

    // 6. Build article body from transcript
    const utterances = transcript?.edited_transcript_data?.utterances || [];
    const articleBody = buildArticleBody(utterances, questions);

    // 7. Format date
    const pubDate = episode.date ? new Date(episode.date).toISOString() : new Date().toISOString();

    const siteUrl = 'https://dosmundos.pe';
    const articleUrl = `${siteUrl}/${lang}/${episodeSlug}`;
    const imageUrl = `${siteUrl}/og-default.jpg`;

    const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Essential OG tags for Telegram -->
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${articleUrl}">
  <meta property="og:site_name" content="Dos Mundos Radio">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  
  <!-- Article metadata -->
  <meta property="article:published_time" content="${pubDate}">
  <meta property="article:author" content="Dos Mundos">
  <meta property="article:section" content="Meditation">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${imageUrl}">
  
  ${audioUrl ? `<meta property="og:audio" content="${audioUrl}">` : ''}
  ${audioUrl ? `<meta property="og:audio:type" content="audio/mpeg">` : ''}
  
  <title>${escapeHtml(title)}</title>
  
  <style>
    body {
      font-family: Georgia, 'Times New Roman', serif;
      max-width: 680px;
      margin: 0 auto;
      padding: 24px 16px;
      line-height: 1.8;
      color: #1a1a1a;
      background: #fff;
    }
    article { margin-bottom: 40px; }
    h1 { 
      font-size: 2em; 
      line-height: 1.3; 
      margin-bottom: 8px; 
      color: #111; 
    }
    .meta {
      color: #666;
      font-size: 0.9em;
      margin-bottom: 24px;
      font-style: italic;
    }
    .description {
      font-size: 1.1em;
      color: #444;
      border-left: 3px solid #ddd;
      padding-left: 16px;
      margin-bottom: 24px;
    }
    h2 { 
      font-size: 1.4em; 
      margin-top: 32px; 
      margin-bottom: 12px; 
      color: #222; 
    }
    p { margin-bottom: 16px; }
    blockquote { 
      margin: 16px 0; 
      padding: 8px 16px; 
      border-left: 3px solid #4a90d9; 
      background: #f8f9fa;
      color: #333;
    }
    blockquote p { margin: 0; }
    audio { width: 100%; margin: 16px 0; }
    .timecodes { margin: 24px 0; }
    .timecodes h3 { font-size: 1.2em; margin-bottom: 12px; }
    .timecodes ul { list-style: none; padding: 0; }
    .timecodes li { 
      margin-bottom: 8px; 
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    .timestamp { 
      color: #4a90d9; 
      font-family: monospace; 
      margin-right: 8px;
      font-weight: bold;
    }
    .footer-link {
      display: inline-block;
      margin-top: 24px;
      padding: 12px 24px;
      background: #4a90d9;
      color: #fff;
      text-decoration: none;
      border-radius: 6px;
    }
  </style>
</head>
<body>
  <article>
    <h1>${escapeHtml(title)}</h1>
    <address class="meta">
      <span>Dos Mundos Radio</span>
      <time datetime="${pubDate}"> • ${episode.date || ''}</time>
    </address>
    
    ${description !== 'Dos Mundos Radio' ? `<p class="description">${escapeHtml(description)}</p>` : ''}
    
    ${audioUrl ? `<audio controls src="${audioUrl}"></audio>` : ''}
    
    ${questions && questions.length > 0 ? `
      <div class="timecodes">
        <h3>Темы</h3>
        <ul>
          ${questions.map(q => `
            <li>
              <span class="timestamp">[${formatTime(q.time)}]</span>
              <a href="${articleUrl}#${Math.floor(q.time)}">${escapeHtml(q.title)}</a>
            </li>
          `).join('')}
        </ul>
      </div>
    ` : ''}
    
    ${articleBody ? `<hr>\n${articleBody}` : ''}
    
    <footer>
      <p><a class="footer-link" href="${articleUrl}">Открыть в приложении Dos Mundos</a></p>
    </footer>
  </article>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);

  } catch (err) {
    console.error('Telegram Preview Error:', err);
    res.status(500).send('Internal Server Error');
  }
}
