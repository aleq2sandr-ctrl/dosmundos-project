const fs = require('fs');
const path = require('path');

const audioDir = 'C:/Users/alexb/OneDrive/Desktop/Peru/Audio';
const files = ['2026-01-28_ES.json', '2026-01-28_RU.json'];

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
    const isNewSpeaker = !currentUtterance || currentUtterance.speaker !== speaker;
    const isLongPause = timeGap > 2000;

    if (!currentUtterance || isNewSpeaker || isLongPause) {
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

console.log('=== Testing convertWordsToUtterances ===');
console.log('');

files.forEach(filename => {
  console.log(`=== File: ${filename} ===`);
  const filePath = path.join(audioDir, filename);
  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);
  
  let utterances;
  if (data.utterances && data.utterances.length > 0) {
    utterances = data.utterances;
  } else if (data.words && data.words.length > 0) {
    utterances = convertWordsToUtterances(data.words);
  }
  
  console.log(`Total utterances: ${utterances.length}`);
  
  // Check single-word utterances
  const singleWordUtterances = utterances.filter(u => {
    const text = u.text.trim();
    return text.length > 0 && !text.includes(' ');
  });
  
  console.log(`Single-word utterances: ${singleWordUtterances.length}`);
  console.log(`Percentage: ${((singleWordUtterances.length / utterances.length) * 100).toFixed(1)}%`);
  
  // Show first few utterances
  console.log('');
  console.log('First 5 utterances:');
  utterances.slice(0, 5).forEach((u, i) => {
    const duration = u.end - u.start;
    const wordCount = u.text.split(' ').length;
    console.log(`  ${i+1}: "${u.text.substring(0, 80)}..." (${wordCount} words, ${duration}ms)`);
  });
  
  console.log('');
});
