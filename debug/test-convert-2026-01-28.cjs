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
    
    const normalizedWord = {
      text: word.text,
      start: word.start,
      end: word.end,
      speaker: speaker
    };
    
    const timeGap = currentUtterance ? word.start - currentUtterance.end : 0;
    const isNewSpeaker = !currentUtterance || currentUtterance.speaker !== speaker;
    const isLongPause = timeGap > 3000;

    let shouldCreateNew = false;
    if (!currentUtterance) {
      shouldCreateNew = true;
    } else if (word.speaker === null || word.speaker === undefined) {
      shouldCreateNew = isLongPause;
    } else {
      shouldCreateNew = isNewSpeaker || isLongPause;
    }

    if (shouldCreateNew) {
      if (currentUtterance) {
        utterances.push(currentUtterance);
      }
      
      currentUtterance = {
        start: word.start,
        end: word.end,
        text: word.text,
        speaker: speaker,
        id: utteranceId++,
        words: [normalizedWord]
      };
    } else {
      currentUtterance.text += ' ' + word.text;
      currentUtterance.end = word.end;
      currentUtterance.words.push(normalizedWord);
    }
  }

  if (currentUtterance) {
    utterances.push(currentUtterance);
  }

  return utterances;
}

console.log('=== Testing convertWordsToUtterances ===');

const files = ['2026-01-28_ES.json', '2026-01-28_RU.json'];

for (const filename of files) {
  const filePath = path.join(audioDir, filename);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File ${filename} not found`);
    continue;
  }

  console.log(`\n=== ${filename} ===`);
  
  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);

  console.log(`Text length: ${data.text.length}`);
  console.log(`Words count: ${data.words?.length || 0}`);
  
  if (data.words) {
    const utterances = convertWordsToUtterances(data.words);
    console.log(`Generated utterances: ${utterances.length}`);
    
    if (utterances.length > 0) {
      const first = utterances[0];
      const duration = (first.end - first.start) / 1000;
      console.log(`First utterance: "${first.text.substring(0, 50)}..." (${duration.toFixed(1)} sec)`);
      
      const durations = utterances.map(u => u.end - u.start);
      const maxDuration = Math.max(...durations) / 1000;
      console.log(`Longest utterance: ${maxDuration.toFixed(1)} sec`);
    }
  }
}

console.log('\n=== Done ===');
