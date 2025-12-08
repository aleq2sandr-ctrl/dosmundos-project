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

// Telegram Instant View Preview Route
app.get('/preview/:lang/:episodeSlug', handleTelegramPreview);

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

// Serve static files from dist
app.use(express.static(path.join(__dirname, 'dist')));

// Handle SPA routing and Bot detection
app.get(/(.*)/, (req, res, next) => {
  // Check if it's a bot requesting an episode page
  // Pattern: /:lang/:episodeSlug (where lang is 2 chars)
  const match = req.path.match(/^\/([a-z]{2})\/([^/]+)$/);
  
  if (match && isBot(req.headers['user-agent'])) {
    const [_, lang, episodeSlug] = match;
    // Exclude static assets or other routes if necessary
    if (!['assets', 'api', 'preview'].includes(lang)) {
      console.log(`🤖 Bot detected (${req.headers['user-agent']}) for ${req.path}, serving preview...`);
      req.params.lang = lang;
      req.params.episodeSlug = episodeSlug;
      return handleTelegramPreview(req, res);
    }
  }

  // Otherwise serve index.html for SPA
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Ready to handle requests`);
});
