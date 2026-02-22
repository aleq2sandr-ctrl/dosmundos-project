import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import saveTranscript from './api/save-transcript.js';
import handleTelegramPreview from './api/telegram-preview.js';

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
const botUserAgents = [
  'TelegramBot',
  'Twitterbot',
  'facebookexternalhit',
  'WhatsApp',
  'LinkedInBot',
  'Discordbot'
];

const isBot = (userAgent) => {
  if (!userAgent) return false;
  return botUserAgents.some(bot => userAgent.includes(bot));
};

// Telegram Instant View Preview Route (direct /preview/ access for testing)
app.get('/preview/:lang/:episodeSlug', handleTelegramPreview);

// Telegram Instant View - serve article content when TelegramBot hits /:lang/:slug
// This route is triggered by nginx proxying TelegramBot requests to Node.js
app.get('/:lang/:episodeSlug', (req, res, next) => {
  const { lang, episodeSlug } = req.params;
  // Only handle 2-letter lang codes, skip assets/api/preview
  if (!lang || lang.length !== 2 || ['as', 'ap'].includes(lang)) return next();
  const userAgent = req.headers['user-agent'] || '';
  if (isBot(userAgent) || req.query.bot === 'true') {
    console.log(`🤖 Bot detected: ${userAgent.substring(0, 50)} → /${lang}/${episodeSlug}`);
    return handleTelegramPreview(req, res);
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
