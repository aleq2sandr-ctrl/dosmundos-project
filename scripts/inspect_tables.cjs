require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectTable(tableName) {
  console.log(`Inspecting ${tableName}...`);
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
  } else {
    if (data.length > 0) {
        console.log('Sample row keys:', Object.keys(data[0]));
    } else {
        console.log('Table is empty, cannot infer keys easily via select.');
    }
  }
}

async function main() {
  await inspectTable('articles_v2');
  await inspectTable('article_translations');
  await inspectTable('article_categories');
  await inspectTable('categories');
}

main();
