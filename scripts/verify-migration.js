import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyMigration() {
  console.log('Verifying migration...');

  // Check Categories
  const { count: catCount } = await supabase.from('categories').select('*', { count: 'exact', head: true });
  console.log(`Categories count: ${catCount}`);

  // Check Articles
  const { count: artCount } = await supabase.from('articles_v2').select('*', { count: 'exact', head: true });
  console.log(`Articles count: ${artCount}`);

  // Check Translations
  const { count: transCount } = await supabase.from('article_translations').select('*', { count: 'exact', head: true });
  console.log(`Article Translations count: ${transCount} (Expected: ${artCount * 6})`);

  // Check Translations per language
  const languages = ['ru', 'en', 'es', 'de', 'fr', 'pl'];
  for (const lang of languages) {
    const { count } = await supabase
      .from('article_translations')
      .select('*', { count: 'exact', head: true })
      .eq('language_code', lang);
    console.log(`Translations for ${lang}: ${count}`);
  }

  // Check Category Links
  const { count: linkCount } = await supabase.from('article_categories').select('*', { count: 'exact', head: true });
  console.log(`Article Category Links count: ${linkCount}`);

  // Sample check
  const { data: sample } = await supabase
    .from('articles_v2')
    .select(`
      slug,
      article_translations(title, language_code),
      article_categories(
        categories(
          slug,
          category_translations(name, language_code)
        )
      )
    `)
    .limit(1)
    .single();

  console.log('Sample Article:', JSON.stringify(sample, null, 2));
}

verifyMigration();
