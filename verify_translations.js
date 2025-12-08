import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://supabase.dosmundos.pe';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyTranslations() {
  const episodeSlug = '2024-09-04';
  console.log(`Verifying translations for episode: ${episodeSlug}`);

  const { data, error } = await supabase
    .from('timecodes')
    .select('lang, title, time')
    .eq('episode_slug', episodeSlug)
    .order('time', { ascending: true });

  if (error) {
    console.error('Error fetching timecodes:', error);
    return;
  }

  const counts = {};
  data.forEach(row => {
    counts[row.lang] = (counts[row.lang] || 0) + 1;
  });

  console.log('Counts per language:', counts);

  const languages = ['es', 'en', 'fr', 'de', 'pl'];
  languages.forEach(lang => {
    const sample = data.find(row => row.lang === lang);
    if (sample) {
      console.log(`Sample ${lang}: [${sample.time}s] ${sample.title}`);
    } else {
      console.log(`No questions found for ${lang}`);
    }
  });
}

verifyTranslations();
