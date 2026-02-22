const fs = require('fs');
const path = require('path');

const audioDir = 'C:/Users/alexb/OneDrive/Desktop/Peru/Audio';
const filename = '2026-01-28_RU.json';
const filePath = path.join(audioDir, filename);
const content = fs.readFileSync(filePath, 'utf8');
const data = JSON.parse(content);

function countSingleWords(utterances) {
  return utterances.filter(u => {
    const text = u.text.trim();
    return text.length > 0 && !text.includes(' ');
  }).length;
}

function isSingleWordUtterance(utterance) {
  const text = utterance.text.trim();
  return text.length > 0 && !text.includes(' ');
}

function combineSingleWordUtterances(utterances) {
  if (!utterances || utterances.length < 2) {
    return utterances;
  }
  
  const result = [];
  let i = 0;
  
  while (i < utterances.length) {
    const current = utterances[i];
    const isSingleWord = isSingleWordUtterance(current);
    
    if (isSingleWord && i + 1 < utterances.length) {
      const next = utterances[i + 1];
      const nextIsSingleWord = isSingleWordUtterance(next);
      
      if (nextIsSingleWord && current.speaker === next.speaker && 
          (next.start - current.end) < 3000) {
        const combined = {
          id: result.length,
          start: current.start,
          end: next.end,
          text: `${current.text.trim()} ${next.text.trim()}`,
          speaker: current.speaker
        };
        result.push(combined);
        i += 2;
      } else {
        current.id = result.length;
        result.push(current);
        i += 1;
      }
    } else {
      current.id = result.length;
      result.push(current);
      i += 1;
    }
  }
  
  return result;
}

function convertWordsToUtterances(words) {
  const result = [];
  let current = null;
  let id = 0;
  
  for (const word of words) {
    const speaker = word.speaker || 'A';
    
    if (!current || current.speaker !== speaker) {
      if (current) result.push(current);
      current = {
        id: id++,
        start: word.start,
        end: word.end,
        text: word.text,
        speaker: speaker
      };
    } else {
      current.text += ' ' + word.text;
      current.end = word.end;
    }
  }
  
  if (current) result.push(current);
  return result;
}

// Подготовить utterances
let utterances;
if (data.utterances && data.utterances.length > 0) {
  utterances = data.utterances;
} else {
  utterances = convertWordsToUtterances(data.words);
}

console.log('=== 2026-01-28_RU ===');
console.log('Original:');
console.log('  Total: ' + utterances.length);
console.log('  Single-word: ' + countSingleWords(utterances));
console.log('  Percentage: ' + ((countSingleWords(utterances) / utterances.length) * 100).toFixed(1) + '%');

const combined = combineSingleWordUtterances(utterances);
console.log('');
console.log('Combined:');
console.log('  Total: ' + combined.length);
console.log('  Single-word: ' + countSingleWords(combined));
console.log('  Percentage: ' + ((countSingleWords(combined) / combined.length) * 100).toFixed(1) + '%');

console.log('');
console.log('First 10 combined utterances:');
combined.slice(0, 10).forEach(u => {
  const wordCount = u.text.split(' ').length;
  const duration = u.end - u.start;
  console.log(`  ${u.id + 1}: "${u.text}" (${wordCount} words, ${duration}ms)`);
});
