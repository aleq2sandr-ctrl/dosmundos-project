const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  const today = new Date().toISOString().split('T')[0]; // 2025-12-07
  console.log(`🗑️ Rolling back questions created on ${today} for lang=ru...`);

  // First count them
  const { count, error: countError } = await supabase
    .from('timecodes')
    .select('*', { count: 'exact', head: true })
    .eq('lang', 'ru')
    .gte('created_at', `${today}T00:00:00`);

  if (countError) {
    console.error('Error counting:', countError);
    return;
  }

  console.log(`Found ${count} questions to delete.`);

  if (count > 0) {
    const { error: deleteError } = await supabase
      .from('timecodes')
      .delete()
      .eq('lang', 'ru')
      .gte('created_at', `${today}T00:00:00`);

    if (deleteError) {
      console.error('Error deleting:', deleteError);
    } else {
      console.log('✅ Successfully deleted questions.');
    }
  } else {
    console.log('Nothing to delete.');
  }
}

main();