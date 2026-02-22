const fs = require('fs');
const path = require('path');

const audioDir = 'C:/Users/alexb/OneDrive/Desktop/Peru/Audio';
const MAX_DURATION = 2 * 60 * 1000; // 2 minutes in milliseconds

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

function processFile(filename) {
  const filePath = path.join(audioDir, filename);
  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);
  
  let utterances;
  if (data.utterances && data.utterances.length > 0) {
    utterances = data.utterances;
  } else {
    return null;
  }
  
  const longUtterances = utterances.filter(u => u.end - u.start > MAX_DURATION);
  
  if (longUtterances.length === 0) {
    return null;
  }
  
  console.log(`=== ${filename} ===`);
  console.log(`Found ${longUtterances.length} utterances longer than 2 minutes\n`);
  
  const newUtterances = [];
  let idCounter = 0;
  
  for (const u of utterances) {
    if (u.end - u.start > MAX_DURATION) {
      const sentences = splitUtteranceBySentences(u);
      console.log(`  Split: ${u.text.substring(0, 100)}... into ${sentences.length} sentences`);
      
      sentences.forEach(s => {
        s.id = idCounter++;
        newUtterances.push(s);
      });
    } else {
      u.id = idCounter++;
      newUtterances.push(u);
    }
  }
  
  return {
    filename,
    original: utterances.length,
    processed: newUtterances.length,
    data: {
      utterances: newUtterances,
      text: data.text || ''
    }
  };
}

console.log('=== Processing local JSON files ===\n');

const files = fs.readdirSync(audioDir).filter(f => f.endsWith('.json'));
const results = [];

for (const filename of files) {
  const slugMatch = filename.match(/(\d{4}-\d{2}-\d{2})_?.*?\.json/);
  if (!slugMatch) continue;
  
  const slug = slugMatch[1];
  const isRecent = ['2025-12-10', '2025-12-24', '2025-12-31', '2026-01-28', '2026-02-04', '2026-02-11'].includes(slug);
  
  if (isRecent) {
    const result = processFile(filename);
    if (result) {
      results.push(result);
    }
  }
}

console.log('\n=== Results ===');
results.forEach(result => {
  console.log(`${result.filename}: ${result.original} → ${result.processed} utterances`);
});

// Добавляем функцию разбиения длинных utterances в импортовый скрипт
console.log('\n=== Updating import script ===');
const importScriptPath = path.join('scripts', 'import-new-episodes.cjs');
let importScriptContent = fs.readFileSync(importScriptPath, 'utf8');

const splitFunction = `
/**
 * Split long utterances by sentence endings
 */
function splitUtteranceBySentences(utterance) {
  const sentences = [];
  const regex = /[.!?]+\\s*/g;
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
`;

// Вставляем функцию перед processTranscriptFile
const processTranscriptFileIndex = importScriptContent.indexOf('async function processTranscriptFile');
importScriptContent = importScriptContent.slice(0, processTranscriptFileIndex) + splitFunction + importScriptContent.slice(processTranscriptFileIndex);

// Обновляем processTranscriptFile для использования splitUtteranceBySentences
const originalProcess = `    // Create compact transcript data (remove words field to reduce size)
    const compactUtterances = utterances.map(u => ({
      id: u.id,
      start: u.start,
      end: u.end,
      text: u.text,
      speaker: u.speaker
    }));
    
    const transcriptData = {
      utterances: compactUtterances,
      text: json.text || ''
    };`;

const updatedProcess = `    // Split long utterances
    const MAX_DURATION = 2 * 60 * 1000; // 2 minutes
    let processedUtterances = [];
    let idCounter = 0;
    
    for (const u of utterances) {
      if (u.end - u.start > MAX_DURATION) {
        const sentences = splitUtteranceBySentences(u);
        sentences.forEach(s => {
          s.id = idCounter++;
          processedUtterances.push(s);
        });
        console.log(\`   Split long utterance into \${sentences.length} sentences\`);
      } else {
        u.id = idCounter++;
        processedUtterances.push(u);
      }
    }
    
    // Create compact transcript data
    const transcriptData = {
      utterances: processedUtterances,
      text: json.text || ''
    };`;

importScriptContent = importScriptContent.replace(originalProcess, updatedProcess);

fs.writeFileSync(importScriptPath, importScriptContent);
console.log('✅ Updated import script');

console.log('\n=== Done ===');
