const fs = require('fs');
const path = require('path');

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const audioDir = 'C:/Users/alexb/OneDrive/Desktop/Peru/Audio';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
    
    // Проверяем, является ли текущий utterance single-word
    if (isSingleWord(current.text)) {
      const prev = result.length > 0 ? result[result.length - 1] : null;
      const next = i + 1 < utterances.length ? utterances[i + 1] : null;
      
      // Пытаемся объединить с предыдущим или следующим utterance того же спикера
      if (prev && prev.speaker === current.speaker) {
        // Объединяем с предыдущим
        prev.text = prev.text.trim() + ' ' + current.text.trim();
        prev.end = current.end;
        i++;
      } else if (next && next.speaker === current.speaker) {
        // Объединяем со следующим
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
        // Если спикеры разные, присоединяем к предыдущему
        prev.text = prev.text.trim() + ' ' + current.text.trim();
        prev.end = current.end;
        i++;
      } else if (next) {
        // Если нет предыдущего, присоединяем к следующему
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
        // Оставляем как есть
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

async function fixAll() {
  const files = fs.readdirSync(audioDir).filter(f => f.endsWith('.json'));
  
  console.log('=== Fixing single-word utterances ===\n');
  
  for (const filename of files) {
    const filePath = path.join(audioDir, filename);
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    if (!data.utterances || data.utterances.length === 0) {
      continue;
    }
    
    const utterances = data.utterances;
    const singleWordBefore = utterances.filter(u => isSingleWord(u.text)).length;
    
    if (singleWordBefore === 0) {
      continue;
    }
    
    // Объединяем single-word utterances
    const combined = combineSingleWordUtterances(utterances);
    const singleWordAfter = combined.filter(u => isSingleWord(u.text)).length;
    
    console.log(`${filename}:`);
    console.log(`  Before: ${utterances.length} utterances, ${singleWordBefore} single-word`);
    console.log(`  After: ${combined.length} utterances, ${singleWordAfter} single-word`);
    
    // Оптимизируем для базы данных
    const optimized = combined.map(u => ({
      id: u.id,
      start: u.start,
      end: u.end,
      text: u.text,
      speaker: u.speaker
    }));
    
    const transcriptData = {
      utterances: optimized,
      text: data.text || ''
    };
    
    // Определяем slug и lang
    const slug = filename.replace('_ES.json', '').replace('_RU.json', '').replace('.json', '');
    const lang = filename.includes('_ES.json') ? 'es' : filename.includes('_RU.json') ? 'ru' : 'unknown';
    
    // Обновляем базу данных
    const { error } = await supabase
      .from('transcripts')
      .update({ edited_transcript_data: transcriptData })
      .eq('episode_slug', slug)
      .eq('lang', lang);
      
    if (error) {
      console.log(`  ❌ Update failed: ${error.message}\n`);
    } else {
      console.log(`  ✅ Updated\n`);
    }
  }
  
  console.log('=== Done ===');
}

fixAll().catch(console.error);
