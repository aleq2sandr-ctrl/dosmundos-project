const fs = require('fs');
const path = require('path');
const audioDir = 'C:/Users/alexb/OneDrive/Desktop/Peru/Audio';
const filePath = path.join(audioDir, '2025-12-10_RU.json');
const content = fs.readFileSync(filePath, 'utf8');
const data = JSON.parse(content);

console.log('=== 2025-12-10_RU.json ===');
console.log('Has utterances:', data.utterances ? data.utterances.length : 'null');
console.log('Has words:', data.words ? data.words.length : 'null');

if (data.utterances && data.utterances.length > 0) {
  console.log('');
  console.log('First 5 utterances from JSON:');
  data.utterances.slice(0, 5).forEach((u, i) => {
    console.log(i + 1 + '. speaker:', u.speaker, 'text:', u.text.substring(0, 50) + '...');
  });
  
  // Проверяем single-word utterances в JSON
  const singleWord = data.utterances.filter(u => {
    const text = u.text.trim();
    return text.length > 0 && !text.includes(' ');
  });
  console.log('');
  console.log('Single-word utterances in JSON:', singleWord.length);
}
