const fs = require('fs');
const path = require('path');

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const audioDir = 'C:/Users/alexb/OneDrive/Desktop/Peru/Audio';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Файлы которые нужно исправить
const filesToFix = [
  { filename: '2026-01-28_ES.json', slug: '2026-01-28', lang: 'es' },
  { filename: '2026-01-28_RU.json', slug: '2026-01-28', lang: 'ru' },
];

async function fixTranscripts() {
  for (const fileInfo of filesToFix) {
    console.log(`\n=== Fixing: ${fileInfo.filename} ===`);
    
    const filePath = path.join(audioDir, fileInfo.filename);
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    if (data.utterances && data.utterances.length > 0) {
      console.log('✅ Already has utterances, skipping');
      continue;
    }
    
    if (!data.words || data.words.length === 0) {
      console.log('❌ No words to convert');
      continue;
    }
    
    console.log(`📝 Converting ${data.words.length} words to utterances...`);
    
    // Конвертация слов в utterances по speaker'ам
    const utterances = convertWordsToUtterances(data.words);
    console.log(`✅ Created ${utterances.length} utterances`);
    
    // Проверка первого utterance
    if (utterances.length > 0) {
      console.log(`   First: "${utterances[0].text.substring(0, 50)}..."`);
      console.log(`   Speakers: ${[...new Set(utterances.map(u => u.speaker))].join(', ')}`);
    }
    
    // Обновление в базе
    const transcriptData = {
      utterances: utterances,
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
      console.log('✅ Updated in database');
    }
  }
  
  console.log('\n=== Done! ===');
}

function convertWordsToUtterances(words) {
  const utterances = [];
  let currentUtterance = null;
  let utteranceId = 0;
  
  // Сортируем по времени на всякий случай
  const sortedWords = [...words].sort((a, b) => a.start - b.start);
  
  for (const word of sortedWords) {
    const speaker = word.speaker || 'A';
    
    // Если новый спикер или слишком большой перерыв (> 2 секунды), начинаем новый utterance
    const timeGap = currentUtterance ? word.start - currentUtterance.end : 0;
    const isNewSpeaker = !currentUtterance || currentUtterance.speaker !== speaker;
    const isLongPause = timeGap > 2000; // > 2 секунд
    
    if (!currentUtterance || isNewSpeaker || isLongPause) {
      if (currentUtterance) {
        utterances.push(currentUtterance);
      }
      
      currentUtterance = {
        id: utteranceId++,
        start: word.start,
        end: word.end,
        text: word.text,
        speaker: speaker
      };
    } else {
      currentUtterance.text += ' ' + word.text;
      currentUtterance.end = word.end;
    }
  }
  
  if (currentUtterance) {
    utterances.push(currentUtterance);
  }
  
  return utterances;
}

fixTranscripts().catch(console.error);
