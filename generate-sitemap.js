import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const baseUrl = 'https://dosmundos.pe';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const generateSitemap = async () => {
  try {
    console.log('Fetching articles from Supabase...');
    
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
        
        // At minimum, include Russian version
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
        // Add Russian version for old articles
        allArticles.push({
          id: article.id,
          lang: 'ru',
          publishedAt: article.published_at
        });
      });
    }

    // Deduplicate articles
    const uniqueArticles = [];
    const seen = new Set();
    allArticles.forEach(article => {
      const key = `${article.lang}/${article.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueArticles.push(article);
      }
    });

    console.log(`Found ${uniqueArticles.length} unique article pages`);

    // Generate sitemap
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Homepage -->
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- Language versions of homepage -->
  ${['es', 'en', 'de', 'fr', 'pl'].map(lang => `
  <url>
    <loc>${baseUrl}/${lang}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  `).join('')}
  
  <!-- Articles -->
  ${uniqueArticles.map(article => `
  <url>
    <loc>${baseUrl}/${article.lang}/articles/${article.id}</loc>
    <lastmod>${article.publishedAt ? new Date(article.publishedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${article.lang === 'ru' ? 'weekly' : 'monthly'}</changefreq>
    <priority>${article.lang === 'ru' ? '0.8' : '0.7'}</priority>
  </url>
  `).join('')}
  
  <!-- Other important pages -->
  ${['about', 'events', 'volunteers', 'player', 'articles'].map(page => `
  <url>
    <loc>${baseUrl}/ru/${page}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  ${['es', 'en', 'de', 'fr', 'pl'].map(lang => `
  <url>
    <loc>${baseUrl}/${lang}/${page}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  `).join('')}
  `).join('')}
</urlset>`;

    // Save to public directory
    const outputPath = path.join(process.cwd(), 'public', 'sitemap.xml');
    fs.writeFileSync(outputPath, sitemap, 'utf-8');
    console.log(`Sitemap generated successfully at ${outputPath}`);
    
  } catch (error) {
    console.error('Error generating sitemap:', error);
  }
};

generateSitemap();
