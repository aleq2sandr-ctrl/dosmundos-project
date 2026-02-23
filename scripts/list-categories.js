import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listCategories() {
  const { data, error } = await supabase
    .from('articles')
    .select('categories');

  if (error) {
    console.error('Error:', error);
    return;
  }

  const allCats = new Set();
  data.forEach(row => {
    if (Array.isArray(row.categories)) {
      row.categories.forEach(c => allCats.add(c));
    } else if (typeof row.categories === 'string') {
      allCats.add(row.categories);
    }
  });

  console.log('Unique Categories:', Array.from(allCats));
}

listCategories();
