const fs = require('fs');
const path = require('path');
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

const ARTICLES_DIR = path.join(__dirname, '../public/articles');
const INDEX_FILE = path.join(ARTICLES_DIR, 'index.json');

async function translateText(text, targetLang, isHtml = false) {
  if (!text) return '';
  
  const prompt = isHtml 
    ? `Translate the following HTML content to ${targetLang}. Keep all HTML tags, classes, and structure exactly as they are. Only translate the visible text content. Do not add any explanations.`
    : `Translate the following text to ${targetLang}. Keep the meaning precise.`;

  const data = JSON.stringify({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: "You are a professional translator." },
      { role: "user", content: `${prompt}\n\n${text.substring(0, 15000)}` } // Limit to avoid context overflow
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
          resolve(text); // Fallback to original
          return;
        }
        try {
          const response = JSON.parse(body);
          resolve(response.choices[0].message.content.trim());
        } catch (e) {
          console.error('JSON Parse Error:', e);
          resolve(text);
        }
      });
    });

    req.on('error', (e) => {
      console.error('Request Error:', e);
      resolve(text);
    });

    req.write(data);
    req.end();
  });
}

async function main() {
  const articles = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
  console.log(`Found ${articles.length} articles to process.`);

  for (const article of articles) {
    const { id, title, summary, contentUrl, categories, youtubeUrl } = article;
    
    // Check if exists (Optional: remove this block to force update)
    // const { data: existing } = await supabase
    //   .from('articles')
    //   .select('id')
    //   .eq('slug', id)
    //   .single();

    // if (existing) {
    //   console.log(`Skipping ${id} (already exists)`);
    //   continue;
    // }

    console.log(`Processing ${id}...`);

    // Read HTML content
    let content = '';
    try {
      const htmlPath = path.join(ARTICLES_DIR, path.basename(contentUrl));
      if (fs.existsSync(htmlPath)) {
        content = fs.readFileSync(htmlPath, 'utf8');
      } else {
        console.warn(`HTML file not found: ${htmlPath}`);
      }
    } catch (e) {
      console.error(`Error reading HTML for ${id}:`, e);
    }

    // Prepare data object
    const record = {
      slug: id,
      author: article.author,
      youtube_url: youtubeUrl,
      categories: categories, // Store as JSONB array
      title: { ru: title },
      summary: { ru: summary },
      content: { ru: content }
    };

    // Translate to EN and ES
    // Note: To save time/tokens, I will only translate Title and Summary for now in this demo run.
    // Uncomment content translation for full production run.
    
    console.log('  Translating to EN...');
    record.title.en = await translateText(title, 'English');
    record.summary.en = await translateText(summary, 'English');
    record.content.en = await translateText(content, 'English', true); 

    console.log('  Translating to ES...');
    record.title.es = await translateText(title, 'Spanish');
    record.summary.es = await translateText(summary, 'Spanish');
    record.content.es = await translateText(content, 'Spanish', true);

    // Upsert into Supabase
    const { error } = await supabase
      .from('articles')
      .upsert(record, { onConflict: 'slug' });

    if (error) {
      console.error(`Error inserting/updating ${id}:`, error);
    } else {
      console.log(`Successfully migrated ${id}`);
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

main();
