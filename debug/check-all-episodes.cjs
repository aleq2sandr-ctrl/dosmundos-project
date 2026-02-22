const fs = require('fs');
const path = require('path');

const audioDir = 'C:/Users/alexb/OneDrive/Desktop/Peru/Audio';
const episodes = ['2026-01-28', '2026-02-04', '2026-02-11', '2025-12-31', '2025-12-24', '2025-12-10'];

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

console.log('=== Checking last 6 episodes ===');
console.log('');

episodes.forEach(episode => {
  ['ES', 'RU'].forEach(lang => {
    const filename = `${episode}_${lang}.json`;
    const filePath = path.join(audioDir, filename);
    
    if (!fs.existsSync(filePath)) {
      console.log(`❌ ${filename} not found`);
      return;
    }
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);
      
      let utterances;
      if (data.utterances && data.utterances.length > 0) {
        utterances = data.utterances;
      } else if (data.words && data.words.length > 0) {
        utterances = convertWordsToUtterances(data.words);
      } else {
        console.log(`❌ ${filename} no content`);
        return;
      }
      
      const singleWordCount = utterances.filter(u => {
        const text = u.text.trim();
        return text.length > 0 && !text.includes(' ');
      }).length;
      
      const percentage = ((singleWordCount / utterances.length) * 100).toFixed(1);
      
      console.log(`✅ ${filename}: ${utterances.length} utterances, ${singleWordCount} single-word (${percentage}%)`);
    } catch (e) {
      console.error(`❌ ${filename}: ${e.message}`);
    }
  });
});
