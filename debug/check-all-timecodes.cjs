const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAllTimecodes() {
  const { data: timecodes, error } = await supabase
    .from('timecodes')
    .select('time, title')
    .eq('episode_slug', '2026-01-28')
    .eq('lang', 'ru')
    .order('time');
    
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log('=== Timecodes for 2026-01-28 RU ===');
  console.log(`Count: ${timecodes.length}`);
  console.log('');
  
  timecodes.forEach((tc, index) => {
    const minutes = Math.floor(tc.time / 60);
    const seconds = tc.time % 60;
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    console.log(`${index + 1}. ${timeStr} - ${tc.title}`);
  });
  
  if (timecodes.length > 0) {
    const minTime = timecodes[0].time;
    const maxTime = timecodes[timecodes.length - 1].time;
    
    const minMinutes = Math.floor(minTime / 60);
    const minSeconds = minTime % 60;
    const maxMinutes = Math.floor(maxTime / 60);
    const maxSeconds = maxTime % 60;
    
    console.log('\n=== Time Range ===');
    console.log(`From: ${minMinutes}:${minSeconds.toString().padStart(2, '0')}`);
    console.log(`To: ${maxMinutes}:${maxSeconds.toString().padStart(2, '0')}`);
    console.log(`Duration: ${maxMinutes - minMinutes} minutes`);
  }
}

checkAllTimecodes().catch(console.error);
