#!/usr/bin/env node

/**
 * Локальный тест прокси-эндпоинта для аудио
 * Запуск: node test-proxy.js
 */

import http from 'http';
import url from 'url';
import handler from './api/proxy-audio.js';

const PORT = 3000;

const server = http.createServer(async (req, res) => {
  // Парсим URL
  const parsedUrl = url.parse(req.url, true);
  
  // Подготавливаем req объект как в Vercel
  req.method = req.method;
  req.query = parsedUrl.query;
  req.headers = req.headers;
  
  // Добавляем методы res
  const originalWriteHead = res.writeHead.bind(res);
  res.setHeader = res.setHeader || ((key, value) => {
    res.setHeader(key, value);
  });

  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  
  try {
    await handler(req, res);
  } catch (error) {
    console.error('Handler error:', error);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  }
});

server.listen(PORT, () => {
  console.log(`\n✅ Proxy server запущен на http://localhost:${PORT}`);
  console.log(`\n📝 Примеры запросов:\n`);
  console.log(`1. Основной тест:`);
  console.log(`   http://localhost:${PORT}/api/proxy-audio?url=https%3A%2F%2Fsilver-lemur-512881.hostingersite.com%2Ffiles%2Faudio%2F2025-10-29_RU-1762981066683.mp3\n`);
  console.log(`2. С Range заголовком (для seek):`);
  console.log(`   curl -i -H "Range: bytes=0-1023" http://localhost:${PORT}/api/proxy-audio?url=https%3A%2F%2Fsilver-lemur-512881.hostingersite.com%2Ffiles%2Faudio%2F2025-10-29_RU-1762981066683.mp3\n`);
  console.log(`Нажмите Ctrl+C для остановки\n`);
});

server.on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});
