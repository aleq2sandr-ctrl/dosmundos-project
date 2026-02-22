import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const baseUrl = 'https://dosmundos.pe';
const SUPPORTED_LANGUAGES = ['ru', 'es', 'en', 'de', 'fr', 'pl'];

const generateSitemap = async () => {
  let uniqueArticles = [];
  let episodeEntries = [];
  
  if (supabaseUrl && supabaseKey) {
    console.log('Fetching data from Supabase...');
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // ===== EPISODES =====
      console.log('Fetching episodes...');
      const { data: episodes, error: epError } = await supabase
        .from('episodes')
        .select('slug, date')
        .order('date', { ascending: false });

      if (epError) {
        console.error('Error fetching episodes:', epError);
      }

      if (episodes && episodes.length > 0) {
        // Get all transcripts to know which languages each episode has
        const { data: transcripts } = await supabase
          .from('transcripts')
          .select('episode_slug, lang');

        const episodeLangs = {};
        if (transcripts) {
          transcripts.forEach(t => {
            if (!episodeLangs[t.episode_slug]) episodeLangs[t.episode_slug] = new Set();
            episodeLangs[t.episode_slug].add(t.lang);
          });
        }

        episodes.forEach(ep => {
          const langs = episodeLangs[ep.slug] || new Set(['ru']);
          // Always include Russian version
          langs.add('ru');
          
          langs.forEach(lang => {
            episodeEntries.push({
              slug: ep.slug,
              lang,
              date: ep.date,
              // More recent episodes have higher priority
              priority: lang === 'ru' ? '0.8' : '0.7'
            });
          });
        });

        console.log(`Found ${episodes.length} episodes → ${episodeEntries.length} episode URLs`);
      }

      // ===== ARTICLES =====
      console.log('Fetching articles...');
      // Fetch articles from new schema
      const { data: articlesV2, error: errorV2 } = await supabase
        .from('articles_v2')
        .select('slug, published_at, article_translations(title, language_code)');

      if (errorV2) {
        console.error('Error fetching from articles_v2:', errorV2);
      }

      // Fetch articles from old schema as fallback
      const { data: articlesV1, error: errorV1 } = await supabase
        .from('articles')
        .select('id, published_at');

      if (errorV1) {
        console.error('Error fetching from articles:', errorV1);
      }

      // Combine and deduplicate articles
      const allArticles = [];
      
      if (articlesV2) {
        articlesV2.forEach(article => {
          const translations = article.article_translations || [];
          const languages = [...new Set(translations.map(t => t.language_code))];
          
          if (languages.length === 0) {
            languages.push('ru');
          }

          languages.forEach(lang => {
            allArticles.push({
              id: article.slug,
              lang,
              publishedAt: article.published_at
            });
          });
        });
      }

      if (articlesV1) {
        articlesV1.forEach(article => {
          allArticles.push({
            id: article.id,
            lang: 'ru',
            publishedAt: article.published_at
          });
        });
      }

      // Deduplicate articles
      const seen = new Set();
      uniqueArticles = allArticles.filter(article => {
        const key = `${article.lang}/${article.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          return true;
        }
        return false;
      });

      console.log(`Found ${uniqueArticles.length} unique article pages`);
    } catch (error) {
      console.error('Error fetching from Supabase:', error);
      console.log('Continuing with basic sitemap...');
    }
  } else {
    console.log('Supabase environment variables not available. Generating basic sitemap...');
  }

  const today = new Date().toISOString().split('T')[0];

  // Generate sitemap
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <!-- Homepage -->
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
    ${SUPPORTED_LANGUAGES.map(l => `<xhtml:link rel="alternate" hreflang="${l}" href="${baseUrl}/${l}" />`).join('\n    ')}
    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}" />
  </url>
  
  <!-- Language versions of homepage -->
  ${SUPPORTED_LANGUAGES.map(lang => `
  <url>
    <loc>${baseUrl}/${lang}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
    ${SUPPORTED_LANGUAGES.map(l => `<xhtml:link rel="alternate" hreflang="${l}" href="${baseUrl}/${l}" />`).join('\n    ')}
    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}" />
  </url>`).join('')}
  
  <!-- Episodes List Pages -->
  ${SUPPORTED_LANGUAGES.map(lang => `
  <url>
    <loc>${baseUrl}/${lang}/episodes</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
    ${SUPPORTED_LANGUAGES.map(l => `<xhtml:link rel="alternate" hreflang="${l}" href="${baseUrl}/${l}/episodes" />`).join('\n    ')}
  </url>`).join('')}
  
  <!-- Individual Episodes -->
  ${episodeEntries.map(ep => `
  <url>
    <loc>${baseUrl}/${ep.lang}/${ep.slug}</loc>
    <lastmod>${ep.date ? new Date(ep.date).toISOString().split('T')[0] : today}</lastmod>
    <changefreq>${ep.lang === 'ru' ? 'weekly' : 'monthly'}</changefreq>
    <priority>${ep.priority}</priority>
  </url>`).join('')}
  
  <!-- Articles -->
  ${uniqueArticles.map(article => `
  <url>
    <loc>${baseUrl}/${article.lang}/articles/${article.id}</loc>
    <lastmod>${article.publishedAt ? new Date(article.publishedAt).toISOString().split('T')[0] : today}</lastmod>
    <changefreq>${article.lang === 'ru' ? 'weekly' : 'monthly'}</changefreq>
    <priority>${article.lang === 'ru' ? '0.8' : '0.7'}</priority>
  </url>`).join('')}
  
  <!-- Other important pages -->
  ${['about', 'events', 'volunteers', 'articles', 'deep-search'].map(page => `
  ${SUPPORTED_LANGUAGES.map(lang => `
  <url>
    <loc>${baseUrl}/${lang}/${page}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${lang === 'ru' ? '0.7' : '0.6'}</priority>
    ${SUPPORTED_LANGUAGES.map(l => `<xhtml:link rel="alternate" hreflang="${l}" href="${baseUrl}/${l}/${page}" />`).join('\n    ')}
  </url>`).join('')}`).join('')}
</urlset>`;

  // Save to public directory
  const outputPath = path.join(process.cwd(), 'public', 'sitemap.xml');
  fs.writeFileSync(outputPath, sitemap, 'utf-8');
  
  const totalUrls = 1 + SUPPORTED_LANGUAGES.length + SUPPORTED_LANGUAGES.length + episodeEntries.length + uniqueArticles.length + 5 * SUPPORTED_LANGUAGES.length;
  console.log(`\n✅ Sitemap generated: ${totalUrls} URLs`);
  console.log(`   - ${episodeEntries.length} episode pages`);
  console.log(`   - ${uniqueArticles.length} article pages`);
  console.log(`   → ${outputPath}`);
};

generateSitemap().catch(error => {
  console.error('Error generating sitemap:', error);
  process.exit(1);
});
