const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

console.log('Environment variables:');
console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL);
console.log('SUPABASE_SERVICE_ROLE_KEY length:', process.env.SUPABASE_SERVICE_ROLE_KEY ? process.env.SUPABASE_SERVICE_ROLE_KEY.length : 'not set');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testConnection() {
  console.log('\n=== Testing Supabase Connection ===');
  
  try {
    // Test connection with simple query
    const { data, error } = await supabase
      .from('timecodes')
      .select('episode_slug')
      .limit(5);
      
    if (error) {
      console.error('❌ Connection error:', error);
      return;
    }
    
    console.log('✅ Connection successful');
    console.log('Timecodes sample:', data);
    
    // Check table structure by fetching 2026-01-28.ru data
    const { data: episodeData, error: episodeError } = await supabase
      .from('timecodes')
      .select('*')
      .eq('episode_slug', '2026-01-28')
      .eq('lang', 'ru');
      
    if (episodeError) {
      console.error('❌ Error fetching timecodes:', episodeError);
      return;
    }
    
    console.log(`\n2026-01-28.ru timecodes count: ${episodeData.length}`);
    
    if (episodeData.length > 0) {
      console.log('Timecode fields:', Object.keys(episodeData[0]));
      console.log('Timecode:', JSON.stringify(episodeData[0], null, 2));
    }
    
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

testConnection();
