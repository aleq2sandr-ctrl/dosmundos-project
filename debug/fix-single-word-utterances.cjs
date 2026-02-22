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
];

async function fixSingleWordUtterances() {
  for (const fileInfo of filesToFix) {
    console.log(`\n=== Fixing: ${fileInfo.filename} ===`);
    
    const filePath = path.join(audioDir, fileInfo.filename);
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    if (data.utterances && data.utterances.length > 0) {
      console.log('✅ Already has utterances');
      continue;
    }
    
    if (!data.words || data.words.length === 0) {
      console.log('❌ No words to process');
      continue;
    }
    
    console.log(`📝 Processing ${data.words.length} words...`);
    
    // Fix: group all words with null speaker together
    const utterances = fixConvertWordsToUtterances(data.words);
    console.log(`✅ Created ${utterances.length} utterances`);
    
    // Check if we fixed the single-word problem
    const singleWordUtterances = utterances.filter(u => 
      u.text.trim().split(/\s+/).length === 1
    );
    console.log(`⚠️  Still has ${singleWordUtterances.length} single-word utterances`);
    
    // Show first few utterances
    if (utterances.length > 0) {
      console.log('');
      for (let i = 0; i < Math.min(5, utterances.length); i++) {
        const u = utterances[i];
        const duration = u.end - u.start;
        const wordCount = u.text.trim().split(/\s+/).length;
        console.log(`  ${i+1}: "${u.text.substring(0, 80)}..." (${wordCount} words, ${duration}ms)`);
      }
    }
    
    // Update database
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

function fixConvertWordsToUtterances(words) {
  if (!words || !Array.isArray(words) || words.length === 0) {
    return [];
  }

  const utterances = [];
  let currentUtterance = null;
  let utteranceId = 0;
  
  // Sort words by start time
  const sortedWords = [...words].sort((a, b) => a.start - b.start);

  for (const word of sortedWords) {
    // Handle null/undefined speakers - treat as same speaker
    const speaker = word.speaker || 'A';
    
    // Create normalized word object
    const normalizedWord = {
      text: word.text,
      start: word.start,
      end: word.end,
      speaker: speaker
    };
    
    // Group words by speaker and time gap (< 2 seconds between words)
    const timeGap = currentUtterance ? word.start - currentUtterance.end : 0;
    const isNewSpeaker = !currentUtterance || currentUtterance.speaker !== speaker;
    const isLongPause = timeGap > 2000; // > 2 seconds

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

fixSingleWordUtterances().catch(console.error);
