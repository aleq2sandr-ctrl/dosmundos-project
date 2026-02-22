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
    .in('episode_slug', ['2025-12-10', '2025-12-24', '2025-12-31', '2026-01-28', '2026-02-04', '2026-02-11'])
    .eq('lang', 'ru');
    
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log('=== Checking all RU transcripts for single-word utterances ===\n');
  
  for (const transcript of data) {
    const utterances = transcript.edited_transcript_data?.utterances || [];
    
    // Ищем single-word utterances
    const singleWord = utterances.filter(u => {
      const text = u.text.trim();
      return text.length > 0 && !text.includes(' ');
    });
    
    if (singleWord.length > 0) {
      console.log(`=== ${transcript.episode_slug} ===`);
      console.log(`Total: ${utterances.length}, Single-word: ${singleWord.length}\n`);
      
      // Показываем первые 5 single-word utterances с контекстом
      singleWord.slice(0, 5).forEach((u, i) => {
        const idx = utterances.indexOf(u);
        const prev = idx > 0 ? utterances[idx - 1] : null;
        const next = idx < utterances.length - 1 ? utterances[idx + 1] : null;
        
        const startMin = Math.floor(u.start / 60000);
        const startSec = Math.floor((u.start % 60000) / 1000);
        
        console.log(`${i + 1}. ${startMin}:${startSec.toString().padStart(2, '0')} - "${u.text}" (${u.speaker})`);
        
        if (prev) {
          console.log(`   Prev: "${prev.text.substring(0, 40)}..." (${prev.speaker})`);
        }
        if (next) {
          console.log(`   Next: "${next.text.substring(0, 40)}..." (${next.speaker})`);
        }
        console.log('');
      });
    }
  }
}

check().catch(console.error);
