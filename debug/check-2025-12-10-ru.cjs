const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  // Проверяем 2025-12-10_RU
  const { data, error } = await supabase
    .from('transcripts')
    .select('*')
    .eq('episode_slug', '2025-12-10')
    .eq('lang', 'ru');
    
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log('❌ No data found');
    return;
  }
  
  const transcript = data[0];
  const utterances = transcript.edited_transcript_data?.utterances || [];
  
  console.log('=== 2025-12-10_RU ===');
  console.log('Total utterances:', utterances.length);
  
  // Ищем utterances с 1:19 (79000ms) до 3:16 (196000ms)
  console.log('\nUtterances from 1:19 to 3:16:');
  utterances.forEach((u, i) => {
    const startSec = Math.floor(u.start / 1000);
    const endSec = Math.floor(u.end / 1000);
    
    if (u.start >= 79000 && u.end <= 200000) {
      const startMin = Math.floor(startSec / 60);
      const startSecRem = startSec % 60;
      const endMin = Math.floor(endSec / 60);
      const endSecRem = endSec % 60;
      
      console.log(`${startMin}:${startSecRem.toString().padStart(2, '0')} - ${endMin}:${endSecRem.toString().padStart(2, '0')} (${u.speaker})`);
      console.log(`  "${u.text}"`);
      console.log('');
    }
  });
  
  // Проверяем single-word utterances
  const singleWord = utterances.filter(u => {
    const text = u.text.trim();
    return text.length > 0 && !text.includes(' ');
  });
  
  console.log('\nSingle-word utterances:', singleWord.length);
  console.log('Percentage:', ((singleWord.length / utterances.length) * 100).toFixed(1) + '%');
  
  // Показываем первые 10 single-word utterances
  console.log('\nFirst 10 single-word utterances:');
  singleWord.slice(0, 10).forEach((u, i) => {
    const startMin = Math.floor(u.start / 60000);
    const startSecRem = Math.floor((u.start % 60000) / 1000);
    console.log(`${i+1}. ${startMin}:${startSecRem.toString().padStart(2, '0')} - "${u.text}" (${u.speaker})`);
  });
}

check().catch(console.error);
