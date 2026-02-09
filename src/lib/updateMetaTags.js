/**
 * Utility to update meta tags for SEO and social media preview (Open Graph, Twitter Card)
 */

export const updateMetaTags = (article, baseUrl = 'https://dosmundos.pe') => {
  if (!article) return;

  const title = article.title || 'Dos Mundos';
  const description = article.summary || 'Центр интегрированного развития Dos Mundos';
  const articleUrl = `${baseUrl}/${article.lang || 'ru'}/articles/${article.id}`;
  const image = article.image || `${baseUrl}/og-default.jpg`;

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

  // Update page title
  document.title = `${title} | Dos Mundos`;

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

  setMeta('og:title', defaultTitle, true);
  setMeta('og:description', defaultDescription, true);
  setMeta('og:image', defaultImage, true);
  setMeta('description', defaultDescription);
};
