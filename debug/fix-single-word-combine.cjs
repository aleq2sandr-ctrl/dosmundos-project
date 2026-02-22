const fs = require('fs');
const path = require('path');

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const audioDir = 'C:/Users/alexb/OneDrive/Desktop/Peru/Audio';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const filesToFix = [
  { filename: '2026-01-28_ES.json', slug: '2026-01-28', lang: 'es' },
  { filename: '2026-01-28_RU.json', slug: '2026-01-28', lang: 'ru' },
  { filename: '2026-02-04_ES.json', slug: '2026-02-04', lang: 'es' },
  { filename: '2026-02-04_RU.json', slug: '2026-02-04', lang: 'ru' },
  { filename: '2026-02-11_ES.json', slug: '2026-02-11', lang: 'es' },
  { filename: '2026-02-11_RU.json', slug: '2026-02-11', lang: 'ru' },
];

async function fix() {
  for (const fileInfo of filesToFix) {
    console.log(`\n=== Processing ${fileInfo.filename} ===`);
    
    const filePath = path.join(audioDir, fileInfo.filename);
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    let utterances;
    if (data.utterances && data.utterances.length > 0) {
      utterances = data.utterances;
    } else if (data.words && data.words.length > 0) {
      utterances = convertWordsToUtterances(data.words);
    }
    
    console.log(`Original: ${utterances.length} utterances`);
    console.log(`Original single-word: ${countSingleWords(utterances)}`);
    
    // Объединяем одиночные слова
    const combinedUtterances = combineSingleWordUtterances(utterances);
    console.log(`Combined: ${combinedUtterances.length} utterances`);
    console.log(`Combined single-word: ${countSingleWords(combinedUtterances)}`);
    
    // Сохраняем в базу
    const transcriptData = {
      utterances: combinedUtterances,
      text: data.text || ''
    };
    
    const { error } = await supabase
      .from('transcripts')
      .update({ edited_transcript_data: transcriptData })
      .eq('episode_slug', fileInfo.slug)
      .eq('lang', fileInfo.lang);
      
    if (error) {
      console.error('❌ Update failed:', error);
    } else {
      console.log('✅ Updated');
    }
  }
  
  console.log('\n=== Done ===');
}

function countSingleWords(utterances) {
  return utterances.filter(u => {
    const text = u.text.trim();
    return text.length > 0 && !text.includes(' ');
  }).length;
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
        // Объединяем два одиночных слова
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
        // Оставляем как есть
        current.id = result.length;
        result.push(current);
        i += 1;
      }
    } else {
      // Оставляем как есть
      current.id = result.length;
      result.push(current);
      i += 1;
    }
  }
  
  return result;
}

function isSingleWordUtterance(utterance) {
  const text = utterance.text.trim();
  return text.length > 0 && !text.includes(' ');
}

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

fix().catch(console.error);
