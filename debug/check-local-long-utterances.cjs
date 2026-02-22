const fs = require('fs');
const path = require('path');

const audioDir = 'C:/Users/alexb/OneDrive/Desktop/Peru/Audio';
const MAX_DURATION = 2 * 60 * 1000; // 2 minutes in milliseconds

console.log('=== Checking local JSON files for long utterances ===\n');

// Проверяем все JSON файлы в папке
const files = fs.readdirSync(audioDir).filter(f => f.endsWith('.json'));

for (const filename of files) {
  // Проверяем только последние 6 эпизодов
  const slugMatch = filename.match(/(\d{4}-\d{2}-\d{2})_?.*?\.json/);
  if (!slugMatch) continue;
  
  const slug = slugMatch[1];
  
  // Последние 6 эпизодов:
  // 2025-12-10, 2025-12-24, 2025-12-31, 2026-01-28, 2026-02-04, 2026-02-11
  const isRecent = ['2025-12-10', '2025-12-24', '2025-12-31', '2026-01-28', '2026-02-04', '2026-02-11'].includes(slug);
  if (!isRecent) continue;
  
  const filePath = path.join(audioDir, filename);
  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);
  
  let utterances;
  if (data.utterances && data.utterances.length > 0) {
    utterances = data.utterances;
  } else if (data.words && data.words.length > 0) {
    // Пропускаем файлы без utterances
    console.log(`${filename}: No utterances, checking words only...\n`);
    continue;
  } else {
    console.log(`${filename}: No transcript data\n`);
    continue;
  }
  
  const longUtterances = utterances.filter(u => u.end - u.start > MAX_DURATION);
  
  if (longUtterances.length > 0) {
    console.log(`=== ${filename} ===`);
    console.log(`Found ${longUtterances.length} utterances longer than 2 minutes:\n`);
    
    longUtterances.forEach((u, i) => {
      const duration = (u.end - u.start) / 1000; // seconds
      const minutes = Math.floor(duration / 60);
      const seconds = Math.floor(duration % 60);
      
      console.log(`${i + 1}. ${minutes}:${seconds.toString().padStart(2, '0')} (${duration.toFixed(1)} sec)`);
      console.log(`   Speaker: ${u.speaker}`);
      console.log(`   Text: ${u.text.substring(0, 150)}...`);
      console.log('');
    });
  }
}

console.log('=== Done ===');
