const fs = require('fs');
const path = require('path');

const audioDir = 'C:/Users/alexb/OneDrive/Desktop/Peru/Audio';

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

const jsonFiles = fs.readdirSync(audioDir).filter(file => file.endsWith('.json'));

console.log('=== Checking all JSON files ===');
console.log('');

jsonFiles.forEach(filename => {
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
  
  const singleWordUtterances = utterances.filter(u => {
    const text = u.text.trim();
    return text.length > 0 && !text.includes(' ');
  });
  
  const percentage = ((singleWordUtterances.length / utterances.length) * 100).toFixed(1);
  
  console.log(`Total: ${utterances.length}, Single-word: ${singleWordUtterances.length} (${percentage}%)`);
  
  if (percentage > 10) {
    console.log('⚠️  High percentage of single-word utterances');
  }
  
  console.log('');
});
