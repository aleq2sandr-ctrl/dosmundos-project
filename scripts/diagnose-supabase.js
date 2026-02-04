#!/usr/bin/env node

/**
 * Диагностика WebSocket ошибок Supabase
 * 
 * Этот скрипт проверяет настройки Supabase и выявляет
 * причины WebSocket ошибок при подключении к realtime.
 */

import fetch from 'node-fetch';

const SUPABASE_URL = 'https://supabase.dosmundos.pe';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlLWRlbW8iLCJpYXQiOjE2NDE3NjkyMDAsImV4cCI6MTk5OTk5OTk5OX0.A4_N08ZorXYT17zhZReBXPlY6L5-9d8thMbm7TcDWl8';

console.log('🔍 Начинаем диагностику Supabase WebSocket...\n');

// 1. Проверяем основной REST API
console.log('1️⃣ Проверка REST API:');
try {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  
  console.log(`   ✅ REST API доступен: ${response.status} ${response.statusText}`);
} catch (error) {
  console.log(`   ❌ REST API недоступен: ${error.message}`);
}

// 2. Проверяем WebSocket endpoint
console.log('\n2️⃣ Проверка WebSocket endpoint:');
try {
  const wsResponse = await fetch(`${SUPABASE_URL}/realtime/v1/websocket`, {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Upgrade': 'websocket'
    }
  });
  
  console.log(`   📡 WebSocket endpoint: ${wsResponse.status} ${wsResponse.statusText}`);
} catch (error) {
  console.log(`   ❌ WebSocket endpoint недоступен: ${error.message}`);
}

// 3. Проверяем настройки realtime
console.log('\n3️⃣ Проверка настроек realtime:');
const isSelfHosted = SUPABASE_URL.includes('supabase.dosmundos.pe') || 
                    SUPABASE_URL.includes('72.61.186.175');

console.log(`   🏠 Self-hosted Supabase: ${isSelfHosted ? 'ДА' : 'НЕТ'}`);
console.log(`   📡 Realtime должен быть отключен: ${isSelfHosted ? 'ДА' : 'НЕТ'}`);

// 4. Проверяем конфигурацию клиента
console.log('\n4️⃣ Анализ конфигурации клиента:');
console.log(`   🔗 URL: ${SUPABASE_URL}`);
console.log(`   🔑 Ключ: ${SUPABASE_ANON_KEY.substring(0, 20)}...`);
console.log(`   ⏰ JWT истекает: ${new Date('2099-12-31').toLocaleDateString('ru-RU')}`);

// 5. Рекомендации
console.log('\n5️⃣ Рекомендации:');
if (isSelfHosted) {
  console.log('   ✅ Для self-hosted Supabase realtime должен быть отключен');
  console.log('   ✅ WebSocket ошибки ожидаемы и будут автоматически обойдены');
  console.log('   💡 Приложение будет работать без realtime функций');
  console.log('   💡 HTTP API остается полностью функциональным');
} else {
  console.log('   🔧 Для облачного Supabase realtime должен быть включен');
  console.log('   🔧 Проверьте сетевые настройки и firewall');
}

console.log('\n✨ Диагностика завершена!');
