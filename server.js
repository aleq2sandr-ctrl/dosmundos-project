import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import saveTranscript from './api/save-transcript.js';
import handleTelegramPreview from './api/telegram-preview.js';

dotenv.config();

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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Local API server running on http://localhost:${PORT}`);
  console.log(`📡 Ready to handle transcript save requests`);
});
