const fs = require('fs');
const path = require('path');

const audioDir = 'C:/Users/alexb/OneDrive/Desktop/Peru/Audio';
const filename = '2026-01-28_RU.json';
const filePath = path.join(audioDir, filename);
const content = fs.readFileSync(filePath, 'utf8');
const data = JSON.parse(content);

function convertWordsToUtterances(words) {
  if (!words || !Array.isArray(words) || words.length === 0) {
    return [];
  }

  const utterances = [];
  let currentUtterance = null;
  let utteranceId = 0;
  
  const sortedWords = [...words].sort((a, b) => a.start - b.start);

  for (const word of sortedWords) {
    const speaker = word.speaker || 'A';
    
    const timeGap = currentUtterance ? word.start - currentUtterance.end : 0;
    const isLongPause = timeGap > 3000; // Увеличиваем интервал до 3 секунд для лучшего разбиения

    if (!currentUtterance || isLongPause) {
      if (currentUtterance) {
        utterances.push(currentUtterance);
      }
      
      currentUtterance = {
        start: word.start,
        end: word.end,
        text: word.text,
        speaker: speaker,
        id: utteranceId++,
        words: [{ text: word.text, start: word.start, end: word.end, speaker: speaker }]
      };
    } else {
      currentUtterance.text += ' ' + word.text;
      currentUtterance.end = word.end;
      currentUtterance.words.push({ text: word.text, start: word.start, end: word.end, speaker: speaker });
    }
  }
  
  if (currentUtterance) {
    utterances.push(currentUtterance);
  }
  
  return utterances;
}

// Создаем utterances
const utterances = convertWordsToUtterances(data.words);
console.log('=== 2026-01-28_RU ===');
console.log('Total utterances:', utterances.length);

// Проверяем размер utterances
const singleWordCount = utterances.filter(u => {
  const text = u.text.trim();
  return text.length > 0 && !text.includes(' ');
}).length;

console.log('Single-word:', singleWordCount);
console.log('Percentage:', ((singleWordCount / utterances.length) * 100).toFixed(1) + '%');

// Проверяем первые 10 utterances
console.log('\nFirst 10 utterances:');
utterances.slice(0, 10).forEach(u => {
  const wordCount = u.text.split(' ').length;
  const duration = u.end - u.start;
  console.log(`  ${u.id + 1}: "${u.text.substring(0, 80)}..." (${wordCount} words, ${duration}ms)`);
});

// Проверяем utterances с длительностью > 30 секунд
console.log('\nLong utterances (> 30 seconds):');
const longUtterances = utterances.filter(u => (u.end - u.start) > 30000);
longUtterances.slice(0, 5).forEach(u => {
  const wordCount = u.text.split(' ').length;
  const duration = u.end - u.start;
  console.log(`  ${u.id + 1}: ${wordCount} words, ${duration}ms`);
});
