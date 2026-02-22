const fs = require('fs');
const path = require('path');

const audioDir = 'C:/Users/alexb/OneDrive/Desktop/Peru/Audio';
const files = fs.readdirSync(audioDir).filter(f => f.endsWith('.json'));

console.log('=== Analyzing single-word utterances ===\n');

files.forEach(filename => {
  const filePath = path.join(audioDir, filename);
  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);
  
  let utterances;
  if (data.utterances && data.utterances.length > 0) {
    utterances = data.utterances;
  } else if (data.words && data.words.length > 0) {
    // Пропускаем файлы без utterances - они конвертируются правильно
    return;
  } else {
    return;
  }
  
  // Ищем single-word utterances
  const singleWord = utterances.filter(u => {
    const text = u.text.trim();
    return text.length > 0 && !text.includes(' ');
  });
  
  if (singleWord.length > 0) {
    console.log(`=== ${filename} ===`);
    console.log(`Total: ${utterances.length}, Single-word: ${singleWord.length}\n`);
    
    // Показываем первые 3 single-word utterances с контекстом
    singleWord.slice(0, 3).forEach((u, i) => {
      const idx = utterances.indexOf(u);
      const prev = idx > 0 ? utterances[idx - 1] : null;
      const next = idx < utterances.length - 1 ? utterances[idx + 1] : null;
      
      const startMin = Math.floor(u.start / 60000);
      const startSec = Math.floor((u.start % 60000) / 1000);
      
      console.log(`${i + 1}. ${startMin}:${startSec.toString().padStart(2, '0')} - "${u.text}" (${u.speaker})`);
      
      if (prev) {
        console.log(`   Prev: "${prev.text.substring(0, 40)}..." (${prev.speaker})`);
      }
      if (next) {
        console.log(`   Next: "${next.text.substring(0, 40)}..." (${next.speaker})`);
      }
      console.log('');
    });
  }
});
