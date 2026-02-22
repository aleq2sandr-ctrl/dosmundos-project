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
    .in('episode_slug', ['2026-01-28', '2026-02-04', '2026-02-11']);
    
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log('✅ Found', data.length, 'transcripts');
  data.forEach(t => {
    console.log('');
    console.log(`=== ${t.episode_slug} ${t.lang.toUpperCase()} ===`);
    
    const utterancesCount = t.edited_transcript_data?.utterances?.length || 0;
    console.log('Utterances:', utterancesCount);
    
    if (utterancesCount > 0) {
      const first3 = t.edited_transcript_data.utterances.slice(0, 3);
      first3.forEach((u, i) => {
        const wordCount = u.text.split(' ').length;
        const duration = u.end - u.start;
        console.log(`  ${i+1}: "${u.text.substring(0, 80)}..." (${wordCount} words, ${duration}ms)`);
      });
    }
  });
}

check();
