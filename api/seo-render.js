import { createClient } from '@supabase/supabase-js';

let supabase = null;

function getSupabase() {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return null;
    }
    
    supabase = createClient(supabaseUrl, supabaseServiceKey);
  }
  return supabase;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const LANG_NAMES = {
  ru: 'русский',
  es: 'español',
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  pl: 'Polski'
};

const LANG_HREFLANG = {
  ru: 'ru',
  es: 'es',
  en: 'en',
  de: 'de',
  fr: 'fr',
  pl: 'pl'
};

/**
 * Render SEO-friendly HTML for an episode page
 */
async function renderEpisodeSEO(lang, episodeSlug) {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    // Get episode
    const { data: episode, error: epError } = await sb
      .from('episodes')
      .select('date, slug')
      .eq('slug', episodeSlug)
      .single();

    if (epError || !episode) return null;

    // Get transcript
    const { data: transcript } = await sb
      .from('transcripts')
      .select('title, edited_transcript_data')
      .eq('episode_slug', episodeSlug)
      .eq('lang', lang)
      .single();

    const title = transcript?.title || `Эпизод ${episode.date}`;

    // Get all available translations for hreflang
    const { data: allTranscripts } = await sb
      .from('transcripts')
      .select('lang, title')
      .eq('episode_slug', episodeSlug);

    const availableLangs = allTranscripts?.map(t => t.lang) || [lang];

    // Get questions/timecodes
    const { data: questions } = await sb
      .from('timecodes')
      .select('time, title')
      .eq('episode_slug', episodeSlug)
      .eq('lang', lang)
      .order('time', { ascending: true });

    // Get audio
    const { data: audios } = await sb
      .from('episode_audios')
      .select('lang, audio_url')
      .eq('episode_slug', episodeSlug);

    const bestAudio = audios?.find(a => a.lang === lang) ||
      audios?.find(a => a.lang === 'es') ||
      audios?.find(a => a.lang === 'mixed') ||
      audios?.[0];

    // Build description from timecodes or transcript
    let description = 'Dos Mundos Radio — подкаст о духовном развитии';
    if (questions && questions.length > 0) {
      description = questions.slice(0, 5).map(q => q.title).join(' • ');
    }

    // Build text content from transcript for SEO
    const utterances = transcript?.edited_transcript_data?.utterances || [];
    let textContent = '';
    let wordCount = 0;
    for (const utt of utterances) {
      const text = (utt.text || '').trim();
      if (!text) continue;
      textContent += `<p>${escapeHtml(text)}</p>\n`;
      wordCount += text.split(/\s+/).length;
      if (wordCount > 2000) break; // Limit for SEO (enough for indexing)
    }

    const siteUrl = 'https://dosmundos.pe';
    const articleUrl = `${siteUrl}/${lang}/${episodeSlug}`;
    const imageUrl = `${siteUrl}/og-default.jpg`;
    const pubDate = episode.date ? new Date(episode.date).toISOString() : new Date().toISOString();
    const dateFormatted = episode.date || '';

    // Generate hreflang tags
    const hreflangTags = availableLangs.map(l =>
      `<link rel="alternate" hreflang="${LANG_HREFLANG[l] || l}" href="${siteUrl}/${l}/${episodeSlug}" />`
    ).join('\n  ');

    // JSON-LD structured data for PodcastEpisode
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "PodcastEpisode",
      "name": title,
      "description": description,
      "url": articleUrl,
      "datePublished": pubDate,
      "inLanguage": lang,
      "image": imageUrl,
      "partOfSeries": {
        "@type": "PodcastSeries",
        "name": "Dos Mundos Radio",
        "url": siteUrl,
        "description": "Подкаст центра интегрального развития Dos Mundos",
        "inLanguage": ["ru", "es", "en"]
      },
      "publisher": {
        "@type": "Organization",
        "name": "Dos Mundos",
        "url": siteUrl,
        "logo": {
          "@type": "ImageObject",
          "url": `${siteUrl}/favicon.png`
        }
      }
    };

    if (bestAudio?.audio_url) {
      jsonLd.associatedMedia = {
        "@type": "MediaObject",
        "contentUrl": bestAudio.audio_url,
        "encodingFormat": "audio/mpeg"
      };
    }

    // Build FAQ structured data from questions
    let faqJsonLd = '';
    if (questions && questions.length > 0) {
      const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": questions.slice(0, 20).map(q => ({
          "@type": "Question",
          "name": q.title,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": `Тема обсуждается в эпизоде Dos Mundos Radio от ${dateFormatted} на отметке ${formatTime(q.time)}.`
          }
        }))
      };
      faqJsonLd = `<script type="application/ld+json">${JSON.stringify(faqSchema)}</script>`;
    }

    // BreadcrumbList structured data
    const breadcrumbJsonLd = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Главная",
          "item": siteUrl
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Эпизоды",
          "item": `${siteUrl}/${lang}/episodes`
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": title,
          "item": articleUrl
        }
      ]
    };

    return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <title>${escapeHtml(title)} | Dos Mundos Radio</title>
  
  <!-- SEO Meta Tags -->
  <meta name="description" content="${escapeHtml(description.substring(0, 160))}">
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
  <meta name="googlebot" content="index, follow">
  <meta name="author" content="Dos Mundos">
  <link rel="canonical" href="${articleUrl}">
  
  <!-- Hreflang for multilingual SEO -->
  ${hreflangTags}
  <link rel="alternate" hreflang="x-default" href="${siteUrl}/ru/${episodeSlug}">
  
  <!-- Open Graph -->
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description.substring(0, 200))}">
  <meta property="og:url" content="${articleUrl}">
  <meta property="og:site_name" content="Dos Mundos Radio">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:locale" content="${lang}_${lang === 'en' ? 'US' : lang.toUpperCase()}">
  <meta property="article:published_time" content="${pubDate}">
  <meta property="article:author" content="Dos Mundos">
  <meta property="article:section" content="Подкаст">
  ${bestAudio?.audio_url ? `<meta property="og:audio" content="${bestAudio.audio_url}">` : ''}
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description.substring(0, 200))}">
  <meta name="twitter:image" content="${imageUrl}">
  <meta name="twitter:site" content="@DosMundosPe">
  
  <!-- Structured Data -->
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumbJsonLd)}</script>
  ${faqJsonLd}
  
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.7; color: #1a1a2e; background: #f5f5f5; }
    h1 { font-size: 1.8em; color: #16213e; margin-bottom: 8px; }
    .meta { color: #666; font-size: 0.9em; margin-bottom: 20px; }
    .topics { margin: 20px 0; padding: 16px; background: #fff; border-radius: 8px; border-left: 4px solid #6b46c1; }
    .topics h2 { font-size: 1.2em; margin: 0 0 12px 0; color: #6b46c1; }
    .topics ul { list-style: none; padding: 0; margin: 0; }
    .topics li { padding: 6px 0; border-bottom: 1px solid #f0f0f0; }
    .topics li:last-child { border: none; }
    .timestamp { color: #6b46c1; font-family: monospace; margin-right: 8px; }
    .transcript { margin-top: 24px; }
    .transcript p { margin-bottom: 12px; }
    .cta { display: inline-block; margin: 24px 0; padding: 12px 24px; background: #6b46c1; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; }
    .cta:hover { background: #553c9a; }
    nav.breadcrumb { font-size: 0.85em; color: #888; margin-bottom: 16px; }
    nav.breadcrumb a { color: #6b46c1; text-decoration: none; }
    .lang-links { margin-top: 16px; font-size: 0.85em; }
    .lang-links a { margin-right: 12px; color: #6b46c1; }
    footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #888; font-size: 0.85em; }
  </style>
</head>
<body>
  <nav class="breadcrumb">
    <a href="${siteUrl}">Dos Mundos</a> &rsaquo;
    <a href="${siteUrl}/${lang}/episodes">Эпизоды</a> &rsaquo;
    <span>${escapeHtml(title)}</span>
  </nav>

  <article>
    <h1>${escapeHtml(title)}</h1>
    <div class="meta">
      <time datetime="${pubDate}">📅 ${dateFormatted}</time>
      &nbsp;•&nbsp; Dos Mundos Radio
      ${availableLangs.length > 1 ? `&nbsp;•&nbsp; Доступно на ${availableLangs.length} языках` : ''}
    </div>

    ${bestAudio?.audio_url ? `<audio controls preload="none" style="width:100%;margin:16px 0"><source src="${bestAudio.audio_url}" type="audio/mpeg"></audio>` : ''}

    ${questions && questions.length > 0 ? `
    <div class="topics">
      <h2>Темы эпизода</h2>
      <ul>
        ${questions.map(q => `<li><span class="timestamp">[${formatTime(q.time)}]</span> ${escapeHtml(q.title)}</li>`).join('\n        ')}
      </ul>
    </div>` : ''}

    <a class="cta" href="${articleUrl}">🎧 Слушать в плеере Dos Mundos</a>

    ${availableLangs.length > 1 ? `
    <div class="lang-links">
      Язык: ${availableLangs.map(l => 
        l === lang 
          ? `<strong>${LANG_NAMES[l] || l}</strong>` 
          : `<a href="${siteUrl}/${l}/${episodeSlug}">${LANG_NAMES[l] || l}</a>`
      ).join(' ')}
    </div>` : ''}

    ${textContent ? `<div class="transcript"><h2>Транскрипция</h2>${textContent}</div>` : ''}
  </article>

  <footer>
    <p>© Dos Mundos — Центр интегрального развития | <a href="${siteUrl}">dosmundos.pe</a></p>
    <p><a href="${siteUrl}/${lang}/episodes">Все эпизоды</a> • <a href="${siteUrl}/${lang}/about">О нас</a> • <a href="${siteUrl}/${lang}/articles">Статьи</a></p>
  </footer>
</body>
</html>`;
  } catch (err) {
    console.error('[SEO Render] Episode error:', err.message);
    return null;
  }
}

/**
 * Render SEO-friendly HTML for the episodes list page
 */
async function renderEpisodesListSEO(lang) {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    const { data: episodes, error } = await sb
      .from('episodes')
      .select(`
        slug, date,
        transcripts!inner(title, lang)
      `)
      .eq('transcripts.lang', lang)
      .order('date', { ascending: false })
      .limit(100);

    if (error) {
      // Fallback: query without inner join
      const { data: fallbackEps } = await sb
        .from('episodes')
        .select('slug, date')
        .order('date', { ascending: false })
        .limit(100);

      if (!fallbackEps) return null;
      
      // Get transcripts separately
      const slugs = fallbackEps.map(e => e.slug);
      const { data: transcripts } = await sb
        .from('transcripts')
        .select('episode_slug, title, lang')
        .in('episode_slug', slugs)
        .eq('lang', lang);

      const titleMap = {};
      transcripts?.forEach(t => { titleMap[t.episode_slug] = t.title; });

      return generateEpisodesListHtml(lang, fallbackEps.map(ep => ({
        slug: ep.slug,
        date: ep.date,
        title: titleMap[ep.slug] || `Эпизод ${ep.date}`
      })));
    }

    return generateEpisodesListHtml(lang, episodes.map(ep => ({
      slug: ep.slug,
      date: ep.date,
      title: ep.transcripts?.[0]?.title || `Эпизод ${ep.date}`
    })));
  } catch (err) {
    console.error('[SEO Render] Episodes list error:', err.message);
    return null;
  }
}

function generateEpisodesListHtml(lang, episodes) {
  const siteUrl = 'https://dosmundos.pe';
  const langLabels = {
    ru: { title: 'Все эпизоды — Dos Mundos Radio', desc: 'Полный список эпизодов подкаста Dos Mundos Radio. Духовное развитие, аяуаска, медитации, энергетические практики.' },
    es: { title: 'Todos los episodios — Dos Mundos Radio', desc: 'Lista completa de episodios del podcast Dos Mundos Radio. Desarrollo espiritual, ayahuasca, meditaciones.' },
    en: { title: 'All Episodes — Dos Mundos Radio', desc: 'Complete episode list of Dos Mundos Radio podcast. Spiritual development, ayahuasca, meditations, energy practices.' },
    de: { title: 'Alle Episoden — Dos Mundos Radio', desc: 'Vollständige Episodenliste des Dos Mundos Radio Podcasts.' },
    fr: { title: 'Tous les épisodes — Dos Mundos Radio', desc: 'Liste complète des épisodes du podcast Dos Mundos Radio.' },
    pl: { title: 'Wszystkie odcinki — Dos Mundos Radio', desc: 'Pełna lista odcinków podcastu Dos Mundos Radio.' }
  };

  const { title, desc } = langLabels[lang] || langLabels.ru;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": title,
    "description": desc,
    "url": `${siteUrl}/${lang}/episodes`,
    "isPartOf": {
      "@type": "WebSite",
      "name": "Dos Mundos",
      "url": siteUrl
    },
    "mainEntity": {
      "@type": "ItemList",
      "numberOfItems": episodes.length,
      "itemListElement": episodes.slice(0, 50).map((ep, i) => ({
        "@type": "ListItem",
        "position": i + 1,
        "url": `${siteUrl}/${lang}/${ep.slug}`,
        "name": ep.title
      }))
    }
  };

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(desc)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${siteUrl}/${lang}/episodes">
  ${['ru', 'es', 'en', 'de', 'fr', 'pl'].map(l =>
    `<link rel="alternate" hreflang="${l}" href="${siteUrl}/${l}/episodes">`
  ).join('\n  ')}
  <link rel="alternate" hreflang="x-default" href="${siteUrl}/ru/episodes">
  
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(desc)}">
  <meta property="og:url" content="${siteUrl}/${lang}/episodes">
  <meta property="og:site_name" content="Dos Mundos Radio">
  <meta property="og:image" content="${siteUrl}/og-default.jpg">
  
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5; color: #1a1a2e; }
    h1 { color: #16213e; }
    .episode { padding: 12px 16px; margin-bottom: 8px; background: #fff; border-radius: 8px; border-left: 3px solid #6b46c1; }
    .episode a { text-decoration: none; color: #16213e; font-weight: 600; }
    .episode a:hover { color: #6b46c1; }
    .episode .date { color: #888; font-size: 0.85em; }
    footer { margin-top: 40px; color: #888; font-size: 0.85em; border-top: 1px solid #ddd; padding-top: 20px; }
    footer a { color: #6b46c1; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(desc)}</p>
  
  ${episodes.map(ep => `
  <div class="episode">
    <a href="${siteUrl}/${lang}/${ep.slug}">${escapeHtml(ep.title)}</a>
    <div class="date">${ep.date || ''}</div>
  </div>`).join('')}
  
  <footer>
    <p>© Dos Mundos — Центр интегрального развития | <a href="${siteUrl}">dosmundos.pe</a></p>
  </footer>
</body>
</html>`;
}

/**
 * Render SEO-friendly HTML for the homepage
 */
function renderHomepageSEO(lang) {
  const siteUrl = 'https://dosmundos.pe';
  
  const langContent = {
    ru: {
      title: 'Dos Mundos — Центр интегрального развития',
      desc: 'Центр интегрального развития Dos Mundos. Подкаст о духовном развитии, аяуаска, медитации, энергетические практики, семинары и ретриты в Перу.',
      h1: 'Dos Mundos — Центр интегрального развития',
      intro: 'Добро пожаловать в Dos Mundos — центр интегрального развития, объединяющий древние знания и современные практики для гармонизации тела, ума и духа.',
      sections: [
        { title: 'Подкаст', text: 'Слушайте наши эпизоды о духовном развитии, медитациях, энергетических практиках и шаманских традициях.', link: 'episodes' },
        { title: 'Статьи', text: 'Читайте наши материалы о духовности, исцелении, аяуаске и практиках самопознания.', link: 'articles' },
        { title: 'О нас', text: 'Узнайте больше о центре Dos Mundos, нашей миссии и команде.', link: 'about' },
        { title: 'Мероприятия', text: 'Семинары, ретриты и церемонии. Присоединяйтесь к нашему сообществу.', link: 'events' }
      ]
    },
    es: {
      title: 'Dos Mundos — Centro de Desarrollo Integral',
      desc: 'Centro de desarrollo integral Dos Mundos. Podcast sobre desarrollo espiritual, ayahuasca, meditaciones, prácticas energéticas, seminarios y retiros en Perú.',
      h1: 'Dos Mundos — Centro de Desarrollo Integral',
      intro: 'Bienvenidos a Dos Mundos — un centro de desarrollo integral que une conocimientos ancestrales y prácticas modernas para la armonización del cuerpo, mente y espíritu.',
      sections: [
        { title: 'Podcast', text: 'Escucha nuestros episodios sobre desarrollo espiritual, meditaciones y tradiciones chamánicas.', link: 'episodes' },
        { title: 'Artículos', text: 'Lee nuestros materiales sobre espiritualidad, sanación y ayahuasca.', link: 'articles' },
        { title: 'Sobre nosotros', text: 'Conoce más sobre el centro Dos Mundos y nuestra misión.', link: 'about' },
        { title: 'Eventos', text: 'Seminarios, retiros y ceremonias.', link: 'events' }
      ]
    },
    en: {
      title: 'Dos Mundos — Integral Development Center',
      desc: 'Dos Mundos integral development center. Podcast about spiritual development, ayahuasca, meditations, energy practices, seminars and retreats in Peru.',
      h1: 'Dos Mundos — Integral Development Center',
      intro: 'Welcome to Dos Mundos — an integral development center combining ancient wisdom and modern practices for harmonizing body, mind and spirit.',
      sections: [
        { title: 'Podcast', text: 'Listen to our episodes about spiritual development, meditations and shamanic traditions.', link: 'episodes' },
        { title: 'Articles', text: 'Read our materials about spirituality, healing and ayahuasca.', link: 'articles' },
        { title: 'About Us', text: 'Learn more about Dos Mundos center and our mission.', link: 'about' },
        { title: 'Events', text: 'Seminars, retreats and ceremonies.', link: 'events' }
      ]
    }
  };

  const content = langContent[lang] || langContent.ru;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Dos Mundos",
    "url": siteUrl,
    "description": content.desc,
    "inLanguage": ["ru", "es", "en", "de", "fr", "pl"],
    "publisher": {
      "@type": "Organization",
      "name": "Dos Mundos",
      "url": siteUrl,
      "logo": { "@type": "ImageObject", "url": `${siteUrl}/favicon.png` },
      "sameAs": [
        "https://facebook.com/dosmundos",
        "https://instagram.com/dosmundos",
        "https://youtube.com/dosmundos"
      ]
    },
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${siteUrl}/${lang}/deep-search?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(content.title)}</title>
  <meta name="description" content="${escapeHtml(content.desc)}">
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
  <link rel="canonical" href="${siteUrl}/${lang}">
  ${['ru', 'es', 'en', 'de', 'fr', 'pl'].map(l =>
    `<link rel="alternate" hreflang="${l}" href="${siteUrl}/${l}">`
  ).join('\n  ')}
  <link rel="alternate" hreflang="x-default" href="${siteUrl}">
  
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(content.title)}">
  <meta property="og:description" content="${escapeHtml(content.desc)}">
  <meta property="og:url" content="${siteUrl}/${lang}">
  <meta property="og:site_name" content="Dos Mundos">
  <meta property="og:image" content="${siteUrl}/og-default.jpg">
  
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5; color: #1a1a2e; line-height: 1.6; }
    h1 { color: #16213e; }
    .section { padding: 16px; margin: 12px 0; background: #fff; border-radius: 8px; border-left: 3px solid #6b46c1; }
    .section h2 { margin: 0 0 8px 0; color: #6b46c1; font-size: 1.2em; }
    .section a { color: #6b46c1; font-weight: 600; }
    footer { margin-top: 40px; color: #888; font-size: 0.85em; }
  </style>
</head>
<body>
  <h1>${escapeHtml(content.h1)}</h1>
  <p>${escapeHtml(content.intro)}</p>
  
  ${content.sections.map(s => `
  <div class="section">
    <h2>${escapeHtml(s.title)}</h2>
    <p>${escapeHtml(s.text)}</p>
    <a href="${siteUrl}/${lang}/${s.link}">${escapeHtml(s.title)} →</a>
  </div>`).join('')}
  
  <footer>
    <p>© Dos Mundos — <a href="${siteUrl}">dosmundos.pe</a></p>
  </footer>
</body>
</html>`;
}

/**
 * Render SEO-friendly HTML for the about page
 */
function renderAboutSEO(lang) {
  const siteUrl = 'https://dosmundos.pe';
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>О центре Dos Mundos — Центр интегрального развития</title>
  <meta name="description" content="Dos Mundos — центр интегрального развития в Перу. Исцеление тела и ума для гармонии с душой. Аяуаска, медитации, энергетические практики.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${siteUrl}/${lang}/about">
  <meta property="og:title" content="О центре Dos Mundos">
  <meta property="og:description" content="Центр интегрального развития в Перу">
  <meta property="og:url" content="${siteUrl}/${lang}/about">
  <meta property="og:type" content="website">
  <meta property="og:image" content="${siteUrl}/og-default.jpg">
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Dos Mundos",
    "url": siteUrl,
    "description": "Центр интегрального развития Dos Mundos — исцеление тела и ума для гармонии с душой",
    "logo": `${siteUrl}/favicon.png`
  })}</script>
</head>
<body>
  <h1>О центре Dos Mundos</h1>
  <p>Центр интегрального развития Dos Mundos — исцеление тела и ума для гармонии с душой. Мы объединяем древние знания шаманских традиций и современные подходы к духовному развитию.</p>
  <a href="${siteUrl}/${lang}/about">Подробнее →</a>
</body>
</html>`;
}

/**
 * Render SEO-friendly HTML for a single article page
 */
async function renderArticleDetailSEO(lang, articleSlug) {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    // Fetch article with translations
    const { data: article, error } = await sb
      .from('articles_v2')
      .select(`
        slug, author, youtube_url, published_at,
        article_translations(title, summary, content, language_code),
        article_categories(
          categories(
            slug,
            category_translations(name, language_code)
          )
        )
      `)
      .eq('slug', articleSlug)
      .single();

    if (error || !article) return null;

    const translations = article.article_translations || [];
    const translation = translations.find(t => t.language_code === lang) ||
                        translations.find(t => t.language_code === 'ru') || {};

    if (!translation.title) return null;

    const availableLangs = [...new Set(translations.map(t => t.language_code))];
    
    // Get categories
    const categories = (article.article_categories || []).map(ac => {
      const catTranslations = ac.categories?.category_translations || [];
      const catTrans = catTranslations.find(t => t.language_code === lang) ||
                       catTranslations.find(t => t.language_code === 'ru');
      return catTrans ? catTrans.name : ac.categories?.slug;
    }).filter(Boolean);

    const title = translation.title;
    const summary = translation.summary || '';
    const content = translation.content || '';
    const siteUrl = 'https://dosmundos.pe';
    const articleUrl = `${siteUrl}/${lang}/articles/${articleSlug}`;
    const imageUrl = `${siteUrl}/og-default.jpg`;
    const pubDate = article.published_at ? new Date(article.published_at).toISOString() : new Date().toISOString();

    // Strip HTML tags for plain text description
    const plainSummary = summary.replace(/<[^>]*>/g, '').substring(0, 200);

    // Prepare content preview (first ~3000 chars of the article)
    let contentPreview = content;
    if (contentPreview.length > 3000) {
      contentPreview = contentPreview.substring(0, 3000) + '...';
    }

    // Hreflang tags
    const hreflangTags = availableLangs.map(l =>
      `<link rel="alternate" hreflang="${LANG_HREFLANG[l] || l}" href="${siteUrl}/${l}/articles/${articleSlug}">`
    ).join('\n  ');

    // JSON-LD structured data
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": title,
      "description": plainSummary,
      "url": articleUrl,
      "datePublished": pubDate,
      "dateModified": pubDate,
      "inLanguage": lang,
      "image": imageUrl,
      "author": {
        "@type": "Person",
        "name": article.author || "Dos Mundos"
      },
      "publisher": {
        "@type": "Organization",
        "name": "Dos Mundos",
        "url": siteUrl,
        "logo": { "@type": "ImageObject", "url": `${siteUrl}/favicon.png` }
      },
      "mainEntityOfPage": { "@type": "WebPage", "@id": articleUrl }
    };
    if (categories.length > 0) {
      jsonLd.keywords = categories.join(', ');
      jsonLd.articleSection = categories[0];
    }

    // Breadcrumb
    const breadcrumbJsonLd = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Главная", "item": siteUrl },
        { "@type": "ListItem", "position": 2, "name": "Статьи", "item": `${siteUrl}/${lang}/articles` },
        { "@type": "ListItem", "position": 3, "name": title, "item": articleUrl }
      ]
    };

    return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} | Dos Mundos</title>
  
  <meta name="description" content="${escapeHtml(plainSummary)}">
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
  <meta name="author" content="${escapeHtml(article.author || 'Dos Mundos')}">
  <link rel="canonical" href="${articleUrl}">
  
  ${hreflangTags}
  <link rel="alternate" hreflang="x-default" href="${siteUrl}/ru/articles/${articleSlug}">
  
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(plainSummary)}">
  <meta property="og:url" content="${articleUrl}">
  <meta property="og:site_name" content="Dos Mundos">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:locale" content="${lang}_${lang === 'en' ? 'US' : lang.toUpperCase()}">
  <meta property="article:published_time" content="${pubDate}">
  <meta property="article:author" content="${escapeHtml(article.author || 'Dos Mundos')}">
  ${categories.map(c => `<meta property="article:tag" content="${escapeHtml(c)}">`).join('\n  ')}
  
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(plainSummary)}">
  <meta name="twitter:image" content="${imageUrl}">
  
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumbJsonLd)}</script>
  
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.7; color: #1a1a2e; background: #f5f5f5; }
    h1 { font-size: 1.8em; color: #16213e; margin-bottom: 8px; }
    .meta { color: #666; font-size: 0.9em; margin-bottom: 16px; }
    .categories { margin-bottom: 16px; }
    .category { display: inline-block; padding: 2px 10px; margin-right: 6px; background: #f0e6ff; color: #6b46c1; border-radius: 12px; font-size: 0.85em; }
    .summary { font-size: 1.1em; color: #444; border-left: 3px solid #6b46c1; padding-left: 16px; margin-bottom: 24px; }
    .content { margin-top: 24px; }
    .content p { margin-bottom: 14px; }
    .content h2, .content h3 { color: #16213e; margin-top: 28px; }
    nav.breadcrumb { font-size: 0.85em; color: #888; margin-bottom: 16px; }
    nav.breadcrumb a { color: #6b46c1; text-decoration: none; }
    .lang-links { margin-top: 16px; font-size: 0.85em; }
    .lang-links a { margin-right: 12px; color: #6b46c1; }
    .cta { display: inline-block; margin: 20px 0; padding: 12px 24px; background: #6b46c1; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; }
    footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #888; font-size: 0.85em; }
    footer a { color: #6b46c1; }
  </style>
</head>
<body>
  <nav class="breadcrumb">
    <a href="${siteUrl}">Dos Mundos</a> &rsaquo;
    <a href="${siteUrl}/${lang}/articles">Статьи</a> &rsaquo;
    <span>${escapeHtml(title)}</span>
  </nav>

  <article>
    <h1>${escapeHtml(title)}</h1>
    <div class="meta">
      ${article.author ? `<span>✍️ ${escapeHtml(article.author)}</span> • ` : ''}
      <time datetime="${pubDate}">📅 ${article.published_at || ''}</time>
    </div>

    ${categories.length > 0 ? `
    <div class="categories">
      ${categories.map(c => `<span class="category">${escapeHtml(c)}</span>`).join(' ')}
    </div>` : ''}

    ${plainSummary ? `<div class="summary"><p>${escapeHtml(plainSummary)}</p></div>` : ''}

    ${article.youtube_url ? `<p>📺 <a href="${article.youtube_url}">Смотреть видео на YouTube</a></p>` : ''}

    <a class="cta" href="${articleUrl}">Читать полностью на Dos Mundos</a>

    ${availableLangs.length > 1 ? `
    <div class="lang-links">
      Язык: ${availableLangs.map(l =>
        l === lang
          ? `<strong>${LANG_NAMES[l] || l}</strong>`
          : `<a href="${siteUrl}/${l}/articles/${articleSlug}">${LANG_NAMES[l] || l}</a>`
      ).join(' ')}
    </div>` : ''}

    <div class="content">
      ${contentPreview}
    </div>
  </article>

  <footer>
    <p>© Dos Mundos — Центр интегрального развития | <a href="${siteUrl}">dosmundos.pe</a></p>
    <p><a href="${siteUrl}/${lang}/articles">Все статьи</a> • <a href="${siteUrl}/${lang}/episodes">Эпизоды</a> • <a href="${siteUrl}/${lang}/about">О нас</a></p>
  </footer>
</body>
</html>`;
  } catch (err) {
    console.error('[SEO Render] Article detail error:', err.message);
    return null;
  }
}

/**
 * Render SEO-friendly HTML for the articles list page
 */
async function renderArticlesListSEO(lang) {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    const { data: articles, error } = await sb
      .from('articles_v2')
      .select(`
        slug, author, published_at,
        article_translations(title, summary, language_code)
      `)
      .order('published_at', { ascending: false })
      .limit(100);

    if (error || !articles) return null;

    // Filter to articles that have translation for this language (or fallback to ru)
    const articlesList = articles.map(a => {
      const translations = a.article_translations || [];
      const t = translations.find(tr => tr.language_code === lang) ||
                translations.find(tr => tr.language_code === 'ru');
      if (!t || !t.title) return null;
      return {
        slug: a.slug,
        title: t.title,
        summary: (t.summary || '').replace(/<[^>]*>/g, '').substring(0, 120),
        author: a.author,
        date: a.published_at
      };
    }).filter(Boolean);

    const siteUrl = 'https://dosmundos.pe';
    const pageUrl = `${siteUrl}/${lang}/articles`;

    const langLabels = {
      ru: { title: 'Статьи — Dos Mundos', desc: 'Статьи центра интегрального развития Dos Mundos. Духовность, аяуаска, медитации, энергетические практики, шаманизм, самопознание.' },
      es: { title: 'Artículos — Dos Mundos', desc: 'Artículos del centro de desarrollo integral Dos Mundos. Espiritualidad, ayahuasca, meditaciones, prácticas energéticas.' },
      en: { title: 'Articles — Dos Mundos', desc: 'Articles from Dos Mundos integral development center. Spirituality, ayahuasca, meditations, energy practices, shamanism.' },
      de: { title: 'Artikel — Dos Mundos', desc: 'Artikel des integralen Entwicklungszentrums Dos Mundos.' },
      fr: { title: 'Articles — Dos Mundos', desc: 'Articles du centre de développement intégral Dos Mundos.' },
      pl: { title: 'Artykuły — Dos Mundos', desc: 'Artykuły centrum integralnego rozwoju Dos Mundos.' }
    };

    const { title, desc } = langLabels[lang] || langLabels.ru;

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": title,
      "description": desc,
      "url": pageUrl,
      "isPartOf": { "@type": "WebSite", "name": "Dos Mundos", "url": siteUrl },
      "mainEntity": {
        "@type": "ItemList",
        "numberOfItems": articlesList.length,
        "itemListElement": articlesList.slice(0, 50).map((a, i) => ({
          "@type": "ListItem",
          "position": i + 1,
          "url": `${siteUrl}/${lang}/articles/${a.slug}`,
          "name": a.title
        }))
      }
    };

    return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(desc)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${pageUrl}">
  ${['ru', 'es', 'en', 'de', 'fr', 'pl'].map(l =>
    `<link rel="alternate" hreflang="${l}" href="${siteUrl}/${l}/articles">`
  ).join('\n  ')}
  <link rel="alternate" hreflang="x-default" href="${siteUrl}/ru/articles">
  
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(desc)}">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:site_name" content="Dos Mundos">
  <meta property="og:image" content="${siteUrl}/og-default.jpg">
  
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5; color: #1a1a2e; }
    h1 { color: #16213e; }
    .article-card { padding: 16px; margin-bottom: 12px; background: #fff; border-radius: 8px; border-left: 3px solid #6b46c1; }
    .article-card a { text-decoration: none; color: #16213e; font-weight: 600; font-size: 1.1em; }
    .article-card a:hover { color: #6b46c1; }
    .article-card .summary { color: #555; font-size: 0.9em; margin-top: 4px; }
    .article-card .date { color: #888; font-size: 0.8em; margin-top: 4px; }
    footer { margin-top: 40px; color: #888; font-size: 0.85em; border-top: 1px solid #ddd; padding-top: 20px; }
    footer a { color: #6b46c1; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(desc)}</p>
  
  ${articlesList.map(a => `
  <div class="article-card">
    <a href="${siteUrl}/${lang}/articles/${a.slug}">${escapeHtml(a.title)}</a>
    ${a.summary ? `<div class="summary">${escapeHtml(a.summary)}</div>` : ''}
    <div class="date">${a.author ? `${escapeHtml(a.author)} • ` : ''}${a.date || ''}</div>
  </div>`).join('')}
  
  <footer>
    <p>© Dos Mundos — Центр интегрального развития | <a href="${siteUrl}">dosmundos.pe</a></p>
    <p><a href="${siteUrl}/${lang}/episodes">Эпизоды подкаста</a> • <a href="${siteUrl}/${lang}/about">О нас</a></p>
  </footer>
</body>
</html>`;
  } catch (err) {
    console.error('[SEO Render] Articles list error:', err.message);
    return null;
  }
}

/**
 * Main SEO render handler — determines page type and renders appropriate HTML
 */
export async function handleSEORender(req, res, next) {
  const path = req.path;
  const SUPPORTED_LANGS = ['ru', 'es', 'en', 'de', 'fr', 'pl'];

  try {
    // Match /:lang/articles/:articleId
    const articleDetailMatch = path.match(/^\/(ru|es|en|de|fr|pl)\/articles\/([a-z0-9][\w-]+)\/?$/);
    if (articleDetailMatch) {
      const html = await renderArticleDetailSEO(articleDetailMatch[1], articleDetailMatch[2]);
      if (html) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
        return res.send(html);
      }
    }

    // Match /:lang/articles
    const articlesListMatch = path.match(/^\/(ru|es|en|de|fr|pl)\/articles\/?$/);
    if (articlesListMatch) {
      const html = await renderArticlesListSEO(articlesListMatch[1]);
      if (html) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
        return res.send(html);
      }
    }

    // Match /:lang/episodes
    const episodesMatch = path.match(/^\/(ru|es|en|de|fr|pl)\/episodes\/?$/);
    if (episodesMatch) {
      const html = await renderEpisodesListSEO(episodesMatch[1]);
      if (html) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
        return res.send(html);
      }
    }

    // Match /:lang/about
    const aboutMatch = path.match(/^\/(ru|es|en|de|fr|pl)\/about\/?$/);
    if (aboutMatch) {
      const html = renderAboutSEO(aboutMatch[1]);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.send(html);
    }

    // Match /:lang (homepage)
    const homepageMatch = path.match(/^\/(ru|es|en|de|fr|pl)\/?$/);
    if (homepageMatch) {
      const html = renderHomepageSEO(homepageMatch[1]);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.send(html);
    }

    // Match / (root)
    if (path === '/') {
      const html = renderHomepageSEO('ru');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.send(html);
    }

    // Match /:lang/:episodeSlug (episode page)
    const episodeMatch = path.match(/^\/(ru|es|en|de|fr|pl)\/([a-z0-9][\w-]+)\/?$/);
    if (episodeMatch) {
      const [, lang, slug] = episodeMatch;
      // Skip known non-episode routes
      const nonEpisodeRoutes = ['articles', 'deep-search', 'edit', 'analytics', 'offline-settings', 'live', 'festival', 'events', 'volunteers', 'player'];
      if (!nonEpisodeRoutes.includes(slug)) {
        const html = await renderEpisodeSEO(lang, slug);
        if (html) {
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
          return res.send(html);
        }
      }
    }

    // Not a page we handle — pass to next middleware
    next();
  } catch (err) {
    console.error('[SEO Render] Error:', err.message);
    next();
  }
}

export default handleSEORender;
