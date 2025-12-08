
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectEpisodes() {
  console.log('Inspecting episodes table...');
  const { data, error } = await supabase
    .from('episodes')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error.message);
  } else {
    if (data.length > 0) {
      console.log('Columns:', Object.keys(data[0]));
    } else {
      console.log('Table is empty');
    }
  }
}

inspectEpisodes();
