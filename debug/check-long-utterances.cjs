const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MAX_DURATION = 2 * 60 * 1000; // 2 minutes in milliseconds

async function checkLongUtterances() {
  const { data, error } = await supabase
    .from('transcripts')
    .select('*')
    .in('episode_slug', ['2025-12-10', '2025-12-24', '2025-12-31', '2026-01-28', '2026-02-04', '2026-02-11']);
    
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log('=== Checking for utterances longer than 2 minutes ===\n');
  
  for (const transcript of data) {
    const utterances = transcript.edited_transcript_data?.utterances || [];
    const longUtterances = utterances.filter(u => u.end - u.start > MAX_DURATION);
    
    if (longUtterances.length > 0) {
      console.log(`=== ${transcript.episode_slug}_${transcript.lang.toUpperCase()} ===`);
      console.log(`Found ${longUtterances.length} utterances longer than 2 minutes:\n`);
      
      longUtterances.forEach((u, i) => {
        const duration = (u.end - u.start) / 1000; // seconds
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration % 60);
        
        console.log(`${i + 1}. ${minutes}:${seconds.toString().padStart(2, '0')} (${duration.toFixed(1)} sec)`);
        console.log(`   Speaker: ${u.speaker}`);
        console.log(`   Text: ${u.text.substring(0, 150)}...`);
        console.log('');
      });
    }
  }
}

checkLongUtterances().catch(console.error);
