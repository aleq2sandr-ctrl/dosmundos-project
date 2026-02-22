import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import saveTranscript from './api/save-transcript.js';
import handleTelegramPreview from './api/telegram-preview.js';
import { handleSEORender } from './api/seo-render.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('SERVICE_ROLE_KEY:', process.env.SERVICE_ROLE_KEY ? 'set' : 'not set');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Range', 'Accept-Ranges', 'Content-Range']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.text({ limit: '50mb' }));

// Bot Detection Middleware
// Social media bots (for Telegram Instant View, etc.)
const socialBotUserAgents = [
  'TelegramBot',
  'Twitterbot',
  'facebookexternalhit',
  'WhatsApp',
  'LinkedInBot',
  'Discordbot'
];

// Search engine and AI crawler bots (for SEO)
const seoBotUserAgents = [
  'Googlebot',
  'Bingbot',
  'bingbot',
  'Slurp',           // Yahoo
  'DuckDuckBot',
  'Baiduspider',
  'YandexBot',
  'Sogou',
  'Exabot',
  'ia_archiver',     // Alexa
  'MJ12bot',
  'AhrefsBot',
  'SemrushBot',
  'DotBot',
  'rogerbot',
  'Applebot',        // Apple/Siri
  // AI crawlers
  'GPTBot',          // OpenAI
  'ChatGPT-User',   // ChatGPT browsing
  'Google-Extended', // Google AI / Bard
  'Claude-Web',     // Anthropic Claude
  'Anthropic',
  'CCBot',           // Common Crawl (used by AI)
  'PerplexityBot',   // Perplexity AI
  'YouBot',          // You.com
  'cohere-ai',       // Cohere
  'Bytespider',      // ByteDance/TikTok AI
  'Amazonbot',       // Amazon
  'PetalBot',        // Huawei
  'meta-externalagent', // Meta AI
];

const isSocialBot = (userAgent) => {
  if (!userAgent) return false;
  return socialBotUserAgents.some(bot => userAgent.includes(bot));
};

const isSEOBot = (userAgent) => {
  if (!userAgent) return false;
  return seoBotUserAgents.some(bot => userAgent.toLowerCase().includes(bot.toLowerCase()));
};

// Telegram Instant View Preview Route (direct /preview/ access for testing)
app.get('/preview/:lang/:episodeSlug', handleTelegramPreview);

// SEO Bot middleware — serve pre-rendered HTML to search engines & AI crawlers
app.use((req, res, next) => {
  const userAgent = req.headers['user-agent'] || '';
  
  // Skip API routes, static assets, and preview routes
  if (req.path.startsWith('/api/') || req.path.startsWith('/preview/') || 
      req.path.startsWith('/assets/') || req.path.startsWith('/img/') ||
      req.path.match(/\.\w+$/)) {
    return next();
  }

  // Social bots get Telegram-style preview
  // Also check X-Telegram-IV header set by nginx for Telegram IP ranges
  const isTelegramIV = req.headers['x-telegram-iv'] === '1';
  if (isSocialBot(userAgent) || isTelegramIV) {
    const match = req.path.match(/^\/(ru|es|en|de|fr|pl)\/([^/]+)\/?$/);
    if (match) {
      console.log(`🤖 Social bot: ${userAgent.substring(0, 50)} → ${req.path} (iv-header: ${isTelegramIV})`);
      req.params = { lang: match[1], episodeSlug: match[2] };
      return handleTelegramPreview(req, res);
    }
  }

  // SEO bots get SEO-optimized HTML
  if (isSEOBot(userAgent) || req.query._escaped_fragment_ !== undefined || req.query.seo === 'true') {
    console.log(`🔍 SEO bot: ${userAgent.substring(0, 60)} → ${req.path}`);
    return handleSEORender(req, res, next);
  }

  next();
});

// API routes
app.post('/api/save-transcript', async (req, res) => {
  console.log('POST /api/save-transcript called');
  try {
    await saveTranscript(req, res);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Ping for connectivity check
app.head('/ping', (req, res) => {
  res.status(200).end();
});

// Serve llms.txt for AI discovery
app.get('/llms.txt', (req, res) => {
  const llmsPath = path.join(__dirname, 'public', 'llms.txt');
  if (fs.existsSync(llmsPath)) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.sendFile(llmsPath);
  } else {
    res.status(404).send('Not found');
  }
});

// Serve static files from dist
app.use(express.static(path.join(__dirname, 'dist')));

// Handle SPA routing
app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Ready to handle requests`);
});
