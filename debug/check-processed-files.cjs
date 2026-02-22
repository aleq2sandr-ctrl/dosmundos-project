const fs = require('fs');
const path = require('path');

const audioDir = 'C:/Users/alexb/OneDrive/Desktop/Peru/Audio';
const MAX_DURATION = 2 * 60 * 1000; // 2 minutes

console.log('=== Checking processed JSON files ===\n');

const files = fs.readdirSync(audioDir).filter(f => f.endsWith('.json'));

for (const filename of files) {
  const slugMatch = filename.match(/(\d{4}-\d{2}-\d{2})_?.*?\.json/);
  if (!slugMatch) continue;
  
  const slug = slugMatch[1];
  const isRecent = ['2025-12-10', '2025-12-24', '2025-12-31', '2026-01-28', '2026-02-04', '2026-02-11'].includes(slug);
  
  if (isRecent) {
    const filePath = path.join(audioDir, filename);
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    let utterances;
    if (data.utterances && data.utterances.length > 0) {
      utterances = data.utterances;
    } else {
      console.log(`${filename}: No utterances`);
      continue;
    }
    
    // Имитируем работу скрипта
    function isSingleWord(text) {
      const trimmed = text.trim();
      return trimmed.length > 0 && !trimmed.includes(' ');
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
    
    // Объединяем single-word utterances
    const processedUtterances = [];
    let i = 0;
    while (i < utterances.length) {
      const current = utterances[i];
      
      if (isSingleWord(current.text)) {
        const prev = processedUtterances.length > 0 ? processedUtterances[processedUtterances.length - 1] : null;
        const next = i + 1 < utterances.length ? utterances[i + 1] : null;
        
        if (prev && prev.speaker === current.speaker) {
          prev.text = prev.text.trim() + ' ' + current.text.trim();
          prev.end = current.end;
          i++;
        } else if (next && next.speaker === current.speaker) {
          const combined = {
            id: processedUtterances.length,
            start: current.start,
            end: next.end,
            text: current.text.trim() + ' ' + next.text.trim(),
            speaker: current.speaker
          };
          processedUtterances.push(combined);
          i += 2;
        } else if (prev) {
          prev.text = prev.text.trim() + ' ' + current.text.trim();
          prev.end = current.end;
          i++;
        } else if (next) {
          const combined = {
            id: processedUtterances.length,
            start: current.start,
            end: next.end,
            text: current.text.trim() + ' ' + next.text.trim(),
            speaker: next.speaker
          };
          processedUtterances.push(combined);
          i += 2;
        } else {
          current.id = processedUtterances.length;
          processedUtterances.push(current);
          i++;
        }
      } else {
        current.id = processedUtterances.length;
        processedUtterances.push(current);
        i++;
      }
    }
    
    // Разбиваем длинные utterances
    const finalUtterances = [];
    let idCounter = 0;
    
    for (const u of processedUtterances) {
      if (u.end - u.start > MAX_DURATION) {
        const sentences = splitUtteranceBySentences(u);
        sentences.forEach(s => {
          s.id = idCounter++;
          finalUtterances.push(s);
        });
      } else {
        u.id = idCounter++;
        finalUtterances.push(u);
      }
    }
    
    const longUtterances = finalUtterances.filter(u => u.end - u.start > MAX_DURATION);
    
    if (longUtterances.length > 0) {
      console.log(`❌ ${filename}`);
      console.log(`   Found ${longUtterances.length} utterances longer than 2 minutes\n`);
    } else {
      console.log(`✅ ${filename}`);
      console.log(`   No utterances longer than 2 minutes\n`);
    }
  }
}

console.log('=== Done ===');
