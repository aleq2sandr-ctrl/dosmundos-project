/**
 * Utility to update meta tags for social media preview (Open Graph, Twitter Card)
 */

export const updateMetaTags = (article, baseUrl = 'https://dosmundos.pe') => {
  if (!article) return;

  const title = article.title || 'Dos Mundos';
  const description = article.summary || 'Центр интегрированного развития Dos Mundos';
  const articleUrl = `${baseUrl}/${article.lang || 'ru'}/articles/${article.id}`;
  const image = article.image || `${baseUrl}/og-default.jpg`;

  // Remove existing meta tags
  ['og:title', 'og:description', 'og:url', 'og:image', 'og:type', 'twitter:title', 'twitter:description', 'twitter:image', 'twitter:card'].forEach(property => {
    const element = document.querySelector(`meta[property="${property}"], meta[name="${property}"]`);
    if (element) element.remove();
  });

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

  // Open Graph tags
  setMeta('og:title', title, true);
  setMeta('og:description', description, true);
  setMeta('og:url', articleUrl, true);
  setMeta('og:image', image, true);
  setMeta('og:type', 'article', true);

  // Twitter Card tags
  setMeta('twitter:card', 'summary_large_image');
  setMeta('twitter:title', title);
  setMeta('twitter:description', description);
  setMeta('twitter:image', image);

  // Standard meta tags
  setMeta('description', description);
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
