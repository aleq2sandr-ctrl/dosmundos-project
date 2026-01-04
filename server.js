import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import saveTranscript from './api/save-transcript.js';
import { scheduleTempCleanup } from './src/lib/transcriptStorageService.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Schedule cleanup on server start
scheduleTempCleanup(1); // Run every 1 hour

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

// API routes
app.post('/api/save-transcript', async (req, res) => {
  console.log('POST /api/save-transcript called');
  console.log('Body size:', req.body ? Buffer.byteLength(JSON.stringify(req.body)) / 1024 / 1024 : 0, 'MB');
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
