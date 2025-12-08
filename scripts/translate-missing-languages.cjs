const fs = require('fs');
const https = require('https');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || process.env.VITE_DEEPSEEK_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !DEEPSEEK_API_KEY) {
  console.error('Missing required environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TARGET_LANGUAGES = ['de', 'fr', 'pl'];

// Map for language names for the prompt
const LANG_NAMES = {
  de: 'German',
  fr: 'French',
  pl: 'Polish'
};

async function translateText(text, targetLangCode, isHtml = false) {
  if (!text) return '';
  
  const targetLang = LANG_NAMES[targetLangCode] || targetLangCode;
  
  const prompt = isHtml 
    ? `Translate the following HTML content to ${targetLang}. Keep all HTML tags, classes, and structure exactly as they are. Only translate the visible text content. Do not add any explanations.`
    : `Translate the following text to ${targetLang}. Keep the meaning precise.`;

  const data = JSON.stringify({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: "You are a professional translator." },
      { role: "user", content: `${prompt}\n\n${text.substring(0, 15000)}` }
    ],
    temperature: 0.3
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.deepseek.com',
      path: '/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          console.error(`API Error: ${res.statusCode} ${body}`);
          resolve(null); // Return null on failure
          return;
        }
        try {
          const response = JSON.parse(body);
          resolve(response.choices[0].message.content.trim());
        } catch (e) {
          console.error('JSON Parse Error:', e);
          resolve(null);
        }
      });
    });

    req.on('error', (e) => {
      console.error('Request Error:', e);
      resolve(null);
    });

    req.write(data);
    req.end();
  });
}

async function processCategories() {
  console.log('Processing categories...');
  
  // Fetch all categories with their English translation
  const { data: categories, error } = await supabase
    .from('categories')
    .select(`
      id,
      slug,
      category_translations!inner(name, language_code)
    `);

  if (error) {
    console.error('Error fetching categories:', error);
    return;
  }

  for (const cat of categories) {
    // Find English name to use as source
    const enTrans = cat.category_translations.find(t => t.language_code === 'en');
    if (!enTrans) {
      console.warn(`No English translation for category ${cat.slug}, skipping.`);
      continue;
    }

    for (const lang of TARGET_LANGUAGES) {
      // Check if translation already exists
      const { data: existing } = await supabase
        .from('category_translations')
        .select('id')
        .eq('category_id', cat.id)
        .eq('language_code', lang)
        .single();

      if (existing) {
        console.log(`Category ${cat.slug} already has ${lang} translation.`);
        continue;
      }

      console.log(`Translating category ${cat.slug} to ${lang}...`);
      const translatedName = await translateText(enTrans.name, lang);
      
      if (translatedName) {
        const { error: insertError } = await supabase
          .from('category_translations')
          .insert({
            category_id: cat.id,
            language_code: lang,
            name: translatedName
          });

        if (insertError) {
          console.error(`Error inserting category translation:`, insertError);
        } else {
          console.log(`Saved ${lang} translation for category ${cat.slug}`);
        }
      }
    }
  }
}

async function processArticles() {
  console.log('Processing articles...');

  // Fetch all articles
  const { count } = await supabase
    .from('articles_v2')
    .select('*', { count: 'exact', head: true });

  console.log(`Found ${count} articles.`);

  const BATCH_SIZE = 10; // Process in smaller batches
  for (let i = 0; i < count; i += BATCH_SIZE) {
    console.log(`Processing batch ${i} to ${i + BATCH_SIZE}...`);
    
    const { data: articles, error } = await supabase
      .from('articles_v2')
      .select(`
        id,
        slug,
        article_translations(title, summary, content, language_code)
      `)
      .range(i, i + BATCH_SIZE - 1);

    if (error) {
      console.error('Error fetching articles:', error);
      continue;
    }

    for (const article of articles) {
      // Find English translation as source
      const enTrans = article.article_translations.find(t => t.language_code === 'en');
      if (!enTrans) {
        console.warn(`No English translation for article ${article.slug}, skipping.`);
        continue;
      }

      for (const lang of TARGET_LANGUAGES) {
        // Check if translation already exists
        const existing = article.article_translations.find(t => t.language_code === lang);
        if (existing) {
          // console.log(`Article ${article.slug} already has ${lang} translation.`);
          continue;
        }

        console.log(`Translating article ${article.slug} to ${lang}...`);
        
        const [title, summary, content] = await Promise.all([
          translateText(enTrans.title, lang),
          translateText(enTrans.summary, lang),
          translateText(enTrans.content, lang, true)
        ]);

        if (title && content) {
          const { error: insertError } = await supabase
            .from('article_translations')
            .insert({
              article_id: article.id,
              language_code: lang,
              title,
              summary,
              content
            });

          if (insertError) {
            console.error(`Error inserting article translation:`, insertError);
          } else {
            console.log(`Saved ${lang} translation for article ${article.slug}`);
          }
        } else {
          console.error(`Failed to translate article ${article.slug} to ${lang}`);
        }
      }
    }
  }
}

async function run() {
  await processCategories();
  await processArticles();
  console.log('Translation completed!');
}

run();
