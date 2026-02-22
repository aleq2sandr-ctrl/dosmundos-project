const fs = require('fs');
const path = require('path');

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const audioDir = 'C:/Users/alexb/OneDrive/Desktop/Peru/Audio';
const filename = '2026-01-28_ES.json';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
    const isLongPause = timeGap > 3000;

    if (!currentUtterance || isLongPause) {
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

async function update() {
  console.log('=== Updating 2026-01-28_ES ===');
  
  const filePath = path.join(audioDir, filename);
  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);
  
  const utterances = convertWordsToUtterances(data.words);
  
  const optimizedUtterances = utterances.map(u => ({
    id: u.id,
    start: u.start,
    end: u.end,
    text: u.text,
    speaker: u.speaker
  }));
  
  const transcriptData = {
    utterances: optimizedUtterances,
    text: data.text || ''
  };
  
  const dataSizeMB = (Buffer.from(JSON.stringify(transcriptData)).length / 1024 / 1024).toFixed(2);
  console.log(`Data size: ${dataSizeMB} MB`);
  
  const { error } = await supabase
    .from('transcripts')
    .update({ edited_transcript_data: transcriptData })
    .eq('episode_slug', '2026-01-28')
    .eq('lang', 'es');
    
  if (error) {
    console.error('❌ Update failed:', error);
  } else {
    console.log('✅ Updated');
    console.log(`Total utterances: ${optimizedUtterances.length}`);
    
    const singleWordCount = optimizedUtterances.filter(u => {
      const text = u.text.trim();
      return text.length > 0 && !text.includes(' ');
    }).length;
    
    console.log(`Single-word: ${singleWordCount} (${((singleWordCount / optimizedUtterances.length) * 100).toFixed(1)}%)`);
  }
}

update().catch(console.error);
