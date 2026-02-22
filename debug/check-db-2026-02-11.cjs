const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase
    .from('transcripts')
    .select('*')
    .eq('episode_slug', '2026-02-11')
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
  
  console.log('=== 2026-02-11_RU (from database) ===');
  console.log('Total utterances:', utterances.length);
  
  // Ищем utterances с 1:19 (79000ms) до 3:16 (196000ms)
  console.log('\nUtterances from 1:19 to 3:16:');
  utterances.forEach((u, i) => {
    const startSec = Math.floor(u.start / 1000);
    
    if (u.start >= 79000 && u.end <= 200000) {
      const startMin = Math.floor(startSec / 60);
      const startSecRem = startSec % 60;
      const endMin = Math.floor(u.end / 60000);
      const endSecRem = Math.floor((u.end % 60000) / 1000);
      
      console.log(`${startMin}:${startSecRem.toString().padStart(2, '0')} - ${endMin}:${endSecRem.toString().padStart(2, '0')} (${u.speaker})`);
      console.log(`  "${u.text.substring(0, 80)}..."`);
      console.log('');
    }
  });
  
  // Проверяем single-word utterances
  const singleWord = utterances.filter(u => {
    const text = u.text.trim();
    return text.length > 0 && !text.includes(' ');
  });
  
  console.log('\nSingle-word utterances:', singleWord.length);
}

check().catch(console.error);
