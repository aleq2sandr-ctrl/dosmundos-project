/**
 * Utility to update meta tags for SEO and social media preview (Open Graph, Twitter Card)
 */

// Helper to add/update meta tag
const setMeta = (name, content, isProperty = false) => {
  const attr = isProperty ? 'property' : 'name';
  let meta = document.querySelector(`meta[${attr}="${name}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attr, name);
    document.head.appendChild(meta);
  }
  meta.content = content;
};

// Helper to update or create link tag
const setLink = (rel, href, attrs = {}) => {
  const selector = Object.entries(attrs).map(([k, v]) => `[${k}="${v}"]`).join('');
  let link = document.querySelector(`link[rel="${rel}"]${selector}`);
  if (!link) {
    link = document.createElement('link');
    link.rel = rel;
    Object.entries(attrs).forEach(([k, v]) => link.setAttribute(k, v));
    document.head.appendChild(link);
  }
  link.href = href;
};

export const updateMetaTags = (article, baseUrl = 'https://dosmundos.pe') => {
  if (!article) return;

  const title = article.title || 'Dos Mundos';
  const description = article.summary || 'Центр интегрированного развития Dos Mundos';
  const articleUrl = `${baseUrl}/${article.lang || 'ru'}/articles/${article.id}`;
  const image = article.image || `${baseUrl}/og-default.jpg`;

  // Update page title
  document.title = `${title} | Dos Mundos`;

  // Update canonical URL
  setLink('canonical', articleUrl);

  // Standard SEO tags
  setMeta('description', description);
  setMeta('keywords', article.categories ? article.categories.join(', ') : 'духовность, исцеление, аяуаска, медитации, энергетика');
  setMeta('author', article.author || 'Dos Mundos');
  setMeta('robots', 'index, follow');
  setMeta('googlebot', 'index, follow');
  setMeta('theme-color', '#6b46c1');

  // Open Graph tags
  setMeta('og:title', title, true);
  setMeta('og:description', description, true);
  setMeta('og:url', articleUrl, true);
  setMeta('og:image', image, true);
  setMeta('og:type', 'article', true);
  setMeta('og:site_name', 'Dos Mundos', true);
  setMeta('og:locale', article.lang || 'ru_RU', true);
  if (article.publishedAt) {
    setMeta('og:article:published_time', new Date(article.publishedAt).toISOString(), true);
  }
  if (article.author) {
    setMeta('og:article:author', article.author, true);
  }
  if (article.categories) {
    article.categories.forEach(category => {
      setMeta('og:article:tag', category, true);
    });
  }

  // Twitter Card tags
  setMeta('twitter:card', 'summary_large_image');
  setMeta('twitter:title', title);
  setMeta('twitter:description', description);
  setMeta('twitter:image', image);
  setMeta('twitter:site', '@DosMundosPe');
  setMeta('twitter:creator', '@DosMundosPe');

  // Article specific tags
  if (article.publishedAt) {
    setMeta('article:published_time', new Date(article.publishedAt).toISOString());
  }
  if (article.author) {
    setMeta('article:author', article.author);
  }
  if (article.categories) {
    article.categories.forEach(category => {
      setMeta('article:tag', category);
    });
  }

  // Schema.org JSON-LD for articles
  let schemaScript = document.querySelector('script[type="application/ld+json"]');
  if (!schemaScript) {
    schemaScript = document.createElement('script');
    schemaScript.type = 'application/ld+json';
    document.head.appendChild(schemaScript);
  }

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": title,
    "description": description,
    "author": {
      "@type": "Organization",
      "name": article.author || "Dos Mundos"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Dos Mundos",
      "logo": {
        "@type": "ImageObject",
        "url": `${baseUrl}/favicon.png`
      }
    },
    "datePublished": article.publishedAt ? new Date(article.publishedAt).toISOString() : new Date().toISOString(),
    "dateModified": article.publishedAt ? new Date(article.publishedAt).toISOString() : new Date().toISOString(),
    "url": articleUrl,
    "image": image,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": articleUrl
    }
  };

  if (article.categories) {
    articleSchema.keywords = article.categories.join(', ');
  }

  schemaScript.textContent = JSON.stringify(articleSchema);
};

export const resetMetaTags = (baseUrl = 'https://dosmundos.pe') => {
  const defaultTitle = 'Dos Mundos - Центр интегрированного развития';
  const defaultDescription = 'Центр интегрированного развития Dos Mundos - исцеление тела и ума для гармонии с душой';
  const defaultImage = `${baseUrl}/og-default.jpg`;

  document.title = defaultTitle;

  setMeta('og:title', defaultTitle, true);
  setMeta('og:description', defaultDescription, true);
  setMeta('og:image', defaultImage, true);
  setMeta('og:url', baseUrl, true);
  setMeta('description', defaultDescription);
  setLink('canonical', baseUrl);
};

/**
 * Update meta tags for a podcast episode page (SEO + Open Graph + Twitter + JSON-LD)
 */
export const updateEpisodeMetaTags = (episode, questions, lang, baseUrl = 'https://dosmundos.pe') => {
  if (!episode) return;

  const title = episode.title || `Эпизод ${episode.date || ''}`;
  const episodeUrl = `${baseUrl}/${lang}/${episode.slug}`;
  const image = `${baseUrl}/og-default.jpg`;
  
  // Build description from questions/timecodes
  let description = 'Dos Mundos Radio — подкаст о духовном развитии';
  if (questions && questions.length > 0) {
    description = questions.slice(0, 5).map(q => q.title).join(' • ');
  }

  // Update page title
  document.title = `${title} | Dos Mundos Radio`;

  // Update canonical URL
  setLink('canonical', episodeUrl);

  // Standard SEO
  setMeta('description', description.substring(0, 160));
  setMeta('robots', 'index, follow, max-snippet:-1, max-image-preview:large');
  setMeta('author', 'Dos Mundos');

  // Open Graph
  setMeta('og:type', 'article', true);
  setMeta('og:title', title, true);
  setMeta('og:description', description.substring(0, 200), true);
  setMeta('og:url', episodeUrl, true);
  setMeta('og:image', image, true);
  setMeta('og:site_name', 'Dos Mundos Radio', true);
  setMeta('og:locale', `${lang}_${lang === 'en' ? 'US' : lang.toUpperCase()}`, true);
  
  if (episode.date) {
    setMeta('article:published_time', new Date(episode.date).toISOString(), true);
  }
  setMeta('article:author', 'Dos Mundos', true);
  setMeta('article:section', 'Подкаст', true);

  if (episode.audioUrl || episode.audio_url) {
    setMeta('og:audio', episode.audioUrl || episode.audio_url, true);
  }

  // Twitter Card
  setMeta('twitter:card', 'summary_large_image');
  setMeta('twitter:title', title);
  setMeta('twitter:description', description.substring(0, 200));
  setMeta('twitter:image', image);
  setMeta('twitter:site', '@DosMundosPe');

  // JSON-LD for PodcastEpisode
  let schemaScript = document.getElementById('episode-jsonld');
  if (!schemaScript) {
    schemaScript = document.createElement('script');
    schemaScript.type = 'application/ld+json';
    schemaScript.id = 'episode-jsonld';
    document.head.appendChild(schemaScript);
  }

  const episodeSchema = {
    "@context": "https://schema.org",
    "@type": "PodcastEpisode",
    "name": title,
    "description": description,
    "url": episodeUrl,
    "datePublished": episode.date ? new Date(episode.date).toISOString() : undefined,
    "inLanguage": lang,
    "image": image,
    "partOfSeries": {
      "@type": "PodcastSeries",
      "name": "Dos Mundos Radio",
      "url": `${baseUrl}/ru/episodes`
    },
    "publisher": {
      "@type": "Organization",
      "name": "Dos Mundos",
      "url": baseUrl,
      "logo": { "@type": "ImageObject", "url": `${baseUrl}/favicon.png` }
    }
  };

  if (episode.audioUrl || episode.audio_url) {
    episodeSchema.associatedMedia = {
      "@type": "MediaObject",
      "contentUrl": episode.audioUrl || episode.audio_url,
      "encodingFormat": "audio/mpeg"
    };
  }

  schemaScript.textContent = JSON.stringify(episodeSchema);
};

/**
 * Update meta tags for the episodes list page
 */
export const updateEpisodesListMetaTags = (lang, baseUrl = 'https://dosmundos.pe') => {
  const titles = {
    ru: 'Все эпизоды — Dos Mundos Radio',
    es: 'Todos los episodios — Dos Mundos Radio',
    en: 'All Episodes — Dos Mundos Radio',
    de: 'Alle Episoden — Dos Mundos Radio',
    fr: 'Tous les épisodes — Dos Mundos Radio',
    pl: 'Wszystkie odcinki — Dos Mundos Radio'
  };
  const descriptions = {
    ru: 'Полный список эпизодов подкаста Dos Mundos Radio. Духовное развитие, аяуаска, медитации, энергетические практики.',
    es: 'Lista completa de episodios del podcast Dos Mundos Radio. Desarrollo espiritual, ayahuasca, meditaciones.',
    en: 'Complete episode list of Dos Mundos Radio podcast. Spiritual development, ayahuasca, meditations, energy practices.',
    de: 'Vollständige Episodenliste des Dos Mundos Radio Podcasts.',
    fr: 'Liste complète des épisodes du podcast Dos Mundos Radio.',
    pl: 'Pełna lista odcinków podcastu Dos Mundos Radio.'
  };

  const title = titles[lang] || titles.ru;
  const description = descriptions[lang] || descriptions.ru;
  const pageUrl = `${baseUrl}/${lang}/episodes`;

  document.title = title;
  setLink('canonical', pageUrl);
  setMeta('description', description);
  setMeta('robots', 'index, follow');
  setMeta('og:type', 'website', true);
  setMeta('og:title', title, true);
  setMeta('og:description', description, true);
  setMeta('og:url', pageUrl, true);
  setMeta('og:image', `${baseUrl}/og-default.jpg`, true);
  setMeta('og:site_name', 'Dos Mundos Radio', true);
  setMeta('twitter:card', 'summary_large_image');
  setMeta('twitter:title', title);
  setMeta('twitter:description', description);
};

/**
 * Update meta tags for the articles list page
 */
export const updateArticlesListMetaTags = (lang, baseUrl = 'https://dosmundos.pe') => {
  const titles = {
    ru: 'Статьи — Dos Mundos',
    es: 'Artículos — Dos Mundos',
    en: 'Articles — Dos Mundos',
    de: 'Artikel — Dos Mundos',
    fr: 'Articles — Dos Mundos',
    pl: 'Artykuły — Dos Mundos'
  };
  const descriptions = {
    ru: 'Статьи центра интегрального развития Dos Mundos. Духовность, аяуаска, медитации, энергетические практики, шаманизм.',
    es: 'Artículos del centro de desarrollo integral Dos Mundos. Espiritualidad, ayahuasca, meditaciones, prácticas energéticas.',
    en: 'Articles from Dos Mundos integral development center. Spirituality, ayahuasca, meditations, energy practices.',
    de: 'Artikel des integralen Entwicklungszentrums Dos Mundos.',
    fr: 'Articles du centre de développement intégral Dos Mundos.',
    pl: 'Artykuły centrum integralnego rozwoju Dos Mundos.'
  };

  const title = titles[lang] || titles.ru;
  const description = descriptions[lang] || descriptions.ru;
  const pageUrl = `${baseUrl}/${lang}/articles`;

  document.title = title;
  setLink('canonical', pageUrl);
  setMeta('description', description);
  setMeta('robots', 'index, follow');
  setMeta('og:type', 'website', true);
  setMeta('og:title', title, true);
  setMeta('og:description', description, true);
  setMeta('og:url', pageUrl, true);
  setMeta('og:image', `${baseUrl}/og-default.jpg`, true);
  setMeta('og:site_name', 'Dos Mundos', true);
  setMeta('twitter:card', 'summary_large_image');
  setMeta('twitter:title', title);
  setMeta('twitter:description', description);
};
