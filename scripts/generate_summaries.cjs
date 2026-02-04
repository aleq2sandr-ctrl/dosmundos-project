const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

// Configuration
const ARTICLES_DIR = path.join(__dirname, '../public/articles');
const INDEX_FILE = path.join(ARTICLES_DIR, 'index.json');
const SUMMARIES_FILE = path.join(__dirname, '../article_summaries.json');
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

if (!DEEPSEEK_API_KEY) {
  console.error('Error: DEEPSEEK_API_KEY environment variable is not set');
  process.exit(1);
}

// Helper to call DeepSeek API
async function generateSummary(text) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: "Ты — редактор блога о духовном развитии. Твоя задача — прочитать текст статьи и написать краткое, емкое описание (summary) на русском языке. Описание должно быть интересным, отражать суть статьи и занимать 1-2 предложения. Не используй фразы вроде 'Статья рассказывает о...' или 'В данном тексте...', пиши сразу суть."
        },
        {
          role: "user",
          content: text.substring(0, 15000) // Limit context window if needed
        }
      ],
      temperature: 0.7
    });

    const options = {
      hostname: 'api.deepseek.com',
      path: '/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(responseBody);
            const summary = parsed.choices[0].message.content.trim();
            resolve(summary);
          } catch (e) {
            reject(new Error(`Failed to parse response: ${e.message}`));
          }
        } else {
          reject(new Error(`API Error: ${res.statusCode} ${responseBody}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

// Helper to strip HTML tags
function stripHtml(html) {
  return html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
}

async function main() {
  // Load existing summaries
  let summaries = {};
  if (fs.existsSync(SUMMARIES_FILE)) {
    summaries = JSON.parse(fs.readFileSync(SUMMARIES_FILE, 'utf8'));
  }

  // Read index.json
  if (!fs.existsSync(INDEX_FILE)) {
    console.error('Error: index.json not found. Run process_articles.sh first.');
    process.exit(1);
  }

  const articles = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
  let updatedCount = 0;

  console.log(`Found ${articles.length} articles.`);

  for (const article of articles) {
    const { id, title, contentUrl } = article;
    
    // Skip if we already have a summary in our local cache (unless forced)
    // We check if the summary in index.json is empty or generic, OR if we don't have it in our cache
    // But the user wants to update ALL summaries or ensure they are good.
    // Let's check if we have a cached summary.
    
    if (summaries[title] && summaries[title].length > 10) {
      // We have a cached summary, ensure it's in the article object (for the next step)
      // But here we are just building the cache.
      continue;
    }

    console.log(`Processing: ${title}`);
    
    const htmlPath = path.join(ARTICLES_DIR, path.basename(contentUrl));
    if (!fs.existsSync(htmlPath)) {
      console.warn(`Warning: HTML file not found for ${title}: ${htmlPath}`);
      continue;
    }

    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    const textContent = stripHtml(htmlContent);

    if (textContent.length < 50) {
      console.warn(`Warning: Content too short for ${title}`);
      continue;
    }

    try {
      console.log(`Generating summary for "${title}"...`);
      const summary = await generateSummary(textContent);
      console.log(`Summary: ${summary}`);
      
      summaries[title] = summary;
      updatedCount++;
      
      // Save progress periodically
      fs.writeFileSync(SUMMARIES_FILE, JSON.stringify(summaries, null, 2));
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`Error generating summary for ${title}:`, error.message);
    }
  }

  console.log(`Finished. Updated ${updatedCount} summaries.`);
  
  // Now we need to update process_articles.sh to use these summaries
  // OR we can just update index.json directly here, but process_articles.sh will overwrite it next time it runs.
  // The best way is to modify process_articles.sh to read from article_summaries.json
}

main();
