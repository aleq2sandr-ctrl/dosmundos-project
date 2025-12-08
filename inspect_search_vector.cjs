
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectSearchVector() {
  console.log('Inspecting search_vector in transcripts table...');
  const { data, error } = await supabase
    .from('transcripts')
    .select('episode_slug, search_vector')
    .not('search_vector', 'is', null)
    .limit(1);

  if (error) {
    console.error('Error:', error.message);
  } else {
    if (data.length > 0) {
      console.log('Found search_vector data:', data[0]);
    } else {
      console.log('No search_vector data found (or column is null for all rows)');
    }
  }
}

inspectSearchVector();
