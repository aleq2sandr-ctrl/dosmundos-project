const fs = require('fs');
const path = require('path');

const audioDir = 'C:/Users/alexb/OneDrive/Desktop/Peru/Audio';
const filename = '2026-01-28_RU.json';
const filePath = path.join(audioDir, filename);

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

function isSingleWord(text) {
  const trimmed = text.trim();
  return trimmed.length > 0 && !trimmed.includes(' ');
}

function combineSingleWordUtterances(utterances) {
  if (!utterances || utterances.length < 2) {
    return utterances;
  }
  
  const result = [];
  let i = 0;
  
  while (i < utterances.length) {
    const current = utterances[i];
    
    if (isSingleWord(current.text)) {
      const prev = result.length > 0 ? result[result.length - 1] : null;
      const next = i + 1 < utterances.length ? utterances[i + 1] : null;
      
      if (prev && prev.speaker === current.speaker) {
        prev.text = prev.text.trim() + ' ' + current.text.trim();
        prev.end = current.end;
        i++;
      } else if (next && next.speaker === current.speaker) {
        const combined = {
          id: result.length,
          start: current.start,
          end: next.end,
          text: current.text.trim() + ' ' + next.text.trim(),
          speaker: current.speaker
        };
        result.push(combined);
        i += 2;
      } else if (prev) {
        prev.text = prev.text.trim() + ' ' + current.text.trim();
        prev.end = current.end;
        i++;
      } else if (next) {
        const combined = {
          id: result.length,
          start: current.start,
          end: next.end,
          text: current.text.trim() + ' ' + next.text.trim(),
          speaker: next.speaker
        };
        result.push(combined);
        i += 2;
      } else {
        current.id = result.length;
        result.push(current);
        i++;
      }
    } else {
      current.id = result.length;
      result.push(current);
      i++;
    }
  }
  
  return result;
}

function splitUtteranceBySentences(utterance) {
  const sentences = [];
  const regex = /[.!?]+\s*/g;
  let startIndex = 0;
  let match;
  
  while ((match = regex.exec(utterance.text)) !== null) {
    const endIndex = match.index + match[0].length;
    const sentenceText = utterance.text.slice(startIndex, endIndex).trim();
    
    if (sentenceText.length > 0) {
      const duration = utterance.end - utterance.start;
      const sentenceDuration = Math.round((sentenceText.length / utterance.text.length) * duration);
      const sentenceEnd = utterance.start + sentenceDuration;
      
      sentences.push({
        id: sentences.length,
        start: utterance.start + (sentences.length === 0 ? 0 : sentences[sentences.length - 1].end - utterance.start),
        end: sentenceEnd,
        text: sentenceText,
        speaker: utterance.speaker
      });
      
      startIndex = endIndex;
    }
  }
  
  if (startIndex < utterance.text.length) {
    const sentenceText = utterance.text.slice(startIndex).trim();
    if (sentenceText.length > 0) {
      sentences.push({
        id: sentences.length,
        start: sentences.length === 0 ? utterance.start : sentences[sentences.length - 1].end,
        end: utterance.end,
        text: sentenceText,
        speaker: utterance.speaker
      });
    }
  }
  
  return sentences;
}

console.log(`=== Checking ${filename} ===\n`);

const content = fs.readFileSync(filePath, 'utf8');
const data = JSON.parse(content);

const utterances = convertWordsToUtterances(data.words);
console.log('After convert:', utterances.length);

const combined = combineSingleWordUtterances(utterances);
console.log('After combine:', combined.length);

const MAX_DURATION = 2 * 60 * 1000;
const longUtterances = combined.filter(u => u.end - u.start > MAX_DURATION);
console.log('Long utterances:', longUtterances.length);

if (longUtterances.length > 0) {
  longUtterances.forEach((u, i) => {
    const duration = (u.end - u.start) / 1000;
    console.log(`\n  ${i + 1}: ${duration.toFixed(1)} sec`);
    console.log(`    Text: ${u.text.substring(0, 100)}...`);
    
    const sentences = splitUtteranceBySentences(u);
    console.log(`    Split into ${sentences.length} sentences`);
    
    sentences.forEach((s, j) => {
      const sDuration = (s.end - s.start) / 1000;
      console.log(`    Sentence ${j + 1}: ${sDuration.toFixed(1)} sec - "${s.text.substring(0, 50)}..."`);
    });
  });
}
