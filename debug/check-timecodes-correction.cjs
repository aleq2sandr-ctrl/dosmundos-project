const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAndFixTimecodes() {
  console.log('=== Checking Timecodes ===');
  
  // Check timecodes
  const { data: timecodes, error: timecodesError } = await supabase
    .from('timecodes')
    .select('*')
    .eq('episode_slug', '2026-01-28')
    .eq('lang', 'ru');
    
  if (timecodesError) {
    console.error('❌ Timecodes error:', timecodesError);
    return;
  }
  
  console.log('Timecodes found:', timecodes.length);
  
  timecodes.forEach((tc, index) => {
    console.log(`  ${index + 1}: Start=${tc.start_time}, End=${tc.end_time}`);
  });
  
  // Delete invalid timecodes
  if (timecodes.length > 0) {
    const { error: deleteError } = await supabase
      .from('timecodes')
      .delete()
      .eq('episode_slug', '2026-01-28')
      .eq('lang', 'ru');
      
    if (deleteError) {
      console.error('❌ Delete error:', deleteError);
      return;
    }
    
    console.log('✅ Invalid timecodes deleted');
  }
  
  console.log('\n=== Regenerating Questions ===');
  console.log('Please run: node generate_questions.js');
}

checkAndFixTimecodes().catch(console.error);
