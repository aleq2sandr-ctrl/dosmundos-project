const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  const { data, error } = await supabase
    .from('timecodes')
    .select('*')
    .eq('lang', 'ru')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Recent RU questions:', data);
  }
}

main();