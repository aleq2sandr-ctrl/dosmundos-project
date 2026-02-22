const fs = require('fs');
const path = require('path');

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const audioDir = 'C:/Users/alexb/OneDrive/Desktop/Peru/Audio';
const MAX_DURATION = 2 * 60 * 1000; // 2 minutes in milliseconds

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function splitUtteranceBySentences(utterance) {
  // Разбиваем на предложения по признакам конца предложения
  const sentenceEndings = /[.!?]+/;
  const sentences = [];
  
  // Находим все позиции конца предложения
  let startIndex = 0;
  let match;
  
  // Используем регулярное выражение для поиска границ предложений
  const regex = /[.!?]+\s*/g;
  let matchInfo;
  
  while ((matchInfo = regex.exec(utterance.text)) !== null) {
    const endIndex = matchInfo.index + matchInfo[0].length;
    const sentenceText = utterance.text.slice(startIndex, endIndex).trim();
    
    if (sentenceText.length > 0) {
      // Рассчитываем время для этого предложения
      // Приблизим время пропорционально длине текста
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
  
  // Добавляем последнее предложение, если оно не закончилось на .!?
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

async function splitLongUtterances() {
  const { data, error } = await supabase
    .from('transcripts')
    .select('*')
    .in('episode_slug', ['2025-12-10', '2025-12-24', '2025-12-31', '2026-01-28', '2026-02-04', '2026-02-11']);
    
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log('=== Splitting long utterances ===\n');
  
  for (const transcript of data) {
    const utterances = transcript.edited_transcript_data?.utterances || [];
    const longUtterances = utterances.filter(u => u.end - u.start > MAX_DURATION);
    
    if (longUtterances.length > 0) {
      console.log(`=== ${transcript.episode_slug}_${transcript.lang.toUpperCase()} ===`);
      console.log(`Found ${longUtterances.length} utterances longer than 2 minutes\n`);
      
      // Создаем новый массив utterances с разбитыми длинными utterances
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
      
      // Обновляем базу данных
      const transcriptData = {
        utterances: newUtterances,
        text: transcript.edited_transcript_data?.text || ''
      };
      
      const { updateError } = await supabase
        .from('transcripts')
        .update({ edited_transcript_data: transcriptData })
        .eq('id', transcript.id);
        
      if (updateError) {
        console.error(`  ❌ Update failed: ${updateError.message}`);
      } else {
        console.log(`  ✅ Updated: ${utterances.length} → ${newUtterances.length} utterances`);
      }
      
      console.log('');
    }
  }
  
  console.log('=== Done ===');
}

splitLongUtterances().catch(console.error);
