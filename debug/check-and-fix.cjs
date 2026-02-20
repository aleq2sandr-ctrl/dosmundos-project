const fs = require('fs');
const path = require('path');

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const audioDir = 'C:/Users/alexb/OneDrive/Desktop/Peru/Audio';
const files = fs.readdirSync(audioDir).filter(f => f.endsWith('.json'));

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log(`Found ${files.length} transcript files`);

// Проверка каждого файла
files.forEach(filename => {
  const filePath = path.join(audioDir, filename);
  
  console.log(`\n=== Processing: ${filename} ===`);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    if (data.utterances && data.utterances.length > 0) {
      console.log(`✅ Utterances found: ${data.utterances.length}`);
      
      // Проверка структуры
      const firstUtterance = data.utterances[0];
      const hasRequiredFields = firstUtterance.text && 
                               typeof firstUtterance.start === 'number' && 
                               typeof firstUtterance.end === 'number';
                               
      console.log(`✅ First utterance valid: ${hasRequiredFields}`);
      if (hasRequiredFields) {
        console.log(`✅ First utterance: "${firstUtterance.text.substring(0, 50)}..."`);
      }
      
    } else if (data.words && data.words.length > 0) {
      console.log(`⚠️ No utterances, but has ${data.words.length} words`);
    } else {
      console.log('❌ No transcript data');
    }
    
    // Проверка в базе
    const slug = filename.replace('_ES.json', '').replace('_RU.json', '').replace('.json', '');
    const lang = filename.includes('_ES.json') ? 'es' : filename.includes('_RU.json') ? 'ru' : 'unknown';
    
    // Проверка в базе данных
    supabase.from('transcripts')
      .select('*')
      .eq('episode_slug', slug)
      .eq('lang', lang)
      .then(({ data: dbData, error }) => {
        if (error) {
          console.error('DB Error:', error);
          return;
        }
        
        if (dbData.length === 0) {
          console.log(`❌ Not in database`);
        } else {
          const dbTranscript = dbData[0];
          
          if (dbTranscript.edited_transcript_data && 
              dbTranscript.edited_transcript_data.utterances && 
              Array.isArray(dbTranscript.edited_transcript_data.utterances) && 
              dbTranscript.edited_transcript_data.utterances.length > 0) {
            console.log(`✅ In DB with ${dbTranscript.edited_transcript_data.utterances.length} utterances`);
          } else {
            console.log('❌ DB record has invalid or missing utterances');
            console.log('  Data keys:', Object.keys(dbTranscript.edited_transcript_data || {}));
            
            // Попытка исправить
            console.log('  Trying to fix...');
            if (data.utterances && data.utterances.length > 0) {
              console.log('  Using AssemblyAI utterances');
              fixTranscriptInDb(slug, lang, data);
            } else if (data.words && data.words.length > 0) {
              console.log('  Converting words to utterances');
              fixTranscriptInDb(slug, lang, data, true);
            }
          }
        }
      });
      
  } catch (error) {
    console.error(`❌ Error processing ${filename}:`, error.message);
  }
});

async function fixTranscriptInDb(slug, lang, data, convertFromWords = false) {
  let utterances;
  
  if (convertFromWords) {
    // Конвертация из words
    utterances = convertWordsToUtterances(data.words);
  } else {
    // Использование готовых utterances
    utterances = data.utterances.map((u, index) => ({
      id: index,
      start: u.start,
      end: u.end,
      text: u.text,
      speaker: u.speaker
    }));
  }
  
  const transcriptData = {
    utterances: utterances,
    text: data.text || ''
  };
  
  const { error } = await supabase
    .from('transcripts')
    .update({ edited_transcript_data: transcriptData })
    .eq('episode_slug', slug)
    .eq('lang', lang);
    
  if (error) {
    console.error(`  ❌ Fix failed:`, error);
  } else {
    console.log(`  ✅ Fixed: ${utterances.length} utterances`);
  }
}

function convertWordsToUtterances(words) {
  const utterances = [];
  let currentUtterance = null;
  let utteranceId = 0;
  
  for (const word of words) {
    const speaker = word.speaker || '0';
    
    if (!currentUtterance || currentUtterance.speaker !== speaker) {
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
